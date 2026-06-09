"""Does the issue TYPE (earnings / M&A / analyst / legal / product / macro …)
predict within-stock magnitude — i.e. does *what kind* of news it is tell us
whether THIS issue moves the stock more than that stock's average?

This is the make-or-break for "issue content → per-issue 변동폭". The raw 1536-d
embedding failed (within-stock ρ≈0.02), but a low-dimensional, interpretable
TYPE feature is robust to the curse of dimensionality and is the real lever.

Method (lookahead-safe):
  - z = |abret_h| standardized WITHIN each stock (train-only stock mean/std) →
    "how big was this move FOR this stock", stock volatility removed.
  - Classify each issue into a type by keywords (free; a proxy for GPT intensity).
  - Predict a val issue's z by its type's TRAIN mean z. Spearman(pred, z) on val.
  - If ρ ≫ the embedding's 0.02 → issue type carries per-issue magnitude signal →
    build the type/intensity model. If ρ≈0 → per-issue magnitude isn't in the
    issue content (in this data) at all.

Run:  python ml/diagnose_issue_type.py
"""

from __future__ import annotations

import numpy as np

from common import HORIZONS
from diagnose_magnitude import spearman
from train import time_split

# First match wins; order = priority. Keywords cover the Korean GPT summaries
# (+ some English that survives in the backfill text).
TYPES: list[tuple[str, list[str]]] = [
    ("earnings", ["실적", "어닝", "earning", "매출", "순이익", "영업이익", "eps", "가이던스",
                  "guidance", "분기", "q1", "q2", "q3", "q4", "수익 증가", "수익이"]),
    ("ma", ["인수", "합병", "m&a", "지분", "매각", "merger", "acquisition", "파트너십",
            "파트너", "제휴", "협력", "통합"]),
    ("legal_reg", ["소송", "규제", "조사", "벌금", "제재", "fda", "승인", "리콜", "특허",
                   "법원", "판결", "반독점", "과징금", "antitrust"]),
    ("capital", ["자사주", "배당", "분할", "유상증자", "공매도", "buyback", "dividend", "증자"]),
    ("analyst", ["목표 주가", "목표주가", "투자의견", "등급", "상향", "하향", "매수", "매도",
                 "비중", "analyst", "분석가", "커버리지", "coverage", "업그레이드", "다운그레이드",
                 "price target", "상승 여력", "buy", "overweight"]),
    ("product", ["출시", "공개", "신제품", "계약", "수주", "공급", "칩", "ai", "플랫폼", "기술",
                 "개발", "임상", "결과", "제품", "서비스"]),
    ("macro", ["금리", "인플레", "관세", "연준", "fed", "경기", "선물", "지수", "유가", "트럼프",
               "휴전", "시장", "섹터"]),
]


def classify(text: str) -> str:
    t = text.lower()
    for name, kws in TYPES:
        if any(k in t for k in kws):
            return name
    return "other"


def within_stock_z(yabs: np.ndarray, stock: np.ndarray, tr: np.ndarray) -> np.ndarray:
    """Standardize |abret| within each stock using TRAIN stats only."""
    gmean, gstd = yabs[tr].mean(), max(yabs[tr].std(), 1e-6)
    z = np.zeros(len(yabs), dtype=np.float64)
    for s in set(stock.tolist()):
        sel = stock == s
        sel_tr = sel.copy()
        sel_tr[~np.isin(np.arange(len(sel)), tr)] = False
        if sel_tr.sum() >= 30:
            m, sd = yabs[sel_tr].mean(), max(yabs[sel_tr].std(), 0.3 * gstd)
        else:
            m, sd = gmean, gstd
        z[sel] = (yabs[sel] - m) / sd
    return z


def main() -> None:
    d = np.load("data/events.npz", allow_pickle=True)
    y, t0 = d["y"].astype(np.float32), d["t0"]
    stock, text = d["stock"].astype(str), d["text"].astype(str)
    keep = np.isfinite(y).any(axis=1)
    y, t0, stock, text = y[keep], t0[keep], stock[keep], text[keep]
    tr, va = time_split(t0, 0.2)

    types = np.array([classify(t) for t in text])
    cover = (types != "other").mean()
    counts = {n: int((types == n).sum()) for n, _ in TYPES}
    counts["other"] = int((types == "other").sum())
    print(f"events {len(y)} | train {len(tr)} val {len(va)} | classified (non-other) {cover*100:.0f}%")
    print(f"type counts: {counts}")

    for hi, days in enumerate(HORIZONS):
        m = np.isfinite(y[:, hi])
        yabs = np.abs(y[:, hi]).astype(np.float64)
        z = within_stock_z(yabs, stock, tr[m[tr]])
        trh, vah = tr[m[tr]], va[m[va]]

        # type → train mean z; predict val by lookup.
        order = [n for n, _ in TYPES] + ["other"]
        tmean = {n: z[trh][types[trh] == n].mean() if (types[trh] == n).any() else 0.0 for n in order}
        vmean = {n: z[vah][types[vah] == n].mean() if (types[vah] == n).any() else float("nan") for n in order}
        pred_va = np.array([tmean[t] for t in types[vah]])
        rho = spearman(pred_va, z[vah])

        print(f"\n── horizon {days}d ──  within-stock type→magnitude  val ρ = {rho:.3f}")
        for n in sorted(order, key=lambda k: tmean[k], reverse=True):
            ntr = int((types[trh] == n).sum())
            print(f"    {n:10s} train z̄={tmean[n]:+.3f}  val z̄={vmean[n]:+.3f}  (n_train={ntr})")

    print(
        "\nval ρ ≫ 0.05 ⇒ issue TYPE predicts within-stock magnitude ⇒ per-issue 변동폭 is real\n"
        "(build the type/intensity model). val ρ ≈ 0 ⇒ even issue type doesn't separate it."
    )


if __name__ == "__main__":
    main()
