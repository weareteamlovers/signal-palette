# Prediction model — offline training pipeline

Trains the **quantile MLP** that powers Step 5 reaction prediction: given an
issue's OpenAI embedding + its GICS sector, it predicts the stock's
**sector-relative abnormal return** (excess over its sector benchmark) at 1 / 3 / 5
trading days, as `p25 / p50 / p75`. The `p25~p75` range is exactly the
"예상 변동폭" band shown in the stock modal.

This replaces the k-NN + quantile-aggregation core with a **real SGD-trained
model** (learned weights). Training runs here (Codespaces, CPU); **inference runs
in TypeScript on Vercel** by loading the exported JSON and doing a plain forward
pass — no Python/torch in the app.

## Setup & run

```bash
cd ml
python -m venv .venv && .venv/bin/pip install -r requirements.txt

.venv/bin/python pull_data.py     # Supabase → ml/data/events.npz   (needs ../.env.local)
.venv/bin/python train.py         # → ml/artifacts/quantile_mlp.json
```

`pull_data.py` reads `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY` from
`../.env.local` and pulls `event_outcome ⨝ event_log` (labeled events only).

## Honesty gate

`train.py` validates on the **most recent** events (lookahead-safe time split)
and prints every metric next to a **featureless baseline** (constant = empirical
train quantiles). If the model doesn't beat that baseline's pinball loss, there
is no usable signal yet — do **not** wire it into production; keep the k-NN
fallback. Short-horizon news→return is near-efficient-market, so low signal is
expected early; the model improves as `event_outcome` accumulates. Retrain by
re-running both scripts.

## Artifact format (`quantile_mlp.json`) — for the TS inference layer

All weight arrays are **little-endian float32, base64**. Decode in TS with
`new Float32Array(Buffer.from(b64, "base64").buffer)`.

```jsonc
{
  "version": 1,
  "horizons": [1, 3, 5],
  "quantiles": [0.25, 0.5, 0.75],
  "input": {
    "embedding_dim": 1536,
    "sector_vocab": ["...", "Unknown"], // one-hot order; unseen sector → "Unknown"
    "emb_mean_b64": "...",              // len 1536 — standardize: (emb - mean) / std
    "emb_std_b64":  "..."
  },
  "arch": { "hidden": [128, 32], "activation": "relu", "head": "monotone_softplus" },
  "layers": [                            // body Linears in order, then head Linear last
    { "in": 1559, "out": 128, "W_b64": "...", "b_b64": "..." }, // W is row-major (out, in): y = W·x + b
    { "in": 128,  "out": 32,  "W_b64": "...", "b_b64": "..." },
    { "in": 32,   "out": 9,   "W_b64": "...", "b_b64": "..." }  // head: 9 = 3 horizons × 3
  ],
  "metrics": { "...": "val pinball, coverage, dir_hit, band_width, beats_baseline_horizons" }
}
```

**Inference (per issue):**
1. `x = concat( (embedding - emb_mean) / emb_std , onehot(sector, sector_vocab) )`
2. body: `h = relu(W·h + b)` for each body layer (dropout is train-only — skip).
3. head: `raw = W·h + b` (9 values). Reshape **horizon-major** to `(3, 3)`:
   per horizon `(base, Δmid, Δhigh)` →
   `p25 = base`, `p50 = p25 + softplus(Δmid)`, `p75 = p50 + softplus(Δhigh)`.

`softplus(z) = log(1 + e^z)` (use the `max(z,0)+log1p(e^-|z|)` form for stability).
