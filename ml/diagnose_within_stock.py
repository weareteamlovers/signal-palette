"""DECISIVE test for the per-issue prediction color: within the SAME stock, does
the issue TEXT rank which issues cause bigger moves?

At inference we always know the stock (엔비디아 issue → we know it's 엔비디아). The
question for per-issue color is therefore NOT "is 엔비디아 volatile" (we know that)
but "does THIS 엔비디아 issue move it more than the average 엔비디아 issue?". That is
the within-stock residual of |abret|.

Method: target = |abret_h| − (that stock's train-mean |abret_h|). Features =
issue embedding only (stock already controlled for). Spearman(pred, residual) on
val. If ρ ≈ 0 → the issue text carries no per-issue magnitude signal → the
"darkness" can only be a per-stock volatility constant, not per-issue. If ρ > 0
→ the issue content genuinely differentiates impact → per-issue color is real.

Run:  python ml/diagnose_within_stock.py
"""

from __future__ import annotations

import numpy as np

from common import HORIZONS
from diagnose_magnitude import spearman, train_one
from train import load_dataset, time_split


def main() -> None:
    d = np.load("data/events.npz", allow_pickle=True)
    X, y, t0 = d["X"].astype(np.float32), d["y"].astype(np.float32), d["t0"]
    stock = d["stock"].astype(str)
    keep = np.isfinite(y).any(axis=1)
    X, y, t0, stock = X[keep], y[keep], t0[keep], stock[keep]
    tr, va = time_split(t0, 0.2)

    # Embedding-only features (stock is controlled for by demeaning the target).
    mean_e = X[tr].mean(0)
    std_e = np.where(X[tr].std(0) < 1e-6, 1.0, X[tr].std(0)).astype(np.float32)
    feats = ((X - mean_e) / std_e).astype(np.float32)

    uniq = sorted(set(stock.tolist()))
    print(f"events {len(X)} | train {len(tr)} val {len(va)} | stocks {len(uniq)}")
    print("\nWITHIN-STOCK magnitude: does the issue TEXT beat 'this stock's average move'?")
    print(f"{'horizon':>8} {'ρ_within':>9} {'verdict'}")
    for hi, days in enumerate(HORIZONS):
        m = np.isfinite(y[:, hi])
        yabs = np.abs(y[:, hi]).astype(np.float32)
        # Per-stock mean |abret| from TRAIN rows only (no leakage).
        gmean = yabs[tr][m[tr]].mean()
        smean = {}
        for s in uniq:
            sel = (stock == s) & m
            sel_tr = sel.copy()
            sel_tr[va] = False
            smean[s] = yabs[sel_tr].mean() if sel_tr.any() else gmean
        base = np.array([smean.get(s, gmean) for s in stock], dtype=np.float32)
        resid = (yabs - base).astype(np.float32)  # within-stock residual magnitude

        trh, vah = tr[m[tr]], va[m[va]]
        # Residual is signed, so regress it raw (log=False), not log1p.
        pred = train_one(feats[trh], resid[trh], feats[vah], resid[vah], feats.shape[1], log=False)
        rho = spearman(pred, resid[vah])
        verdict = "issue text adds signal" if rho > 0.05 else "no per-issue signal (darkness = stock constant)"
        print(f"{days:>7}d {rho:>9.3f}  {verdict}")

    print(
        "\nρ_within ≈ 0 ⇒ within a stock, the issue text does NOT predict which issue moves more;\n"
        "the only real magnitude signal is the per-stock volatility level. Per-issue color would be\n"
        "identical for every issue of a stock (× green/red from its signal)."
    )


if __name__ == "__main__":
    main()
