"""Is the rule's NO-GO an artifact of GPT sentiment mislabeling? Two checks:

A. Threshold sweep — does ANY reaction band / pre cap / novelty floor give a
   stable directional edge with GPT sentiment+category?
B. GPT-FREE direction — define the issue's "positive reaction" purely from the
   same-day PRICE move abret_0d (no GPT at all). If drift is absent here too,
   GPT labeling is exonerated as the cause.

Edge bar: pos5d ≥ 0.55, worst walk-forward quartile ≥ 0.52, median5d > 0, n ≥ 150.
Run:  python ml/backtest_robust.py
"""

from __future__ import annotations

from datetime import datetime, timezone

import numpy as np

from backtest_rule import cluster_reps, novelty

CATS = {"demand", "earnings", "guidance", "order", "product", "partnership"}


def main() -> None:
    d = np.load("data/events.npz", allow_pickle=True)
    p = np.load("data/price_features.npz", allow_pickle=True)
    g = np.load("data/gpt_sentcat.npz", allow_pickle=True)
    t0, stock, X = d["t0"], d["stock"].astype(str), d["X"].astype(np.float32)
    ev_ord = np.array([datetime.fromtimestamp(t, timezone.utc).date().toordinal() for t in t0])
    sent, cat = g["sentiment"].astype(str), g["category"].astype(str)
    a0, pr, fa5 = p["abret_0d"], p["pre_abret_20d"], p["future_abret_5d"]

    reps = cluster_reps(stock, ev_ord, t0)
    nov = np.zeros(len(stock)); nov[reps] = novelty(reps, stock, ev_ord, X)
    R = reps
    posR = sent[R] == "positive"
    catR = np.array([c in CATS for c in cat[R]])
    a0R, prR, fa5R, novR, tR = a0[R], pr[R], fa5[R], nov[R], t0[R]
    quarts = np.array_split(np.argsort(tR), 4)
    qmask = [np.isin(np.arange(len(R)), q) for q in quarts]

    def ev(mask):
        m = mask & np.isfinite(fa5R)
        n = int(m.sum())
        if n < 100:
            return n, np.nan, np.nan, np.nan
        pooled = float((fa5R[m] > 0).mean())
        worst = min(float((fa5R[m & q] > 0).mean()) for q in qmask if (m & q).sum() >= 20)
        return n, pooled, worst, float(np.median(fa5R[m]) * 100)

    def row(tag, mask):
        n, pooled, worst, med = ev(mask)
        ok = np.isfinite(pooled) and n >= 150 and pooled >= 0.55 and worst >= 0.52 and med > 0
        ps = "" if not np.isfinite(pooled) else f"{pooled:.3f}"
        ws = "" if not np.isfinite(worst) else f"{worst:.3f}"
        ms = "" if not np.isfinite(med) else f"{med:+.2f}%"
        print(f"  {tag:36s} n={n:5d} pos5d={ps:>6} worstQ={ws:>6} med5d={ms:>7}  {'PASS' if ok else ''}")
        return ok

    print("A. GPT sentiment+category, threshold sweep")
    passes = 0
    base = posR & catR
    for tag, (lo, hi) in [("weak[-.5,1.5]%", (-0.005, 0.015)), ("weak[-1,1]%", (-0.01, 0.01)),
                          ("flat[-.3,.3]%", (-0.003, 0.003)), ("strong[2,10]%", (0.02, 0.10)),
                          ("neg0[-4,-.5]%", (-0.04, -0.005))]:
        for preMax in (0.12, 0.30):
            for novMin in (0.0, 0.5):
                passes += row(f"{tag} pre<{preMax} nov≥{novMin}",
                              base & (a0R >= lo) & (a0R <= hi) & (prR < preMax) & (novR >= novMin))

    print("\nB. GPT-FREE — 'positive' defined by same-day price move abret_0d (no GPT)")
    # weak positive price reaction (small positive day-0) → does it drift up?
    row("pricePos weak[0,1.5]% novel notHot", (a0R > 0) & (a0R <= 0.015) & (prR < 0.12) & (novR >= 0.5))
    row("pricePos weak[0,1.5]% (all)", (a0R > 0) & (a0R <= 0.015))
    row("priceStrong[2,10]% (momentum)", (a0R >= 0.02) & (a0R <= 0.10))
    row("priceNeg day0[-4,-.5]% (reversal)", (a0R >= -0.04) & (a0R <= -0.005))
    row("ALL clusters (base rate)", np.ones(len(R), bool))

    print(f"\n{passes} GPT-based configs passed.")
    print("If both A and B show no PASS, the null is robust AND independent of GPT labels.")


if __name__ == "__main__":
    main()
