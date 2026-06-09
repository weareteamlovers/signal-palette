"""GPT validation of the per-issue magnitude direction.

The keyword issue-type test gave within-stock val ρ≈0.10 (1d) — issue TYPE
predicts which issue moves a stock more than its average. Keywords are crude
(60% coverage), so this re-runs the SAME within-stock test but labels a sample
with GPT (the real classifier the live pipeline would use), comparing:

    keyword-type   vs   gpt-type   vs   gpt-intensity   vs   gpt type×intensity

If GPT labels lift ρ over keywords, the per-issue 변동폭 model is worth building
on type+intensity features. Robust design: within-stock standardization uses the
FULL dataset's per-stock train stats; only the held-out evaluation is on the
sampled rows (lookahead-safe time split).

Cost: ~size/25 gpt-4o-mini calls (a few cents). Labels cached to
ml/data/gpt_labels_sample.npz so re-runs don't re-call.

Run:  python ml/gpt_validate_type.py            (default sample 3000)
      python ml/gpt_validate_type.py --size 5000
"""

from __future__ import annotations

import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import requests

from common import HORIZONS, load_env
from diagnose_issue_type import classify as kw_classify
from diagnose_issue_type import within_stock_z
from diagnose_magnitude import spearman
from train import time_split

LABELS_PATH = Path(__file__).resolve().parent / "data" / "gpt_labels_sample.npz"
BATCH = 25
WORKERS = 6
TYPES = ["earnings", "guidance", "ma", "legal_reg", "analyst", "product",
         "partnership", "macro", "capital", "other"]
INTENS = ["high", "mid", "low"]

SYS = (
    "다음은 미국 주식 관련 뉴스 헤드라인 요약들이다. 각 항목을 분류하라.\n"
    f"type ∈ {TYPES}\n"
    "intensity = 이 뉴스가 해당 종목 주가를 그 종목의 평소 변동폭보다 크게 움직일 "
    f"가능성(방향 무관, 크기만) ∈ {INTENS}\n"
    '반드시 JSON 객체 {"labels":[{"type":..,"intensity":..}, ...]} 형태로만, '
    "입력과 같은 순서·같은 개수로 출력."
)


def classify_batch(texts: list[str], api_key: str) -> list[dict]:
    numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
    body = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": SYS},
            {"role": "user", "content": numbered},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }
    try:
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
            timeout=90,
        )
        r.raise_for_status()
        items = json.loads(r.json()["choices"][0]["message"]["content"]).get("labels", [])
    except Exception as e:  # noqa: BLE001 — best-effort; fall back to defaults
        print(f"    batch failed ({e}); defaulting")
        items = []
    out = []
    for i in range(len(texts)):
        it = items[i] if i < len(items) and isinstance(items[i], dict) else {}
        ty = it.get("type", "other")
        inten = it.get("intensity", "mid")
        out.append({
            "type": ty if ty in TYPES else "other",
            "intensity": inten if inten in INTENS else "mid",
        })
    return out


def gpt_labels(texts: np.ndarray, api_key: str) -> tuple[np.ndarray, np.ndarray]:
    batches = [list(range(i, min(i + BATCH, len(texts)))) for i in range(0, len(texts), BATCH)]
    results: dict[int, dict] = {}

    def run(bi):
        idxs = batches[bi]
        labs = classify_batch([texts[j] for j in idxs], api_key)
        return idxs, labs

    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for idxs, labs in ex.map(run, range(len(batches))):
            for j, lab in zip(idxs, labs):
                results[j] = lab
            done += len(idxs)
            if done % 500 < BATCH:
                print(f"    classified {done}/{len(texts)}")
    types = np.array([results[j]["type"] for j in range(len(texts))])
    inten = np.array([results[j]["intensity"] for j in range(len(texts))])
    return types, inten


