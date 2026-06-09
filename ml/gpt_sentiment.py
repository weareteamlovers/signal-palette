"""GPT sentiment + category classification for the rule backtest.
sentiment ∈ {positive, negative, neutral} (호재/악재), category ∈ a fixed set.
Cached to data/gpt_sentcat.npz so re-runs don't re-call. ~size/25 gpt-4o-mini
calls (cents). Run:  python ml/gpt_sentiment.py
"""

from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import requests

from common import load_env

OUT = Path(__file__).resolve().parent / "data" / "gpt_sentcat.npz"
BATCH, WORKERS = 25, 6
SENT = ["positive", "negative", "neutral"]
CAT = ["earnings", "guidance", "demand", "order", "product", "partnership",
       "ma", "analyst", "legal_reg", "macro", "capital", "other"]
SYS = (
    "다음은 미국 주식 관련 뉴스 헤드라인 요약들이다. 각 항목을 분류하라.\n"
    f"sentiment = 해당 종목에 호재면 positive, 악재면 negative, 중립이면 neutral ∈ {SENT}\n"
    f"category ∈ {CAT}\n"
    '반드시 JSON {"labels":[{"sentiment":..,"category":..}, ...]} 로만, 입력과 같은 순서·개수로.'
)


def classify(texts: list[str], key: str) -> list[dict]:
    numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
    try:
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "system", "content": SYS}, {"role": "user", "content": numbered}],
                "response_format": {"type": "json_object"},
                "temperature": 0,
            },
            timeout=90,
        )
        r.raise_for_status()
        items = json.loads(r.json()["choices"][0]["message"]["content"]).get("labels", [])
    except Exception as e:  # noqa: BLE001
        print(f"    batch failed ({e})")
        items = []
    out = []
    for i in range(len(texts)):
        it = items[i] if i < len(items) and isinstance(items[i], dict) else {}
        s = it.get("sentiment", "neutral")
        c = it.get("category", "other")
        out.append({"sentiment": s if s in SENT else "neutral", "category": c if c in CAT else "other"})
    return out


def main() -> None:
    key = load_env()["OPENAI_API_KEY"]
    d = np.load(Path(__file__).resolve().parent / "data" / "events.npz", allow_pickle=True)
    text = d["text"].astype(str)

    if OUT.exists():
        c = np.load(OUT, allow_pickle=True)
        if len(c["sentiment"]) == len(text):
            print(f"cached labels present for {len(text)} events — delete {OUT.name} to redo")
            return

    batches = [list(range(i, min(i + BATCH, len(text)))) for i in range(0, len(text), BATCH)]
    res: dict[int, dict] = {}

    def run(bi):
        idxs = batches[bi]
        return idxs, classify([text[j] for j in idxs], key)

    print(f"classifying {len(text)} events…")
    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for idxs, labs in ex.map(run, range(len(batches))):
            for j, lab in zip(idxs, labs):
                res[j] = lab
            done += len(idxs)
            if done % 1000 < BATCH:
                print(f"    {done}/{len(text)}")

    sentiment = np.array([res[j]["sentiment"] for j in range(len(text))])
    category = np.array([res[j]["category"] for j in range(len(text))])
    np.savez(OUT, sentiment=sentiment, category=category)
    print(f"sentiment: {dict(zip(*np.unique(sentiment, return_counts=True)))}")
    print(f"category: {dict(zip(*np.unique(category, return_counts=True)))}")
    print(f"saved → {OUT}")


if __name__ == "__main__":
    main()
