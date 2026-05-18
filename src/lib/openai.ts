// Server-only OpenAI helpers. Do NOT import from a client component — this
// file uses process.env.OPENAI_API_KEY and instantiates the OpenAI SDK,
// which must never reach the browser bundle.

import OpenAI from "openai";
import type { Intensity, Issue, OverallSignal, Signal, Stock } from "@/types";

const client = new OpenAI();

const ISSUE_ORDER_RULE = `이슈 배열은 반드시 다음 순서로 정렬하세요. 어떤 경우에도 이 순서를 어기지 마세요:
1) signal="positive", intensity="strong"
2) signal="positive", intensity="mid"
3) signal="positive", intensity="mild"
4) signal="neutral" (intensity는 항상 "mid")
5) signal="negative", intensity="mild"
6) signal="negative", intensity="mid"
7) signal="negative", intensity="strong"

같은 (signal, intensity) 안에서는 중요도가 높은 순서로 정렬하세요.`;

const LANGUAGE_RULE = `이슈 텍스트는 반드시 자연스러운 한국어로 작성하세요. 영문 기사를 참고했더라도 한국어로 요약/번역해서 옮기세요. 영문 단어가 섞이더라도 외래어 표기(예: "AI", "TSMC")는 허용하지만 문장 전체가 영문이거나 영문 어순이면 안 됩니다.`;

const DEDUP_RULE = `같은 사건의 여러 측면을 별개 이슈로 나열하지 마세요. 한 사건은 정확히 한 줄로만 표현하세요.
나쁜 예 (같은 노조 파업 사건을 3줄로 쪼갠 경우):
  - "노조와 대화 결렬로 파업 위기"
  - "반도체 생산 줄이며 긴장 고조"
  - "정부 총리 긴급 대응중"
좋은 예 (한 줄로 통합):
  - "노조 파업 위기, 생산·정부 대응 영향"

서로 다른 사건만 별개 이슈로 다루세요. 비슷한 주제·동일 원인의 이슈는 반드시 합치세요.`;

const STOCK_SCHEMA_HINT = `{
  "issues": [
    { "text": "한 문장 30자 이내", "signal": "positive|neutral|negative", "intensity": "strong|mid|mild" }
  ],
  "overall": { "signal": "positive|neutral|negative", "intensity": "strong|mid|mild" }
}`;

function extractJson(text: string): string {
  // GPT sometimes wraps JSON in ``` or ```json fences. Strip them.
  const fence = /```(?:json)?\s*([\s\S]*?)```/i;
  const match = text.match(fence);
  return (match ? match[1] : text).trim();
}

const SIGNALS: readonly Signal[] = ["positive", "neutral", "negative"];
const INTENSITIES: readonly Intensity[] = ["strong", "mid", "mild"];

function isSignal(x: unknown): x is Signal {
  return typeof x === "string" && (SIGNALS as readonly string[]).includes(x);
}
function isIntensity(x: unknown): x is Intensity {
  return typeof x === "string" && (INTENSITIES as readonly string[]).includes(x);
}

function normalizeIssue(raw: unknown): Issue | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.text !== "string" || !isSignal(o.signal) || !isIntensity(o.intensity)) {
    return null;
  }
  // Neutral always renders with the single mid shade — coerce defensively.
  const intensity = o.signal === "neutral" ? "mid" : o.intensity;
  return { text: o.text.trim(), signal: o.signal, intensity };
}

/** GPT does not always honor the 7-bucket order, so we re-sort on the server.
 *  Array.prototype.sort is stable in modern Node, so GPT's intra-bucket
 *  "importance" order is preserved within each bucket. */
const BUCKET_ORDER: ReadonlyArray<{ signal: Signal; intensity: Intensity }> = [
  { signal: "positive", intensity: "strong" },
  { signal: "positive", intensity: "mid" },
  { signal: "positive", intensity: "mild" },
  { signal: "neutral", intensity: "mid" },
  { signal: "negative", intensity: "mild" },
  { signal: "negative", intensity: "mid" },
  { signal: "negative", intensity: "strong" },
];

function bucketIndex(issue: Issue): number {
  const i = BUCKET_ORDER.findIndex(
    (b) => b.signal === issue.signal && b.intensity === issue.intensity,
  );
  return i === -1 ? BUCKET_ORDER.length : i; // unknowns to the end
}

function sortByBucket(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => bucketIndex(a) - bucketIndex(b));
}

