"""Offline shadow-evaluation monitor for the two challenger hypotheses that
could justify letting a statistical layer override GPT's color decision. Ships
nothing — production stays GPT-only. See ml/SHADOW_EVAL.md for the pre-registered
targets, baselines, segmentation, and promotion gate.

  H1 — within-stock magnitude (darkness): does issue CONTENT rank which issues
       move a given stock more than that stock's own average? Target = |abret_h|
       standardized WITHIN each stock (train-only μ/σ), so the trivial cross-stock
       scale ("small names move more") is removed. Metric = Spearman ρ on val.
  H2 — direction: does content / sentiment predict the SIGN of the excess return?
       Metric = dir_hit on val, vs the majority-class baseline and 0.50.

Two-stage decision (hardened to avoid single-run false alarms):
  1. SCREENING — every cell's metric is a 3-seed ENSEMBLE (kills the boundary
     flap from MLP/platform numerical noise) with a bootstrap 95% CI. A cell
     "screens" if CI-low > gate. p-values (one-sided vs gate) get BH-FDR q=0.10
     across the whole grid.
  2. WALK-FORWARD GATE — any (hyp,feat,seg) that screens at ≥1 horizon is
     re-tested with 3 expanding-window, lookahead-safe folds. PROMOTE only if it
     screens (CI-low>gate) AND survives FDR AND survives WF (CI-low>gate in every
     fold) at ≥2 horizons. Otherwise NO-GO → production stays GPT-only.

Metrics are computed for ALL and per `market` (US now; KR = 0 → 'awaiting' — the
Korean-forward door we actually want to watch). One JSON record per run is
appended to ml/shadow_log.jsonl as the accumulating audit trail.

Run:  python ml/shadow_eval.py
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import numpy as np
import torch

from common import DATA_DIR, HORIZONS
from diagnose_magnitude import spearman, train_one
from train import build_sector_vocab, onehot, time_split

LOG_PATH = DATA_DIR.parent / "shadow_log.jsonl"
SEG_MIN = 200            # min n to evaluate a market segment
EARN_MIN = 30            # min n for the earnings subset
RHO_GATE, DIR_GATE = 0.05, 0.53  # pre-registered CI-lower-bound promotion gates
SEEDS = (0, 1, 2)        # ensemble seeds — screening stability
N_BOOT = 1000
WF_FOLDS = 3             # expanding-window folds for the walk-forward gate
FDR_Q = 0.10
MIN_PROMOTE_HORIZONS = 2  # PROMOTE needs the cell to clear the gate at ≥2 horizons


def load_aligned() -> dict:
    """events.npz (required) + gpt_sentcat.npz (optional — category/sentiment).

    If gpt_sentcat is absent (no OpenAI key in CI), cat/sent are None and the
    gpt-derived rows (H1-cat, H2-sentiment/earnings) are skipped; H1-emb and
    H2-model still run."""
    d = np.load(DATA_DIR / "events.npz", allow_pickle=True)
    out: dict = dict(
        X=d["X"].astype(np.float32), y=d["y"].astype(np.float32), t0=d["t0"],
        sector=d["sector"].astype(str), market=d["market"].astype(str),
        stock=d["stock"].astype(str), cat=None, sent=None,
    )
    n = len(out["X"])
    sc_path = DATA_DIR / "gpt_sentcat.npz"
    if sc_path.exists():
        sc = np.load(sc_path, allow_pickle=True)
        if len(sc["category"]) == n:
            out["cat"], out["sent"] = sc["category"].astype(str), sc["sentiment"].astype(str)
    for k, v in out.items():
        assert v is None or len(v) == n, f"{k} not index-aligned"
    return out


def within_stock_z(yabs: np.ndarray, stock: np.ndarray, trh: np.ndarray) -> np.ndarray:
    """Standardize |abret| within each stock using TRAIN-only μ/σ (no leakage)."""
    trm = np.zeros(len(yabs), bool)
    trm[trh] = True
    gmu, gsd = yabs[trm].mean(), (yabs[trm].std() or 1.0)
    z = np.empty_like(yabs)
    for s in np.unique(stock):
        sel = stock == s
        seltr = sel & trm
        if seltr.sum() >= 2:
            mu, sd = yabs[seltr].mean(), yabs[seltr].std()
            sd = sd if sd > 1e-9 else gsd
        else:
            mu, sd = gmu, gsd
        z[sel] = (yabs[sel] - mu) / sd
    return z


def dir_hit(pred_sign: np.ndarray, real_sign: np.ndarray) -> float:
    return float((pred_sign == real_sign).mean())


def ensemble_pred(feats: np.ndarray, target: np.ndarray, trh: np.ndarray, vah: np.ndarray) -> np.ndarray:
    """Mean val prediction over SEEDS — averaging removes the per-seed/platform
    training noise that makes a single MLP flap across the gate at the boundary."""
    preds = []
    for s in SEEDS:
        torch.manual_seed(s)
        np.random.seed(s)
        preds.append(train_one(feats[trh], target[trh], feats[vah], target[vah], feats.shape[1], log=False))
    return np.mean(preds, axis=0)


def boot(fn, gate: float, a: np.ndarray, b: np.ndarray, seed: int = 0) -> tuple[float, float, float, float]:
    """Bootstrap point/CI of a paired stat + one-sided p-value P(stat ≤ gate)."""
    if len(a) == 0:
        return float("nan"), float("nan"), float("nan"), 1.0
    rng = np.random.default_rng(seed)
    samp = np.array([fn(a[idx], b[idx]) for idx in (rng.integers(0, len(a), len(a)) for _ in range(N_BOOT))])
    lo, hi = np.percentile(samp, [2.5, 97.5])
    return float(fn(a, b)), float(lo), float(hi), float((samp <= gate).mean())


def wf_folds(t0: np.ndarray, n: int = WF_FOLDS, val_frac: float = 1 / 6) -> list[tuple[np.ndarray, np.ndarray]]:
    """Expanding-window, lookahead-safe folds (train = everything before val)."""
    order = np.argsort(t0, kind="stable")
    N = len(order)
    folds = []
    for k in range(n):
        vs = 1.0 - (n - k) * val_frac
        folds.append((order[: int(N * vs)], order[int(N * vs): int(N * (vs + val_frac))]))
    return folds


def bh_fdr(pvals: list[float], q: float = FDR_Q) -> set[int]:
    """Benjamini–Hochberg: indices whose null is rejected at FDR q."""
    m = len(pvals)
    if m == 0:
        return set()
    order = sorted(range(m), key=lambda i: pvals[i])
    kmax = 0
    for rank, i in enumerate(order, start=1):
        if pvals[i] <= rank / m * q:
            kmax = rank
    return {order[r] for r in range(kmax)}


def score_seg(c: dict, smask: np.ndarray) -> dict | None:
    """Score a trained cell on one segment (slice — no retraining)."""
    keep = smask[c["vah"]] & c["valid"]
    if int(keep.sum()) < c["need"]:
        return None
    a, b = c["a"][keep], c["b"][keep]
    fn = spearman if c["metric"] == "rho" else dir_hit
    point, lo, hi, p = boot(fn, c["gate"], a, b)
    out = {c["metric"]: round(point, 4), "ci": [round(lo, 4), round(hi, 4)],
           "p": round(p, 4), "n": int(len(b)), "screen": bool(lo > c["gate"])}
    if c["metric"] == "dir_hit":
        out["majority"] = round(float(max((b > 0).mean(), (b < 0).mean())), 4)
        out["screen"] = bool(lo > c["gate"] and point > out["majority"])
    return out


def main() -> None:
    D = load_aligned()
    X, y, t0, stock, market, sector = (D["X"], D["y"], D["t0"], D["stock"], D["market"], D["sector"])
    cat, sent = D["cat"], D["sent"]
    cats = sorted(set(cat.tolist())) if cat is not None else []

    # Feature builders re-fit per fold's TRAIN rows (no leakage across folds).
    def emb_norm(trh: np.ndarray) -> np.ndarray:
        mean = X[trh].mean(0)
        std = np.where(X[trh].std(0) < 1e-6, 1.0, X[trh].std(0)).astype(np.float32)
        return ((X - mean) / std).astype(np.float32)

    def h1_features(tag: str, trh: np.ndarray) -> np.ndarray:
        if tag == "emb":
            return emb_norm(trh)
        return np.stack([(cat == c).astype(np.float32) for c in cats], axis=1)  # category one-hot

    def h2_features(trh: np.ndarray) -> np.ndarray:
        vocab = build_sector_vocab(sector[trh])
        return np.concatenate([emb_norm(trh), onehot(sector, vocab)], axis=1).astype(np.float32)

    def train_cell(hyp: str, tag: str, hi: int, trf: np.ndarray, vaf: np.ndarray) -> dict | None:
        """Train one (hyp, feat/rule, horizon) on a train/val split. Returns the
        val-row arrays so every segment can be scored by slicing (trained once)."""
        m = np.isfinite(y[:, hi])
        trh, vah = trf[m[trf]], vaf[m[vaf]]
        if hyp == "H1":
            z = within_stock_z(np.abs(y[:, hi]).astype(np.float32), stock, trh)
            pred = ensemble_pred(h1_features(tag, trh), z, trh, vah)
            return dict(a=pred, b=z[vah], vah=vah, valid=np.ones(len(vah), bool),
                        metric="rho", gate=RHO_GATE, need=SEG_MIN)
        if tag == "model":
            pred = ensemble_pred(h2_features(trh), y[:, hi].astype(np.float32), trh, vah)
            rs = np.sign(y[vah, hi])
            return dict(a=np.sign(pred), b=rs, vah=vah, valid=(rs != 0),
                        metric="dir_hit", gate=DIR_GATE, need=SEG_MIN)
        # rule-based direction: sentiment / earnings (no training)
        if sent is None or (tag == "earnings" and cat is None):
            return None
        sm, rs = sent[vah], np.sign(y[vah, hi])
        valid = np.isin(sm, ["positive", "negative"]) & (rs != 0)
        if tag == "earnings":
            valid = valid & (cat[vah] == "earnings")
        return dict(a=np.where(sm == "positive", 1.0, -1.0), b=rs, vah=vah, valid=valid,
                    metric="dir_hit", gate=DIR_GATE, need=(EARN_MIN if tag == "earnings" else SEG_MIN))

    tr, va = time_split(t0, 0.2)
    h1_tags = ["emb"] + (["cat"] if cat is not None else [])
    h2_tags = ["model"] + (["sentiment", "earnings"] if sent is not None else [])
    cells = [("H1", t) for t in h1_tags] + [("H2", t) for t in h2_tags]

    def seg_masks() -> dict[str, np.ndarray]:
        segs = {"ALL": np.ones(len(X), bool)}
        for mk in sorted(set(market.tolist())):
            if (market == mk).sum() >= SEG_MIN:
                segs[mk] = market == mk
        return segs

    segs = seg_masks()
    mk_counts = dict(zip(*np.unique(market, return_counts=True)))
    print(f"events {len(X)} | train {len(tr)} val {len(va)} | markets {mk_counts}")
    print(f"snapshot t0: {datetime.fromtimestamp(t0.min(), timezone.utc).date()} → "
          f"{datetime.fromtimestamp(t0.max(), timezone.utc).date()} | seeds {SEEDS}\n")

    # ── Stage 1: screening (train once per cell·horizon, score every segment) ──
    screen: dict = {}      # screen[f"{hyp}:{tag}"][seg][f"{d}d"] = stat dict
    pkeys, pvals = [], []  # for BH-FDR across the grid
    print("SCREENING  (3-seed ensemble; gate H1 ρ>%.2f / H2 dir_hit>%.2f, both CI-low)" % (RHO_GATE, DIR_GATE))
    print(f"{'cell':>16} {'seg':>4} {'hor':>4} {'metric':>8} {'95% CI':>16} {'screen':>7}")
    for hyp, tag in cells:
        for hi, days in enumerate(HORIZONS):
            c = train_cell(hyp, tag, hi, tr, va)
            if c is None:
                continue
            for seg, smask in segs.items():
                st = score_seg(c, smask)
                if st is None:
                    continue
                screen.setdefault(f"{hyp}:{tag}", {}).setdefault(seg, {})[f"{days}d"] = st
                pkeys.append((f"{hyp}:{tag}", seg, f"{days}d"))
                pvals.append(st["p"])
                mval = st.get("rho", st.get("dir_hit"))
                print(f"{hyp+':'+tag:>16} {seg:>4} {days:>3}d {mval:>8.3f} "
                      f"[{st['ci'][0]:>6.3f},{st['ci'][1]:>6.3f}] {'PASS' if st['screen'] else '  -':>7}")

    fdr_pass = bh_fdr(pvals)
    for j, (ck, seg, hk) in enumerate(pkeys):
        screen[ck][seg][hk]["fdr"] = j in fdr_pass

    # Candidates worth the walk-forward gate: screen-pass at ≥1 horizon.
    candidates = sorted({(ck, seg) for (ck, seg, hk) in pkeys if screen[ck][seg][hk]["screen"]})

    # ── Stage 2: walk-forward gate on candidates ──────────────────────────────
    wf: dict = {}
    if candidates:
        print(f"\nWALK-FORWARD GATE  ({WF_FOLDS} expanding folds; survive = CI-low > gate every fold)")
        folds = wf_folds(t0)
        for ck, seg in candidates:
            hyp, tag = ck.split(":")
            smask = segs[seg]
            gate = RHO_GATE if hyp == "H1" else DIR_GATE
            for hi, days in enumerate(HORIZONS):
                fold_lo = []
                for trf, vaf in folds:
                    c = train_cell(hyp, tag, hi, trf, vaf)
                    st = score_seg(c, smask) if c is not None else None
                    fold_lo.append(None if st is None else st["ci"][0])
                survive = all(v is not None and v > gate for v in fold_lo)
                wf.setdefault(ck, {}).setdefault(seg, {})[f"{days}d"] = {
                    "fold_ci_low": [None if v is None else round(v, 4) for v in fold_lo],
                    "survive": bool(survive)}
                print(f"{ck:>16} {seg:>4} {days:>3}d  folds CI-low="
                      f"{[None if v is None else round(v, 3) for v in fold_lo]}  "
                      f"{'SURVIVE' if survive else 'fail'}")

    # ── Promotion: screen + FDR + WF survive at ≥2 horizons ───────────────────
    promoted = []
    for ck, seg in candidates:
        good = [hk for hk in screen[ck][seg]
                if screen[ck][seg][hk]["screen"] and screen[ck][seg][hk].get("fdr")
                and wf.get(ck, {}).get(seg, {}).get(hk, {}).get("survive")]
        if len(good) >= MIN_PROMOTE_HORIZONS:
            promoted.append({"cell": ck, "seg": seg, "horizons": sorted(good)})

    kr = int(mk_counts.get("KR", 0))
    print(f"\nKR segment: {kr} events — "
          + ("evaluated above." if kr >= SEG_MIN else "awaiting data (the forward-Korean door)."))

    rec = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "n_total": int(len(X)), "markets": {k: int(v) for k, v in mk_counts.items()},
        "labeled_per_horizon": {h: int(np.isfinite(y[:, i]).sum()) for i, h in enumerate(HORIZONS)},
        "config": {"seeds": list(SEEDS), "gates": {"rho": RHO_GATE, "dir_hit": DIR_GATE},
                   "wf_folds": WF_FOLDS, "fdr_q": FDR_Q, "min_promote_horizons": MIN_PROMOTE_HORIZONS},
        "screening": screen, "walkforward": wf, "promoted": promoted,
        "verdict": "PROMOTE" if promoted else "NO-GO",
    }
    with LOG_PATH.open("a") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    if promoted:
        print(f"\nverdict: PROMOTE — {promoted}")
    else:
        print(f"\nverdict: NO-GO — production stays GPT-only "
              f"(no cell cleared screen+FDR+walk-forward at ≥{MIN_PROMOTE_HORIZONS} horizons)")
    print(f"logged → {LOG_PATH}")


if __name__ == "__main__":
    main()
