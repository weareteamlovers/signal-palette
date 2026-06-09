"""Diagnostic: is the *magnitude* of the move predictable, even though its
*direction* isn't? (Direction tested at dir_hit≈0.50 = no signal.)

The 7-level prediction color splits into two axes: green↔red = DIRECTION (taken
from the issue's signal, since the model can't predict it), and darkness +
impact period = SIZE/DURATION. This script tests whether the SIZE axis carries
any learnable signal: regress |abret_h| from the same features (embedding +
sector), time-split, and compare to a featureless mean baseline + report
Spearman rank-correlation between predicted and realized magnitude.

If the model's val MAE beats the mean baseline AND Spearman > 0 meaningfully,
the darkness/impact-period axis is buildable. If not, magnitude is noise too.

Run:  python ml/diagnose_magnitude.py
"""

from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn

from common import HORIZONS, SECTOR_UNKNOWN
from train import build_sector_vocab, load_dataset, onehot, time_split


def rankdata(x: np.ndarray) -> np.ndarray:
    order = np.argsort(x, kind="stable")
    r = np.empty(len(x), dtype=np.float64)
    r[order] = np.arange(len(x))
    return r


def spearman(a: np.ndarray, b: np.ndarray) -> float:
    ra, rb = rankdata(a), rankdata(b)
    ra -= ra.mean()
    rb -= rb.mean()
    denom = np.sqrt((ra**2).sum() * (rb**2).sum())
    return float((ra * rb).sum() / denom) if denom > 0 else 0.0


class MagMLP(nn.Module):
    def __init__(self, in_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 64), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(64, 1),
        )

    def forward(self, x):
        return self.net(x).squeeze(-1)


def train_one(Xtr, ytr, Xva, yva, in_dim, epochs=300, patience=30, log=True):
    """Regress the target with an MLP; return val predictions in target units.
    log=True regresses log1p(target) (for nonneg |abret|); log=False regresses
    the raw target (for signed residuals)."""
    model = MagMLP(in_dim)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-3)
    lossf = nn.MSELoss()
    enc = (lambda a: np.log1p(a)) if log else (lambda a: a)
    dec = (lambda a: np.expm1(a)) if log else (lambda a: a)
    ttr, tva = torch.from_numpy(enc(ytr)), torch.from_numpy(enc(yva))
    Xtr_t, Xva_t = torch.from_numpy(Xtr), torch.from_numpy(Xva)
    best, best_state, since = float("inf"), None, 0
    n = len(Xtr)
    for ep in range(epochs):
        model.train()
        perm = torch.randperm(n)
        for i in range(0, n, 256):
            b = perm[i : i + 256]
            opt.zero_grad()
            loss = lossf(model(Xtr_t[b]), ttr[b])
            loss.backward()
            opt.step()
        model.eval()
        with torch.no_grad():
            v = lossf(model(Xva_t), tva).item()
        if v < best - 1e-7:
            best, best_state, since = v, {k: w.clone() for k, w in model.state_dict().items()}, 0
        else:
            since += 1
        if since >= patience:
            break
    if best_state:
        model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        return dec(model(Xva_t).numpy())


def main() -> None:
    X, y, t0, sector = load_dataset()
    tr, va = time_split(t0, 0.2)

    mean = X[tr].mean(0)
    std = np.where(X[tr].std(0) < 1e-6, 1.0, X[tr].std(0)).astype(np.float32)
    Xn = ((X - mean) / std).astype(np.float32)
    vocab = build_sector_vocab(sector[tr])
    feats = np.concatenate([Xn, onehot(sector, vocab)], axis=1).astype(np.float32)

    n_emb = X.shape[1]
    sec_oh = feats[:, n_emb:]  # sector one-hot block

    # Three feature sets, all sharing the same sector one-hot:
    #  - sector : "this sector/stock is volatile" baseline (no issue text)
    #  - full   : sector + full 1536-d embedding
    #  - pca32  : sector + embedding reduced to 32 dims (PCA fit on TRAIN only),
    #             in case 1536-d just overfits and a tamed embedding helps
    feats_sec = np.concatenate([np.zeros_like(feats[:, :n_emb]), sec_oh], axis=1).astype(np.float32)

    mean_e = X[tr].mean(0)
    Xc = X[tr] - mean_e
    _, _, Vt = np.linalg.svd(Xc, full_matrices=False)
    comps = Vt[:32]  # (32, 1536)
    proj = ((X - mean_e) @ comps.T).astype(np.float32)
    proj = (proj - proj[tr].mean(0)) / np.where(proj[tr].std(0) < 1e-6, 1.0, proj[tr].std(0))
    feats_pca = np.concatenate([proj.astype(np.float32), sec_oh], axis=1).astype(np.float32)

    print(f"events {len(X)} | train {len(tr)} val {len(va)}")
    print("\nMAGNITUDE predictability  (target = |abret|, move size regardless of direction)")
    print("Spearman rank-corr(pred, realized) on val — the metric for 7-level bucketing")
    print(f"{'horizon':>8} {'ρ_sector':>9} {'ρ_full1536':>11} {'ρ_pca32':>9}  embed helps?")
    for hi, days in enumerate(HORIZONS):
        m = np.isfinite(y[:, hi])
        trh, vah = tr[m[tr]], va[m[va]]
        ytr = np.abs(y[trh, hi]).astype(np.float32)
        yva = np.abs(y[vah, hi]).astype(np.float32)
        rs = spearman(train_one(feats_sec[trh], ytr, feats_sec[vah], yva, feats_sec.shape[1]), yva)
        rf = spearman(train_one(feats[trh], ytr, feats[vah], yva, feats.shape[1]), yva)
        rp = spearman(train_one(feats_pca[trh], ytr, feats_pca[vah], yva, feats_pca.shape[1]), yva)
        helps = "YES" if max(rf, rp) > rs + 0.03 else "no (sector only)"
        print(f"{days:>7}d {rs:>9.3f} {rf:>11.3f} {rp:>9.3f}  {helps}")
    print(
        "\nIf ρ_full/ρ_pca ≤ ρ_sector ⇒ the issue TEXT adds nothing for magnitude; the move-size\n"
        "signal is purely 'which stock/sector' (= historical volatility), needs no neural model."
    )


if __name__ == "__main__":
    main()
