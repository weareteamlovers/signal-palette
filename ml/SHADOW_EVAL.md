# Shadow evaluation — pre-registration

**Posture.** Production ships **GPT-only** color (direction *and* darkness from
gpt-4o-mini). This harness ships **nothing** to users. It is an *offline*
monitor that, as the event store grows, repeatedly re-tests two hypotheses that
would — and only would — justify letting a statistical layer override GPT. We
pre-register the targets, metrics, baselines, segmentation, and the exact
promotion thresholds **here, before peeking repeatedly**, so the answer can't be
fished out by re-running until a fold looks good.

This is a champion/challenger setup: GPT is champion, the statistical layer is a
challenger that is **only promoted if it clears the pre-registered gate
out-of-sample**. The honest default — given everything below — is that it never
clears it and we keep GPT. That is a result, not a failure.

## Why these two hypotheses

The 7-level color factorizes into **direction** (green↔red) and **darkness +
impact period** (move size/duration). Prior diagnostics on this data found:

- **Direction** is ~unpredictable: `dir_hit ≈ 0.50` (signed quantile MLP),
  drift-rule backtest `pos5d 0.494`. Efficient-market territory.
- **Magnitude** is predictable but the signal is **cross-stock** ("small thematic
  names move more than mega-caps", Spearman ρ≈0.33) — which is *trivial* and adds
  nothing as a per-issue feature. The non-trivial, unanswered question is
  **within-stock**: does *this* issue move the stock more than that stock's own
  average issue? (`diagnose_within_stock` ρ≈0.02 raw embedding, ρ≈0.10 earnings
  keyword @1d — weak, fades by 5d.)

So the two challengers worth monitoring are exactly:

- **H1 — within-stock magnitude (darkness):** does issue *content* rank which
  issues move a given stock more than its own baseline? (cross-stock scale
  removed by standardizing the target within each stock.)
- **H2 — direction:** does issue content / sentiment predict the *sign* of the
  next-days sector-excess return?

## Data snapshot (2026-06-10)

- `event_log ⨝ event_outcome`: **10,111 labeled events, all `market=US`.**
  **`KR = 0`.**
- Labeled at all of 1/3/5d. `t0` 2010-03-04 → 2026-05-31 (mass is the last ~12
  months from the Finnhub backfill; the 2010 tail is negligible).
- All current events are **backfill** = GPT-summarized English headlines with
  `signal`/`intensity` = null. The forward pipeline writes Korean issues *with*
  real `signal`/`intensity` labels — that is the one untested door (see §Segments).

**Consequence:** the Korean / forward hypothesis **cannot be evaluated yet** — there
is no KR data. The harness reports the US baseline now and the KR segment as
`awaiting data` until it accrues. This is the point of the monitor.

## Targets, features, metrics

Index-aligned arrays (N=10,111): `events.npz` (embedding, abret 1/3/5d, t0,
sector, market, stock, text) + **optionally** `gpt_sentcat.npz` (category,
sentiment — only if the OpenAI classify step ran; absent → the gpt-derived rows
below are skipped, H1-emb and H2-model still run). Lookahead-safe time split: oldest 80% =
train, newest 20% = val (`train.time_split`). All metrics on **val**, with a
**1000-sample bootstrap 95% CI** over the val window (sampling uncertainty only —
see promotion gate for the multi-period requirement).

### H1 — within-stock magnitude

- **Target:** `|abret_h|` **standardized within each stock** using that stock's
  *train-only* mean/std: `z = (|abret| − μ_stock) / σ_stock`. Standardizing (not
  just demeaning, as the earlier diagnostic did) strips the cross-stock scale so
  the pooled rank can't be gamed by "high-vol stock = big residual".
- **Features:** `emb` (1536-d issue embedding) and, separately, `cat` (12-way
  category one-hot, optional). The standardized target is structurally free of
  the cross-stock scale, so a per-stock volatility feature can't predict it by
  construction — no separate control row is computed.
- **Metric:** Spearman ρ(pred, z) on val + CI. **Baseline ρ = 0** (no within-stock
  signal).

### H2 — direction

- **Target:** `sign(abret_h)` (zeros dropped).
- **H2-model:** MLP on `emb + sector` → sign of predicted signed return. Metric =
  `dir_hit` (val) + CI. Baselines: majority-class rate and 0.50.
- **H2-sentiment:** rule `positive→+1, negative→−1` (neutral dropped). Directly
  tests the "good news → up next day" intuition on **excess** returns. Metric =
  `dir_hit` + CI + n.
- **H2-earnings:** H2-sentiment restricted to `category=earnings` (the clearest
  catalyst).

## Segments

Every metric is computed for `ALL` and **per `market`**, gated at n ≥ 200:

- `US` — present (≈all data). Establishes the baseline.
- `KR` — **the door.** Forward-only, Korean text, real `signal`/`intensity`. `0`
  now → reported `awaiting data`. When it crosses the gate's min-n it gets its own
  metric, never mixed with US.

Segments are **never pooled across language/source** for a promotion decision.

## Validation & promotion gate (two stages, both run every invocation)

**Stage 1 — screening.** Each cell's metric is a **3-seed ensemble** (averaging
the val predictions removes the per-seed/platform MLP noise that flips a single
run across the gate at the boundary) with a 1000-sample bootstrap 95% CI. A cell
**screens** if its CI lower bound clears the gate — H1: ρ > **0.05**; H2:
`dir_hit` > **0.53** *and* > majority. One-sided p-values `P(stat ≤ gate)` get
**Benjamini–Hochberg FDR q=0.10** across the whole grid (2 hyps × 3 horizons ×
feature sets × segments).

