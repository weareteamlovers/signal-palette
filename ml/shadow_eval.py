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

Every metric is computed for ALL and per `market` (US now; KR = 0 → 'awaiting' —
the Korean-forward door we actually want to watch). One JSON record per run is
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
SEG_MIN = 200           # min n to report a market segment's screening metric
RHO_GATE, DIR_GATE = 0.05, 0.53  # pre-registered CI-lower-bound promotion gates
SEED = 0


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


def boot_ci(fn, *arrs, n_boot: int = 1000, seed: int = SEED) -> tuple[float, float]:
    """Bootstrap 95% CI of a paired statistic over the val window."""
    rng = np.random.default_rng(seed)
    N = len(arrs[0])
    if N == 0:
        return float("nan"), float("nan")
    vals = [fn(*[a[idx] for a in arrs]) for idx in (rng.integers(0, N, N) for _ in range(n_boot))]
    lo, hi = np.percentile(vals, [2.5, 97.5])
    return float(lo), float(hi)


def within_stock_z(yabs: np.ndarray, stock: np.ndarray, tr: np.ndarray) -> np.ndarray:
    """Standardize |abret| within each stock using TRAIN-only μ/σ (no leakage)."""
    trm = np.zeros(len(yabs), bool)
    trm[tr] = True
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


