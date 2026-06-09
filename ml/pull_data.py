"""Pull the labeled event store (event_log ⨝ event_outcome) from Supabase into
a local npz, so training can iterate without re-hitting the API.

Each labeled event gives one training row:
  features → embedding (1536d) + sector (categorical)
  targets  → abret_1d / abret_3d / abret_5d  (sector-excess returns; may be null)
  t0       → event time, for the lookahead-safe time split

Reads via PostgREST with the service-role key (NEXT_PUBLIC_SUPABASE_URL +
SUPABASE_SECRET_KEY from .env.local), paginating 1000 rows at a time.

Run:  python ml/pull_data.py
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import numpy as np
import requests

from common import DATA_DIR, DATA_PATH, EMBEDDING_DIM, SECTOR_UNKNOWN, load_env

PAGE = 1000
# event_outcome is the labeled side; embed event_log for the features.
SELECT = (
    "abret_1d,abret_3d,abret_5d,"
    "event_log!inner(stock_name,sector,market,symbol,benchmark,embedding,issue_text,t0)"
)


def _to_unix(iso: str) -> float:
    """ISO 8601 → unix seconds (UTC)."""
    return datetime.fromisoformat(iso).astimezone(timezone.utc).timestamp()


def main() -> None:
    env = load_env()
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = env["SUPABASE_SECRET_KEY"]
    url = f"{base}/rest/v1/event_outcome"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }

    embeddings: list[np.ndarray] = []
    sectors: list[str] = []
    markets: list[str] = []
    stock_names: list[str] = []
    issue_texts: list[str] = []
    symbols: list[str] = []
    benchmarks: list[str] = []
    abret = {h: [] for h in (1, 3, 5)}
    t0s: list[float] = []

    offset = 0
    dropped = 0
    while True:
        params = {"select": SELECT, "order": "event_id", "limit": PAGE, "offset": offset}
        resp = requests.get(url, headers=headers, params=params, timeout=120)
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            break
        for row in rows:
            el = row.get("event_log") or {}
            emb_raw = el.get("embedding")
            if not emb_raw:
                dropped += 1
                continue
            vec = json.loads(emb_raw) if isinstance(emb_raw, str) else emb_raw
            if not isinstance(vec, list) or len(vec) != EMBEDDING_DIM:
                dropped += 1
                continue
            embeddings.append(np.asarray(vec, dtype=np.float32))
            sectors.append(el.get("sector") or SECTOR_UNKNOWN)
            markets.append(el.get("market") or "")
            stock_names.append(el.get("stock_name") or "")
            issue_texts.append(el.get("issue_text") or "")
            symbols.append(el.get("symbol") or "")
            benchmarks.append(el.get("benchmark") or "")
            for h in (1, 3, 5):
                v = row.get(f"abret_{h}d")
                abret[h].append(np.nan if v is None else float(v))
            t0s.append(_to_unix(el["t0"]))
        print(f"  pulled {offset + len(rows)} rows…")
        if len(rows) < PAGE:
            break
        offset += PAGE

    n = len(embeddings)
    if n == 0:
        raise SystemExit("no labeled events pulled — is migration 005 applied / store populated?")

    X = np.stack(embeddings)  # (N, 1536)
    y = np.stack([np.asarray(abret[h], dtype=np.float32) for h in (1, 3, 5)], axis=1)  # (N, 3)
    t0 = np.asarray(t0s, dtype=np.float64)  # (N,)
    sector_arr = np.asarray(sectors, dtype=object)
    market_arr = np.asarray(markets, dtype=object)
    stock_arr = np.asarray(stock_names, dtype=object)
    text_arr = np.asarray(issue_texts, dtype=object)
    symbol_arr = np.asarray(symbols, dtype=object)
    benchmark_arr = np.asarray(benchmarks, dtype=object)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    np.savez(
        DATA_PATH,
        X=X,
        y=y,
        t0=t0,
        sector=sector_arr,
        market=market_arr,
        stock=stock_arr,
        text=text_arr,
        symbol=symbol_arr,
        benchmark=benchmark_arr,
    )

    # Quick sanity summary.
    per_h = {h: int(np.isfinite(y[:, i]).sum()) for i, h in enumerate((1, 3, 5))}
    uniq_sectors = sorted(set(sectors))
    print(f"\nsaved {n} events → {DATA_PATH} (dropped {dropped} without usable embedding)")
    print(f"  labeled per horizon (1/3/5d): {per_h}")
    print(f"  sectors ({len(uniq_sectors)}): {uniq_sectors}")
    print(f"  markets: {dict(zip(*np.unique(market_arr.astype(str), return_counts=True)))}")
    print(
        f"  t0 range: {datetime.fromtimestamp(t0.min(), timezone.utc).date()} "
        f"→ {datetime.fromtimestamp(t0.max(), timezone.utc).date()}"
    )


if __name__ == "__main__":
    main()