**Stage 2 — walk-forward.** Any `(hyp, feat, seg)` that screens at ≥1 horizon is
re-tested with **3 expanding-window, lookahead-safe folds** (train = everything
before each val window), each **re-standardizing features and re-deriving the
within-stock μ/σ on its own train** (no leakage). It **survives** a horizon if
the fold CI-low clears the gate in **every** fold.

**PROMOTE** a `(hyp, feat, seg)` iff it screens **AND** survives FDR **AND**
survives walk-forward — at **≥2 horizons** (a 1d-only effect that fades by 3/5d
is *not* promotable). Even when H1 promotes it only sets **darkness**; direction
always comes from the issue `signal` (H1 never sets green/red). Anything short of
this → **NO-GO**, production stays GPT-only.

Small segments are reported but won't promote: with few events the bootstrap CI
is too wide to clear the gate, so the ~1,500-event floor is enforced
*implicitly* by the CI rather than as a hard cutoff. Re-evaluate as data grows.

## Output / log

`python ml/shadow_eval.py` prints the screening + walk-forward tables and
**appends one JSON record** to `ml/shadow_log.jsonl` (timestamp, data snapshot
counts, config/gates, per-cell `screening` metric+CI+p+fdr, `walkforward` fold
CI-lows + survive, `promoted` list, and the `verdict`). **Automation:**
`.github/workflows/shadow-eval.yml` runs the whole
pipeline (pull → classify → eval) **monthly on GitHub Actions** — cloud, so it is
independent of any Codespace being stopped/deleted — and commits the new log line
back. (Data accrual itself never depends on Codespace either: it's the Vercel
cron → Supabase production path.) Run locally any time with `python ml/shadow_eval.py`.
The log accumulates so the time-series can be inspected monthly — the
question is whether the **KR** rows ever start clearing the gate as Korean
forward data (with real signal/intensity) piles up. The `.jsonl` holds derived
metrics only (no data, no secrets) and is safe to commit as the audit trail.

## Honest prior

H1 and H2 have each come back ~null on the US backfill (ρ 0.02–0.10, dir_hit
0.50). This monitor is **cheap insurance**, not an expected win: efficient
markets + those results say it most likely keeps reporting NO-GO. Its value is
the discipline — shipping only validated signal while keeping an automatic,
pre-registered re-test for the one case (Korean forward data with real
signal/intensity labels) we genuinely haven't measured.