def main() -> None:
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    D = load_aligned()
    X, y, t0, stock, market, sector = (D["X"], D["y"], D["t0"], D["stock"], D["market"], D["sector"])
    cat, sent = D["cat"], D["sent"]
    tr, va = time_split(t0, 0.2)

    # Standardized embedding + sector one-hot (shared feature block).
    mean, std = X[tr].mean(0), np.where(X[tr].std(0) < 1e-6, 1.0, X[tr].std(0)).astype(np.float32)
    Xn = ((X - mean) / std).astype(np.float32)
    vocab = build_sector_vocab(sector[tr])
    feat_embsec = np.concatenate([Xn, onehot(sector, vocab)], axis=1).astype(np.float32)
    h1_feats = [("emb", Xn)]
    if cat is not None:
        cats = sorted(set(cat.tolist()))
        h1_feats.append(("cat", np.stack([(cat == c).astype(np.float32) for c in cats], axis=1)))

    snap = {h: int(np.isfinite(y[:, i]).sum()) for i, h in enumerate(HORIZONS)}
    mk_counts = dict(zip(*np.unique(market, return_counts=True)))
    print(f"events {len(X)} | train {len(tr)} val {len(va)} | markets {mk_counts}")
    print(f"snapshot t0: {datetime.fromtimestamp(t0.min(), timezone.utc).date()} → "
          f"{datetime.fromtimestamp(t0.max(), timezone.utc).date()}\n")

    rec: dict = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "n_total": int(len(X)), "markets": {k: int(v) for k, v in mk_counts.items()},
        "labeled_per_horizon": snap, "H1": {}, "H2": {},
    }

    def seg_masks() -> dict[str, np.ndarray]:
        segs = {"ALL": np.ones(len(X), bool)}
        for mk in sorted(set(market.tolist())):
            sel = market == mk
            if sel.sum() >= SEG_MIN:
                segs[mk] = sel
        return segs

    # ── H1: within-stock magnitude ───────────────────────────────────────────
    print("H1 — within-stock magnitude  (Spearman ρ on val; gate: CI-low > %.2f)" % RHO_GATE)
    print(f"{'horizon':>7} {'feat':>5} {'seg':>4} {'n_val':>6} {'ρ':>7} {'95% CI':>16}  verdict")
    for hi, days in enumerate(HORIZONS):
        m = np.isfinite(y[:, hi])
        yabs = np.abs(y[:, hi]).astype(np.float32)
        z = within_stock_z(yabs, stock, tr[m[tr]])
        for tag, feats in h1_feats:
            trh, vah = tr[m[tr]], va[m[va]]
            pred = train_one(feats[trh], z[trh], feats[vah], z[vah], feats.shape[1], log=False)
            for seg, smask in seg_masks().items():
                sv = smask[vah]
                if sv.sum() < SEG_MIN and seg != "ALL":
                    continue
                p, zz = pred[sv], z[vah][sv]
                rho = spearman(p, zz)
                lo, hi_ = boot_ci(spearman, p, zz)
                ok = lo > RHO_GATE
                print(f"{days:>6}d {tag:>5} {seg:>4} {int(sv.sum()):>6} {rho:>7.3f} "
                      f"[{lo:>6.3f},{hi_:>6.3f}]  {'PASS' if ok else 'no signal'}")
                rec["H1"].setdefault(f"{days}d", {}).setdefault(seg, {})[tag] = {
                    "rho": round(rho, 4), "ci": [round(lo, 4), round(hi_, 4)],
                    "n_val": int(sv.sum()), "pass": bool(ok)}
    rec["H2"]["_gate"] = DIR_GATE

    # ── H2: direction ────────────────────────────────────────────────────────
    print(f"\nH2 — direction  (dir_hit on val; gate: CI-low > {DIR_GATE} AND > majority)")
    print(f"{'horizon':>7} {'rule':>10} {'seg':>4} {'n_val':>6} {'dir_hit':>8} {'95% CI':>16} {'maj':>6}  verdict")
    for hi, days in enumerate(HORIZONS):
        m = np.isfinite(y[:, hi])
        trh, vah = tr[m[tr]], va[m[va]]
        # H2-model: emb+sector → signed return → sign
        pred = train_one(feat_embsec[trh], y[trh, hi], feat_embsec[vah], y[vah, hi],
                         feat_embsec.shape[1], log=False)
        psign_model = np.sign(pred)
        rsign = np.sign(y[vah, hi])
        for seg, smask in seg_masks().items():
            sv = smask[vah]
            # H2-model
            for rule, ps, rs, sub in (
                ("model", psign_model, rsign, np.ones(len(rsign), bool)),
                ("sentiment", None, None, None),   # filled below
                ("earnings", None, None, None),
            ):
                if rule == "model":
                    keep = sv & (rs != 0)
                    if keep.sum() < (SEG_MIN if seg != "ALL" else 1):
                        continue
                    a, b = ps[keep], rs[keep]
                elif rule == "sentiment":
                    if sent is None:
                        continue
                    sm = sent[vah]
                    keep = sv & np.isin(sm, ["positive", "negative"]) & (rsign != 0)
                    if keep.sum() < (SEG_MIN if seg != "ALL" else 1):
                        continue
                    a = np.where(sm[keep] == "positive", 1.0, -1.0)
                    b = rsign[keep]
                else:  # earnings: sentiment rule on category=earnings
                    if sent is None or cat is None:
                        continue
                    cm = cat[vah]
                    sm = sent[vah]
                    keep = sv & (cm == "earnings") & np.isin(sm, ["positive", "negative"]) & (rsign != 0)
                    if keep.sum() < 30:
                        continue
                    a = np.where(sm[keep] == "positive", 1.0, -1.0)
                    b = rsign[keep]
                dh = dir_hit(a, b)
                lo, hi_ = boot_ci(dir_hit, a, b)
                maj = max((b > 0).mean(), (b < 0).mean())
                ok = lo > DIR_GATE and dh > maj
                print(f"{days:>6}d {rule:>10} {seg:>4} {len(b):>6} {dh:>8.3f} "
                      f"[{lo:>6.3f},{hi_:>6.3f}] {maj:>6.3f}  {'PASS' if ok else 'no signal'}")
                rec["H2"].setdefault(f"{days}d", {}).setdefault(seg, {})[rule] = {
                    "dir_hit": round(dh, 4), "ci": [round(lo, 4), round(hi_, 4)],
                    "majority": round(float(maj), 4), "n_val": int(len(b)), "pass": bool(ok)}

    kr = rec["markets"].get("KR", 0)
    print(f"\nKR segment: {kr} events — "
          + ("evaluated above." if kr >= SEG_MIN else "awaiting data (the forward-Korean door)."))

    with LOG_PATH.open("a") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    any_pass = any(c.get("pass") for hd in rec["H1"].values() for sd in hd.values() for c in sd.values()) \
        or any(c.get("pass") for k, hd in rec["H2"].items() if k != "_gate"
               for sd in hd.values() for c in sd.values())
    print(f"verdict: {'PROMOTE candidate found — run multi-fold walk-forward (gate §2-4)' if any_pass else 'NO-GO — production stays GPT-only'}")
    print(f"logged → {LOG_PATH}")


if __name__ == "__main__":
    main()
