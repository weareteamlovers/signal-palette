"""Compute the price-derived features the rule backtest needs but the event
store doesn't have yet: the SAME-DAY reaction abret_0d, pre-event momentum
pre_abret_20d, vol_20d, and the 10-day forward future_abret_10d. All
sector-relative (stock return − benchmark return), from Yahoo daily adjclose.

Strategy: one Yahoo fetch per unique symbol/benchmark over the full date span,
then index per event. Validates by comparing recomputed future_abret_1/3/5d to
the stored event_outcome abret_1/3/5d.

Run:  python ml/price_features.py   →  ml/data/price_features.npz
"""

from __future__ import annotations

import time
from datetime import datetime, timezone

import numpy as np
import requests

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}"


def fetch_series(symbol: str, p1: int, p2: int) -> dict[int, float] | None:
    """{utc_date_ordinal: adjclose} for a symbol, or None on failure."""
    try:
        r = requests.get(
            CHART.format(sym=symbol),
            params={"period1": p1, "period2": p2, "interval": "1d", "includeAdjustedClose": "true"},
            headers={"User-Agent": UA},
            timeout=30,
        )
        r.raise_for_status()
        res = r.json()["chart"]["result"][0]
        ts = res["timestamp"]
        adj = res["indicators"]["adjclose"][0]["adjclose"]
    except Exception as e:  # noqa: BLE001
        print(f"    fetch failed {symbol}: {e}")
        return None
    out: dict[int, float] = {}
    for t, c in zip(ts, adj):
        if c is None:
            continue
        d = datetime.fromtimestamp(t, timezone.utc).date().toordinal()
        out[d] = float(c)
    return out


def main() -> None:
    d = np.load("data/events.npz", allow_pickle=True)
    t0 = d["t0"]
    y = d["y"].astype(np.float32)
    symbol = d["symbol"].astype(str)
    benchmark = d["benchmark"].astype(str)
    n = len(t0)

    # event date ordinals (UTC)
    ev_ord = np.array(
        [datetime.fromtimestamp(t, timezone.utc).date().toordinal() for t in t0],
        dtype=np.int64,
    )
    p1 = int(t0.min()) - 60 * 86400
    p2 = int(t0.max()) + 30 * 86400

    syms = sorted(set(symbol) | set(benchmark))
    series: dict[str, tuple[np.ndarray, np.ndarray]] = {}
    print(f"fetching {len(syms)} symbols…")
    for i, s in enumerate(syms):
        m = fetch_series(s, p1, p2)
        if m:
            ords = np.array(sorted(m.keys()), dtype=np.int64)
            closes = np.array([m[o] for o in ords], dtype=np.float64)
            series[s] = (ords, closes)
        time.sleep(0.25)
        if (i + 1) % 20 == 0:
            print(f"    {i+1}/{len(syms)}")

    HOR = [0, 1, 3, 5, 10]
    feats = {f"future_abret_{h}d": np.full(n, np.nan, np.float64) for h in HOR}
    feats["abret_0d"] = np.full(n, np.nan, np.float64)
    feats["pre_abret_20d"] = np.full(n, np.nan, np.float64)
    feats["vol_20d"] = np.full(n, np.nan, np.float64)

    def close_on(s: str, o: int) -> float | None:
        sd = series.get(s)
        if not sd:
            return None
        ords, closes = sd
        idx = np.searchsorted(ords, o)
        return float(closes[idx]) if idx < len(ords) and ords[idx] == o else None

    for e in range(n):
        sd = series.get(symbol[e])
        bd = series.get(benchmark[e])
        if not sd or not bd:
            continue
        s_ords, s_close = sd
        i0 = int(np.searchsorted(s_ords, ev_ord[e]))  # first trading day >= t0
        if i0 >= len(s_ords) or i0 < 1:
            continue

        def excess(a_idx: int, b_idx: int) -> float | None:
            if a_idx < 0 or b_idx >= len(s_ords):
                return None
            da, db = int(s_ords[a_idx]), int(s_ords[b_idx])
            sa, sbb = float(s_close[a_idx]), float(s_close[b_idx])
            ba, bb = close_on(benchmark[e], da), close_on(benchmark[e], db)
            if None in (ba, bb) or sa <= 0 or ba <= 0:
                return None
            return (sbb / sa - 1.0) - (bb / ba - 1.0)

        feats["abret_0d"][e] = excess(i0 - 1, i0) or np.nan
        for h in [1, 3, 5, 10]:
            v = excess(i0, i0 + h)
            if v is not None:
                feats[f"future_abret_{h}d"][e] = v
        feats["future_abret_0d"][e] = feats["abret_0d"][e]
        pv = excess(i0 - 21, i0 - 1)
        if pv is not None:
            feats["pre_abret_20d"][e] = pv
        # vol_20d: std of stock daily returns over the 20 days before i0
        if i0 - 21 >= 0:
            seg = s_close[i0 - 21 : i0]
            rets = seg[1:] / seg[:-1] - 1.0
            feats["vol_20d"][e] = float(np.std(rets))

    # ── validation vs stored abret_1/3/5d ──
    print("\nvalidation: recomputed future_abret vs stored event_outcome abret")
    for hi, h in enumerate([1, 3, 5]):
        a = feats[f"future_abret_{h}d"]
        b = y[:, hi]
        m = np.isfinite(a) & np.isfinite(b)
        corr = np.corrcoef(a[m], b[m])[0, 1]
        mad = float(np.median(np.abs(a[m] - b[m])))
        print(f"  {h}d: corr={corr:.3f}  median|Δ|={mad*100:.3f}%  (n={m.sum()})")

    cov = {k: int(np.isfinite(v).sum()) for k, v in feats.items()}
    print(f"\ncoverage: {cov}")
    np.savez("data/price_features.npz", **feats)
    print("saved → data/price_features.npz")


if __name__ == "__main__":
    main()