function normalizeOverall(raw: unknown): OverallSignal | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isSignal(o.signal) || !isIntensity(o.intensity)) return null;
  const intensity = o.signal === "neutral" ? "mid" : o.intensity;
  return { signal: o.signal, intensity };
}

/** Analyze a single stock: web_search the last 7 days of KR/US market news,
 *  then return up to `maxIssues` sorted issues and a stock-level overall.
 *  maxIssues = 20 on desktop/tablet (10×2 grid) and 10 on mobile (5×2 grid).
 *  Throws on OpenAI errors or unparseable responses — caller decides fallback. */
export async function analyzeStock(
  stockName: string,
  maxIssues = 20,
): Promise<{ issues: Issue[]; overall: OverallSignal }> {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `당신은 한국·미국 주식 시장 애널리스트입니다. 종목 "${stockName}"에 대해 web_search 도구로 최근 7일(${today} 기준) 뉴스/이슈를 조사하고, 결과를 아래 JSON 형식으로만 응답하세요. 코드 블록이나 다른 설명 없이 JSON 객체 하나만 출력합니다.

각 이슈 텍스트는 한 문장, 최대 30자 이내(공백 포함). signal은 "positive"/"neutral"/"negative", intensity는 "strong"/"mid"/"mild". neutral의 intensity는 반드시 "mid".

${LANGUAGE_RULE}

${DEDUP_RULE}

${ISSUE_ORDER_RULE}

이슈는 최대 ${maxIssues}개. 중복을 합치고 남은 의미 있는 이슈만 추리세요 (적으면 적은 대로). overall은 종목 전반의 종합 판단으로, 단순 다수결이 아니라 이슈들의 중요도와 시장 맥락을 종합한 결과여야 합니다.

응답 형식:
${STOCK_SCHEMA_HINT}

종목: ${stockName}
오늘 날짜: ${today}`;

  const response = await client.responses.create({
    model: "gpt-4o",
    tools: [{ type: "web_search" }],
    input: prompt,
  });

  const raw = extractJson(response.output_text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`GPT response for "${stockName}" was not valid JSON: ${raw.slice(0, 200)}`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`GPT response for "${stockName}" was not an object`);
  }
  const obj = parsed as Record<string, unknown>;
  const rawIssues = Array.isArray(obj.issues) ? obj.issues : [];
  const issues = sortByBucket(
    rawIssues.map(normalizeIssue).filter((x): x is Issue => x !== null),
  ).slice(0, maxIssues);
  const overall = normalizeOverall(obj.overall);
  if (!overall) {
    throw new Error(`GPT response for "${stockName}" missing valid overall`);
  }
  return { issues, overall };
}

/** Derive a portfolio-level overall by sending GPT the per-stock results.
 *  No web_search needed — this is a synthesis step. */
export async function analyzePortfolioOverall(
  label: string,
  stocks: Stock[],
): Promise<OverallSignal> {
  const summary = stocks
    .map(
      (s) =>
        `- ${s.name}: overall=${s.overall.signal}/${s.overall.intensity}, 주요 이슈: ${s.issues
          .slice(0, 3)
          .map((i) => `[${i.signal}/${i.intensity}] ${i.text}`)
          .join("; ") || "(없음)"}`,
    )
    .join("\n");

  const prompt = `다음은 "${label}"에 포함된 ${stocks.length}개 종목의 분석 결과입니다. 종목별 overall과 주요 이슈를 종합해 포트폴리오 전체에 대한 단일 종합 평가를 산출하세요. 단순 다수결이 아니라 각 종목의 가중치, 이슈의 시장 영향도, 동조성을 고려한 판단이어야 합니다.

종목별 요약:
${summary}

다음 JSON 형식으로만 응답하세요(코드 블록 없이 객체 하나만):
{ "overall": { "signal": "positive|neutral|negative", "intensity": "strong|mid|mild" } }

neutral의 intensity는 반드시 "mid".`;

  const response = await client.responses.create({
    model: "gpt-4o",
    input: prompt,
  });

  const raw = extractJson(response.output_text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`GPT overall response for "${label}" was not valid JSON: ${raw.slice(0, 200)}`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`GPT overall response for "${label}" was not an object`);
  }
  const obj = parsed as Record<string, unknown>;
  const overall = normalizeOverall(obj.overall);
  if (!overall) {
    throw new Error(`GPT overall response for "${label}" missing valid overall`);
  }
  return overall;
}
