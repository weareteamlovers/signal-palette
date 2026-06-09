"""Train the quantile MLP that predicts sector-relative abnormal return
(p25/p50/p75 at 1/3/5 trading days) from an issue embedding + sector.

Design:
  - Features: standardized embedding (1536d) ⊕ sector one-hot.
  - Head: per horizon the net emits (base, Δmid, Δhigh); the quantiles are
    p25=base, p50=p25+softplus(Δmid), p75=p50+softplus(Δhigh) — monotone by
    construction (no crossing).
  - Loss: masked pinball/quantile loss (a target horizon with a null abret just
    doesn't contribute).
  - Split: LOOKAHEAD-SAFE by time — train on the oldest events, validate on the
    most recent. Predicting the future from the past, never the reverse.
  - Honesty gate: every metric is printed next to a featureless baseline
    (constant = empirical train quantiles). If the MLP can't beat that on val,
    there is no signal and it should not ship.

Run:  python ml/train.py            (defaults below)
      python ml/train.py --epochs 300 --hidden 128 32
Outputs ml/artifacts/quantile_mlp.json for the TS inference layer (Phase #3).
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone

import numpy as np
import torch
import torch.nn as nn

from common import (
    ARTIFACT_DIR,
    ARTIFACT_PATH,
    DATA_PATH,
    EMBEDDING_DIM,
    HORIZONS,
    QUANTILES,
    SECTOR_UNKNOWN,
    f32_b64,
)

Q = torch.tensor(QUANTILES, dtype=torch.float32)


# ─────────────────────────── data ───────────────────────────
def load_dataset():
    if not DATA_PATH.exists():
        raise SystemExit(f"{DATA_PATH} missing — run `python ml/pull_data.py` first")
    d = np.load(DATA_PATH, allow_pickle=True)
    X, y, t0 = d["X"].astype(np.float32), d["y"].astype(np.float32), d["t0"]
    sector = d["sector"].astype(str)
    # Drop rows with no usable target at any horizon.
    keep = np.isfinite(y).any(axis=1)
    return X[keep], y[keep], t0[keep], sector[keep]


def time_split(t0: np.ndarray, val_frac: float):
    """Indices for the oldest (1-val_frac) as train, newest val_frac as val."""
    order = np.argsort(t0, kind="stable")
    cut = int(len(order) * (1.0 - val_frac))
    return order[:cut], order[cut:]


def build_sector_vocab(sectors: np.ndarray) -> list[str]:
    vocab = sorted(set(sectors.tolist()))
    if SECTOR_UNKNOWN not in vocab:
        vocab.append(SECTOR_UNKNOWN)
    return vocab


def onehot(sectors: np.ndarray, vocab: list[str]) -> np.ndarray:
    idx = {s: i for i, s in enumerate(vocab)}
    unk = idx[SECTOR_UNKNOWN]
    out = np.zeros((len(sectors), len(vocab)), dtype=np.float32)
    for r, s in enumerate(sectors):
        out[r, idx.get(s, unk)] = 1.0
    return out


# ─────────────────────────── model ───────────────────────────
class QuantileMLP(nn.Module):
    def __init__(self, in_dim: int, hidden: list[int], dropout: float):
        super().__init__()
        layers: list[nn.Module] = []
        prev = in_dim
        for h in hidden:
            if h <= 0:  # `--hidden 0` → linear (quantile) model, no hidden layer
                continue
            layers += [nn.Linear(prev, h), nn.ReLU(), nn.Dropout(dropout)]
            prev = h
        self.body = nn.Sequential(*layers)
        self.head = nn.Linear(prev, len(HORIZONS) * len(QUANTILES))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        raw = self.head(self.body(x)).view(-1, len(HORIZONS), len(QUANTILES))
        base = raw[..., 0]
        mid = base + nn.functional.softplus(raw[..., 1])
        high = mid + nn.functional.softplus(raw[..., 2])
        return torch.stack([base, mid, high], dim=-1)  # (B, H, Q) ascending


def pinball_loss(pred, target, mask) -> torch.Tensor:
    """pred (B,H,Q), target (B,H), mask (B,H). Mean over valid (row,horizon,q)."""
    diff = target.unsqueeze(-1) - pred  # (B,H,Q)
    q = Q.view(1, 1, -1)
    loss = torch.maximum(q * diff, (q - 1) * diff) * mask.unsqueeze(-1)
    denom = mask.sum() * len(QUANTILES)
    return loss.sum() / torch.clamp(denom, min=1.0)


# ─────────────────────── metrics / baseline ───────────────────────
def baseline_quantiles(y_train: np.ndarray) -> np.ndarray:
    """Featureless baseline: empirical train quantiles per horizon. (H, Q)."""
    out = np.zeros((len(HORIZONS), len(QUANTILES)), dtype=np.float32)
    for hi in range(len(HORIZONS)):
        col = y_train[:, hi]
        col = col[np.isfinite(col)]
        out[hi] = np.quantile(col, QUANTILES) if col.size else 0.0
    return out


def report(name, pred, y, mask):
    """pred (N,H,Q) np, y (N,H) np, mask (N,H) bool np. Returns metrics dict."""
    qi = QUANTILES.index(0.50)
    lo, mid, hi = pred[..., 0], pred[..., qi], pred[..., 2]
    out = {}
    print(f"  [{name}]")
    for hidx, days in enumerate(HORIZONS):
        m = mask[:, hidx]
        if not m.any():
            continue
        yh, lh, mh, hh = y[m, hidx], lo[m, hidx], mid[m, hidx], hi[m, hidx]
        diff = yh[:, None] - pred[m, hidx, :]
        pin = np.maximum(QUANTILES * diff, (np.array(QUANTILES) - 1) * diff).mean()
        cover = float(((yh >= lh) & (yh <= hh)).mean())  # target ≈ 0.50
        nz = np.abs(yh) > 1e-9
        hit = float((np.sign(mh[nz]) == np.sign(yh[nz])).mean()) if nz.any() else float("nan")
        width = float((hh - lh).mean())
        out[f"{days}d"] = {"pinball": float(pin), "coverage": cover, "dir_hit": hit, "band_width": width, "n": int(m.sum())}
        print(
            f"    {days}d  pinball={pin:.5f}  coverage={cover:.2f}(→0.50)  "
            f"dir_hit={hit:.3f}  band={width*100:.2f}%  n={m.sum()}"
        )
    return out


# ─────────────────────────── train ───────────────────────────
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=200)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--batch", type=int, default=256)
    ap.add_argument("--hidden", type=int, nargs="+", default=[128, 32])
    ap.add_argument("--dropout", type=float, default=0.2)
    ap.add_argument("--weight-decay", type=float, default=1e-4)
    ap.add_argument("--val-frac", type=float, default=0.2)
    ap.add_argument("--patience", type=int, default=25)
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    X, y, t0, sector = load_dataset()
    tr_idx, va_idx = time_split(t0, args.val_frac)
    print(f"events: {len(X)}  | train {len(tr_idx)}  val {len(va_idx)}")
    print(
        f"  train t0 ≤ {datetime.fromtimestamp(t0[tr_idx].max(), timezone.utc).date()}  "
        f"| val t0 ≥ {datetime.fromtimestamp(t0[va_idx].min(), timezone.utc).date()}"
    )

    # Standardize embeddings on TRAIN stats only.
    emb_mean = X[tr_idx].mean(axis=0)
    emb_std = X[tr_idx].std(axis=0)
    emb_std = np.where(emb_std < 1e-6, 1.0, emb_std).astype(np.float32)
    Xn = (X - emb_mean) / emb_std

    vocab = build_sector_vocab(sector[tr_idx])
    S = onehot(sector, vocab)
    feats = np.concatenate([Xn, S], axis=1).astype(np.float32)
    in_dim = feats.shape[1]
    print(f"  features: {EMBEDDING_DIM} emb + {len(vocab)} sectors = {in_dim}")

    mask = np.isfinite(y)
    y_filled = np.nan_to_num(y, nan=0.0)

    def tens(a):
        return torch.from_numpy(np.ascontiguousarray(a))

    Xtr, ytr, mtr = tens(feats[tr_idx]), tens(y_filled[tr_idx]), tens(mask[tr_idx].astype(np.float32))
    Xva, yva, mva = tens(feats[va_idx]), tens(y_filled[va_idx]), tens(mask[va_idx].astype(np.float32))

    model = QuantileMLP(in_dim, args.hidden, args.dropout)
    opt = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)

    n = len(tr_idx)
    best_val, best_state, since = float("inf"), None, 0
    for epoch in range(1, args.epochs + 1):
        model.train()
        perm = torch.randperm(n)
        for i in range(0, n, args.batch):
            b = perm[i : i + args.batch]
            opt.zero_grad()
            loss = pinball_loss(model(Xtr[b]), ytr[b], mtr[b])
            loss.backward()
            opt.step()

        model.eval()
        with torch.no_grad():
            vloss = pinball_loss(model(Xva), yva, mva).item()
        if vloss < best_val - 1e-7:
            best_val, best_state, since = vloss, {k: v.clone() for k, v in model.state_dict().items()}, 0
        else:
            since += 1
        if epoch % 20 == 0 or epoch == 1:
            with torch.no_grad():
                tloss = pinball_loss(model(Xtr), ytr, mtr).item()
            print(f"  epoch {epoch:3d}  train {tloss:.5f}  val {vloss:.5f}  (best {best_val:.5f})")
        if since >= args.patience:
            print(f"  early stop at epoch {epoch} (no val improvement for {args.patience})")
            break

    if best_state is not None:
        model.load_state_dict(best_state)
    model.eval()

    # ── validation report vs featureless baseline ──
    print("\nVALIDATION (most recent events):")
    with torch.no_grad():
        pred_va = model(Xva).numpy()
    base = baseline_quantiles(y[tr_idx])  # (H,Q)
    base_va = np.broadcast_to(base, (len(va_idx), *base.shape))
    m_va = mask[va_idx]
    model_m = report("model", pred_va, y[va_idx], m_va)
    base_m = report("baseline (const train quantiles)", base_va, y[va_idx], m_va)
    beats = sum(
        1 for k in model_m if k in base_m and model_m[k]["pinball"] < base_m[k]["pinball"]
    )
    print(f"\n  → model beats baseline pinball on {beats}/{len(model_m)} horizons")
    if beats == 0:
        print("  ⚠️  no horizon beats the featureless baseline — no usable signal yet.")

    # ── export weights for TS inference ──
    linears = [m for m in model.modules() if isinstance(m, nn.Linear)]
    layers = []
    for li in linears:
        W = li.weight.detach().numpy()  # (out, in) — y = W x + b
        b = li.bias.detach().numpy()
        layers.append({"in": int(W.shape[1]), "out": int(W.shape[0]), "W_b64": f32_b64(W), "b_b64": f32_b64(b)})

    artifact = {
        "version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "horizons": HORIZONS,
        "quantiles": QUANTILES,
        "input": {
            "embedding_dim": EMBEDDING_DIM,
            "sector_vocab": vocab,  # one-hot order; missing sector → "Unknown"
            "emb_mean_b64": f32_b64(emb_mean),
            "emb_std_b64": f32_b64(emb_std),
        },
        "arch": {
            "hidden": args.hidden,
            "activation": "relu",
            # head: 9 raw outputs → per horizon (base, Δmid, Δhigh); quantiles =
            # base, base+softplus(Δmid), +softplus(Δhigh). horizon-major order.
            "head": "monotone_softplus",
        },
        "layers": layers,  # body Linears in order, then the head Linear last
        "metrics": {
            "n_train": int(len(tr_idx)),
            "n_val": int(len(va_idx)),
            "val_best_pinball": best_val,
            "model": model_m,
            "baseline": base_m,
            "beats_baseline_horizons": beats,
        },
    }
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACT_PATH.write_text(json.dumps(artifact))
    size_kb = ARTIFACT_PATH.stat().st_size / 1024
    print(f"\nexported → {ARTIFACT_PATH} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