def rho_by_label(label: np.ndarray, z: np.ndarray, trh: np.ndarray, vah: np.ndarray) -> float:
    """Predict val z by each label's TRAIN mean z; Spearman vs realized."""
    keys = sorted(set(label[trh].tolist()))
    tmean = {k: z[trh][label[trh] == k].mean() for k in keys}
    gmean = z[trh].mean()
    pred = np.array([tmean.get(k, gmean) for k in label[vah]])
    return spearman(pred, z[vah])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=3000)
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    env = load_env()
    api_key = env["OPENAI_API_KEY"]

    d = np.load(Path(__file__).resolve().parent / "data" / "events.npz", allow_pickle=True)
    y, t0 = d["y"].astype(np.float32), d["t0"]
    stock, text = d["stock"].astype(str), d["text"].astype(str)
    keep = np.isfinite(y).any(axis=1)
    y, t0, stock, text = y[keep], t0[keep], stock[keep], text[keep]
    tr_full, _ = time_split(t0, 0.2)

    rng = np.random.RandomState(args.seed)
    sample = np.sort(rng.choice(len(y), min(args.size, len(y)), replace=False))

    # GPT labels for the sample (cached).
    if LABELS_PATH.exists():
        cache = np.load(LABELS_PATH, allow_pickle=True)
        if cache["sample"].shape == sample.shape and np.array_equal(cache["sample"], sample):
            g_type, g_inten = cache["g_type"].astype(str), cache["g_inten"].astype(str)
            print(f"loaded cached GPT labels for {len(sample)} events")
        else:
            g_type, g_inten = gpt_labels(text[sample], api_key)
            np.savez(LABELS_PATH, sample=sample, g_type=g_type, g_inten=g_inten)
    else:
        print(f"GPT-classifying {len(sample)} events…")
        g_type, g_inten = gpt_labels(text[sample], api_key)
        np.savez(LABELS_PATH, sample=sample, g_type=g_type, g_inten=g_inten)

    # Full-array labels (only sample rows used in eval).
    kw = np.array([kw_classify(t) for t in text])
    gt = np.array(["?"] * len(y), dtype=object)
    gi = np.array(["?"] * len(y), dtype=object)
    gt[sample], gi[sample] = g_type, g_inten
    combo = np.array([f"{a}|{b}" for a, b in zip(gt, gi)], dtype=object)

    in_tr = np.isin(np.arange(len(y)), tr_full)
    tcounts = {t: int((g_type == t).sum()) for t in TYPES}
    icounts = {t: int((g_inten == t).sum()) for t in INTENS}
    print(f"\nsample {len(sample)} | gpt type counts {tcounts}")
    print(f"gpt intensity counts {icounts}")
    print("\nwithin-stock val ρ (higher = issue content separates per-issue magnitude better)")
    print(f"{'horizon':>8} {'kw-type':>9} {'gpt-type':>9} {'gpt-inten':>10} {'gpt t×i':>9}")
    for hi, days in enumerate(HORIZONS):
        m = np.isfinite(y[:, hi])
        z = within_stock_z(np.abs(y[:, hi]).astype(np.float64), stock, tr_full[m[tr_full]])
        s_tr = sample[in_tr[sample] & m[sample]]
        s_va = sample[~in_tr[sample] & m[sample]]
        r_kw = rho_by_label(kw, z, s_tr, s_va)
        r_gt = rho_by_label(gt.astype(str), z, s_tr, s_va)
        r_gi = rho_by_label(gi.astype(str), z, s_tr, s_va)
        r_co = rho_by_label(combo.astype(str), z, s_tr, s_va)
        print(f"{days:>7}d {r_kw:>9.3f} {r_gt:>9.3f} {r_gi:>10.3f} {r_co:>9.3f}")

    print(
        "\nIf gpt-type/gpt-inten > kw-type ⇒ GPT labeling extracts more per-issue magnitude\n"
        "signal ⇒ build the type+intensity model. (val n is sample-sized, so treat as directional.)"
    )


if __name__ == "__main__":
    main()
