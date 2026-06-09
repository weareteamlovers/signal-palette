"""Shared constants + helpers for the prediction-model training pipeline.

The model predicts a stock's sector-relative *abnormal return* (excess over its
sector benchmark) at 1/3/5 trading days after an issue, as a distribution
(p25/p50/p75) — so the existing "예상 변동폭" band (p25~p75) maps directly onto
the model output. Input features (v1): the issue's OpenAI embedding + its GICS
sector. Trained offline here; weights are exported to JSON and run in TS.
"""

from __future__ import annotations

import base64
from pathlib import Path

import numpy as np

# Horizons (trading days) and the quantiles we regress per horizon.
HORIZONS = [1, 3, 5]
QUANTILES = [0.25, 0.50, 0.75]

EMBEDDING_DIM = 1536  # text-embedding-3-small
SECTOR_UNKNOWN = "Unknown"  # bucket for events with no resolved sector

REPO_ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = REPO_ROOT / ".env.local"
DATA_DIR = Path(__file__).resolve().parent / "data"
ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
DATA_PATH = DATA_DIR / "events.npz"
ARTIFACT_PATH = ARTIFACT_DIR / "quantile_mlp.json"


def load_env() -> dict[str, str]:
    """Parse .env.local (KEY=VALUE per line) into a dict. No external deps."""
    env: dict[str, str] = {}
    if not ENV_PATH.exists():
        raise FileNotFoundError(f"missing {ENV_PATH} — needs Supabase keys to pull data")
    for raw in ENV_PATH.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        env[key.strip()] = val.strip().strip('"').strip("'")
    return env


def f32_b64(arr: np.ndarray) -> str:
    """Encode an array as little-endian float32, base64 — the on-disk weight
    form. Compact vs JSON number lists, and trivial to decode in TS
    (Buffer.from(b64,'base64') → Float32Array)."""
    return base64.b64encode(np.ascontiguousarray(arr, dtype="<f4").tobytes()).decode("ascii")
