"""POSITIVE_NEW_WEAK_REACTION — walk-forward backtest (the go/no-go gate).

Hypothesis: a positive, novel issue whose SAME-DAY sector-relative reaction was
weak (the market underreacted) drifts to positive excess return over 3–5 days.

Pipeline:
  1. event_cluster: collapse same (stock, calendar day) into one sample — multiple
     outlets covering the same event share an identical future price path, so
     counting them separately fakes significance.
  2. novelty: 1 − max cosine similarity to the same stock's issues in the prior
     10 days (high = fresh, not recycled).
  3. rule conditions → subgroup; compare to baselines (all / positive /
     positive+category) so we see whether the WEAK-REACTION filter adds anything.
  4. walk-forward: report per time-period, not pooled only — a real edge is
     stable across periods, not one lucky window.

Labels are sector-relative excess returns from real prices (price_features.npz),
never GPT. Run:  python ml/backtest_rule.py
"""

from __future__ import annotations

from datetime import datetime, timezone

import numpy as np

CATS = {"demand", "earnings", "guidance", "order", "product", "partnership"}
# Rule thresholds (fixed a priori — not fitted to the data).
ABRET0_LO, ABRET0_HI = -0.005, 0.015   # weak same-day reaction band
PRE20_MAX = 0.12                        # not already overheated
NOVELTY_MIN = 0.50                      # fresh vs recycled


def load():
    d = np.load("data/events.npz", allow_pickle=True)
    p = np.load("data/price_features.npz", allow_pickle=True)
    g = np.load("data/gpt_sentcat.npz", allow_pickle=True)
    return d, p, g


def cluster_reps(stock, ev_ord, t0):
    """One representative index per (stock, day) — the earliest by t0."""
    best: dict[tuple, int] = {}
    for i in range(len(stock)):
        k = (stock[i], int(ev_ord[i]))
        if k not in best or t0[i] < t0[best[k]]:
            best[k] = i
    return np.array(sorted(best.values()), dtype=np.int64)


def novelty(reps, stock, ev_ord, X):
    """1 − max cosine sim to same-stock reps within the prior 10 days."""
    Xn = X / (np.linalg.norm(X, axis=1, keepdims=True) + 1e-9)
    out = np.ones(len(reps), dtype=np.float64)
    by_stock: dict[str, list[int]] = {}
    for r in reps:
        by_stock.setdefault(stock[r], []).append(r)
    pos_in_reps = {r: i for i, r in enumerate(reps)}
    for s, idxs in by_stock.items():
        idxs.sort(key=lambda r: ev_ord[r])
        for a in range(len(idxs)):
            r = idxs[a]
            d0 = ev_ord[r]
            sims = [
                float(Xn[r] @ Xn[idxs[b]])
                for b in range(a)
                if 0 <= d0 - ev_ord[idxs[b]] <= 10
            ]
            if sims:
                out[pos_in_reps[r]] = 1.0 - max(sims)
    return out


def stats(mask, fa3, fa5, label):
    n = int(mask.sum())
    if n == 0:
        print(f"  {label:28s} n=0")
        return
    a3, a5 = fa3[mask], fa5[mask]
    a3, a5 = a3[np.isfinite(a3)], a5[np.isfinite(a5)]
    pr3 = float((a3 > 0).mean())
    pr5 = float((a5 > 0).mean())
    se5 = (pr5 * (1 - pr5) / max(len(a5), 1)) ** 0.5
    print(
        f"  {label:28s} n={n:5d}  med3d={np.median(a3)*100:+.2f}%  med5d={np.median(a5)*100:+.2f}%  "
        f"mean5d={a5.mean()*100:+.2f}%  pos3d={pr3:.3f}  pos5d={pr5:.3f}±{se5:.3f}"
    )


def main() -> None:
    d, p, g = load()
    t0 = d["t0"]
    stock = d["stock"].astype(str)
    X = d["X"].astype(np.float32)
    ev_ord = np.array([datetime.fromtimestamp(t, timezone.utc).date().toordinal() for t in t0])

    sent = g["sentiment"].astype(str)
    cat = g["category"].astype(str)
    abret0 = p["abret_0d"]
    pre20 = p["pre_abret_20d"]
    fa3, fa5 = p["future_abret_3d"], p["future_abret_5d"]

    reps = cluster_reps(stock, ev_ord, t0)
    print(f"events {len(stock)} → clusters {len(reps)} (same stock+day merged)")
    nov = np.zeros(len(stock))
    nov[reps] = novelty(reps, stock, ev_ord, X)

    R = reps  # work in cluster space
    is_pos = sent[R] == "positive"
    in_cat = np.array([c in CATS for c in cat[R]])
    weak = (abret0[R] >= ABRET0_LO) & (abret0[R] <= ABRET0_HI)
    not_hot = pre20[R] < PRE20_MAX
    fresh = nov[R] >= NOVELTY_MIN
    rule = is_pos & in_cat & weak & not_hot & fresh
    fa3R, fa5R = fa3[R], fa5[R]

    print("\n── baselines vs rule (cluster space) ──")
    stats(np.ones(len(R), bool), fa3R, fa5R, "ALL clusters")
    stats(is_pos, fa3R, fa5R, "positive")
    stats(is_pos & in_cat, fa3R, fa5R, "positive + category")
    stats(is_pos & in_cat & weak & not_hot, fa3R, fa5R, "pos+cat+weak+notHot")
    stats(rule, fa3R, fa5R, "RULE (+novel)")

    print("\n── RULE walk-forward (time quartiles by t0) ──")
    order = np.argsort(t0[R])
    qs = np.array_split(order, 4)
    for qi, idx in enumerate(qs):
        sub = np.zeros(len(R), bool)
        sub[idx] = True
        d0 = datetime.fromtimestamp(t0[R][idx].min(), timezone.utc).date()
        d1 = datetime.fromtimestamp(t0[R][idx].max(), timezone.utc).date()
        stats(sub & rule, fa3R, fa5R, f"Q{qi+1} {d0}~{d1}")

    print(
        "\nGATE: RULE should beat 'positive+category' pos5d/median AND stay positive in\n"
        "every walk-forward quartile. If it only wins pooled or in one window → no edge."
    )


if __name__ == "__main__":
    main()
