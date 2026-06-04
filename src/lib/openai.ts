// Server-only OpenAI helpers. Do NOT import from a client component — this
// file uses process.env.OPENAI_API_KEY and instantiates the OpenAI SDK,
// which must never reach the browser bundle.

import OpenAI from "openai";
import type { Article } from "@/lib/news/types";
import { stockOverallFromIssues } from "@/lib/overall";
import type { Intensity, Issue, OverallSignal, Signal } from "@/types";

const client = new OpenAI();

const ISSUE_ORDER_RULE = `이슈 배열은 반드시 다음 순서로 정렬하세요. 어떤 경우에도 이 순서를 어기지 마세요:
1) signal="positive", intensity="strong"
2) signal="positive", intensity="mid"
3) signal="positive", intensity="mild"
4) signal="neutral" (intensity는 항상 "mid")
5) signal="negative", intensity="mild"
6) signal="negative", intensity="mid"
7) signal="negative", intensity="strong"

같은 (signal, intensity) 안에서는 중요도가 높은 순서로 정렬하세요.

중요: 이 순서는 **실제로 존재하는 이슈에만** 적용합니다. 7개 칸을 채우려고 없는 이슈를 지어내거나, 이슈의 signal/intensity 를 실제 내용과 다르게 왜곡하지 마세요. 예: 주가 급등·상승·목표가 상향 같은 호재를 negative 로 분류하면 안 됩니다. 부정 이슈가 없으면 만들지 말고, 뉴스가 전부 긍정이면 전부 positive 로 분류하세요. 각 이슈의 색은 그 이슈 내용에 충실해야 합니다.`;

const LANGUAGE_RULE = `이슈 텍스트는 반드시 자연스러운 한국어로 작성하세요. 영문 기사를 참고했더라도 한국어로 요약/번역해서 옮기세요. 회사·제품 고유명사와 보편 약어(AI, CEO, ESG, TSMC 등)를 제외하고는 영어 단어·구를 쓰지 마세요 — 예: "Hematology"→"혈액학", "pipeline"→"파이프라인", "Eli Lilly"→"일라이 릴리", "guidance"→"가이던스". 문장 전체가 영문이거나 영문 어순이면 안 됩니다.`;

const DEDUP_RULE = `같은 사건의 여러 측면을 별개 이슈로 나열하지 마세요. 한 사건은 정확히 한 줄로만 표현하세요.
나쁜 예 (같은 노조 파업 사건을 3줄로 쪼갠 경우):
  - "노조와 대화 결렬로 파업 위기"
  - "반도체 생산 줄이며 긴장 고조"
  - "정부 총리 긴급 대응중"
좋은 예 (한 줄로 통합):
  - "노조 파업 위기, 생산·정부 대응 영향"

서로 다른 사건만 별개 이슈로 다루세요. 비슷한 주제·동일 원인의 이슈는 반드시 합치세요.
절대 동일하거나 매우 유사한 문장을 두 개 이상 출력하지 마세요. 같은 기사·같은 사건은 단 하나의 이슈로만 표현합니다.`;

/** Recency window for stock issues. Anything older is dropped server-side
 *  (when the issue carries a parseable date) regardless of what GPT returns.
 *  Exported so the news adapters query the same window. */
export const RECENCY_DAYS = 7;

/** Step 4d: how long an accumulated issue stays in the store before it ages
 *  out, even if the 20 slots aren't full. Caps staleness of small-cap cards. */
const ISSUE_RETENTION_DAYS = 21;

const RECENCY_RULE = `오직 최근 ${RECENCY_DAYS}일 이내에 보도된 이슈만 포함하세요. 그보다 오래된 기사나 이슈는 절대 포함하지 마세요. 각 이슈의 createdAt 도 반드시 이 기간 안이어야 합니다.`;

const RESOLVED_RULE = `이미 해소되었거나 종결된 이슈는 제외하세요. 예: 타결된 협상, 종료된 파업, 마무리된 소송, 철회된 규제, 이미 주가에 충분히 반영되어 더 이상 영향이 없는 사건. 현재 진행 중이거나 앞으로 주가에 영향을 줄 수 있는, 살아있는 이슈만 남기세요.`;

const SOURCE_QUALITY_RULE = `반드시 공신력 있는 증시·경제 뉴스만 근거로 삼으세요(주요 경제지, 통신사, 증권사 리포트 등). 광고, 여행·쇼핑·홍보성 글, 개인 블로그, 출처가 불분명한 글은 절대 사용하지 마세요. 해당 종목(회사)의 실적·사업·주가·시장과 직접 관련된 이슈만 포함하고, 회사명이 우연히 겹칠 뿐 무관한 내용(여행 상품, 동명이인 등)은 반드시 제외하세요.`;

const SUMMARY_RULE = `기사 제목(헤드라인)을 그대로 옮기지 마세요. 기사 본문을 이해한 뒤 핵심을 함축한 한국어 요약 문장으로 새로 작성하세요.`;

const FIELD_RULE = `각 이슈에는 아래 메타데이터를 함께 넣으세요:
- "importance": 1부터 시작하는 정수 중요도 순위(1 = 가장 중요). 같은 응답 안에서 숫자를 중복하지 말고 1, 2, 3, … 으로 유일하게 매기세요.
- "createdAt": 이 이슈의 근거가 된 대표 기사 1개를 정하고, 그 기사의 보도 시각을 ISO 8601 UTC 로 적으세요(예: "2026-05-30T07:30:00Z"). 여러 기사를 참고했더라도 가장 대표적인 기사 하나의 날짜를 사용합니다. 정확한 시각을 모르면 그 기사 보도 날짜의 12:00Z 로 표기하세요. 신뢰할 수 있는 날짜를 정말 찾을 수 없을 때만 생략합니다.
- "source": 위에서 고른 대표 기사의 출처. { "name": "매체명", "url": "기사 URL" } 형식. URL 을 모르면 url 은 빼고 name 만 넣으세요.`;

const STOCK_SCHEMA_HINT = `{
  "issues": [
    {
      "text": "한 문장 30자 이내",
      "signal": "positive|neutral|negative",
      "intensity": "strong|mid|mild",
      "importance": 1,
      "createdAt": "2026-05-30T07:30:00Z",
      "source": { "name": "출처 매체명", "url": "기사 URL" }
    }
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

/** Step 4b: keep createdAt only if it parses to a real date; re-emit as a
 *  canonical ISO 8601 UTC string. GPT sometimes returns junk dates. */
function normalizeCreatedAt(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return undefined;
  return new Date(ms).toISOString();
}

/** Step 4b: source must at least carry a non-empty name; url is optional. */
function normalizeSource(raw: unknown): Issue["source"] {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.name !== "string" || o.name.trim() === "") return undefined;
  const source: { name: string; url?: string } = { name: o.name.trim() };
  if (typeof o.url === "string" && o.url.trim() !== "") source.url = o.url.trim();
  return source;
}

function normalizeIssue(raw: unknown): Issue | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.text !== "string" || !isSignal(o.signal) || !isIntensity(o.intensity)) {
    return null;
  }
  // Neutral always renders with the single mid shade — coerce defensively.
  const intensity = o.signal === "neutral" ? "mid" : o.intensity;
  const issue: Issue = { text: o.text.trim(), signal: o.signal, intensity };
  // Step 4b: optional metadata. importance keeps GPT's raw value here;
  // assignUniqueImportance() re-ranks it to a unique 1..N afterward.
  const createdAt = normalizeCreatedAt(o.createdAt);
  if (createdAt) issue.createdAt = createdAt;
  const source = normalizeSource(o.source);
  if (source) issue.source = source;
  if (typeof o.importance === "number" && Number.isFinite(o.importance)) {
    issue.importance = o.importance;
  }
  return issue;
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

/** Step 4b: rewrite each issue's importance to a unique 1..N rank (1 = most
 *  important). GPT frequently repeats or skips numbers, so we re-rank by its
 *  raw importance (ascending; missing → last), breaking ties by array order,
 *  then number 1..N. Mutates the issues in place; their array order is left
 *  untouched — the 7-bucket display sort is independent. */
function assignUniqueImportance(issues: Issue[]): void {
  issues
    .map((issue, idx) => ({
      issue,
      idx,
      raw:
        typeof issue.importance === "number"
          ? issue.importance
          : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => a.raw - b.raw || a.idx - b.idx)
    .forEach((entry, rank) => {
      entry.issue.importance = rank + 1;
    });
}

/** Normalize issue text for duplicate comparison — lowercase, strip all
 *  whitespace and punctuation/symbols so "주가 6.6% 하락" and "주가 6.6%하락."
 *  collapse to the same key. */
function normText(s: string): string {
  return s.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function charBigrams(s: string): Set<string> {
  const set = new Set<string>();
  if (s.length <= 1) {
    if (s) set.add(s);
    return set;
  }
  for (let i = 0; i < s.length - 1; i += 1) set.add(s.slice(i, i + 2));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return a.size === b.size ? 1 : 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** Near-duplicate text similarity threshold (char-bigram Jaccard). */
const DUP_SIMILARITY = 0.6;

/** Collapse duplicate / near-duplicate issues. GPT frequently restates the
 *  same event as several issues despite the dedup prompt rule, so we enforce
 *  it on the server: identical normalized text, identical source URL, or
 *  bigram similarity ≥ DUP_SIMILARITY all count as a duplicate. The first
 *  occurrence wins (GPT lists the most prominent framing first). */
function dedupeIssues(issues: Issue[]): Issue[] {
  const kept: Array<{ grams: Set<string> }> = [];
  const seenText = new Set<string>();
  const seenUrl = new Set<string>();
  const out: Issue[] = [];
  for (const issue of issues) {
    const key = normText(issue.text);
    const url = issue.source?.url;
    if (key && seenText.has(key)) continue;
    if (url && seenUrl.has(url)) continue;
    const grams = charBigrams(key);
    if (kept.some((k) => jaccard(grams, k.grams) >= DUP_SIMILARITY)) continue;
    kept.push({ grams });
    out.push(issue);
    if (key) seenText.add(key);
    if (url) seenUrl.add(url);
  }
  return out;
}

/** Drop issues whose (parseable) createdAt is clearly older than the recency
 *  window. Undated or unparseable-date issues are kept — we can't judge them,
 *  and GPT often omits the date for genuinely recent items. The 1-day grace
 *  absorbs timezone rounding. */
function filterRecent(issues: Issue[], nowMs: number, days: number = RECENCY_DAYS + 1): Issue[] {
  const cutoff = nowMs - days * 24 * 60 * 60 * 1000;
  return issues.filter((i) => {
    if (!i.createdAt) return true;
    const ms = Date.parse(i.createdAt);
    if (Number.isNaN(ms)) return true;
    return ms >= cutoff;
  });
}

/** Parse GPT's text output into a JSON object (stripping ``` fences). */
function parseGptObject(text: string, label: string): Record<string, unknown> {
  const raw = extractJson(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`GPT response for "${label}" was not valid JSON: ${raw.slice(0, 200)}`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`GPT response for "${label}" was not an object`);
  }
  return parsed as Record<string, unknown>;
}

/** Shared post-processing for both the web_search and news-adapter paths:
 *  normalize → recency filter → dedupe → 7-bucket sort → slice → unique
 *  importance, plus the stock overall. */
function finalizeStockResult(
  obj: Record<string, unknown>,
  maxIssues: number,
  nowMs: number,
): { issues: Issue[]; overall: OverallSignal } {
  const rawIssues = Array.isArray(obj.issues) ? obj.issues : [];
  const normalized = rawIssues
    .map(normalizeIssue)
    .filter((x): x is Issue => x !== null);
  // Server-side safety nets — the prompt rules aren't always honored:
  //   1) drop issues older than the recency window (when dated)
  //   2) collapse duplicate / near-duplicate issues
  const recent = filterRecent(normalized, nowMs);
  const deduped = dedupeIssues(recent);
  const issues = sortByBucket(deduped).slice(0, maxIssues);
  // Re-rank importance over the kept set so it's a unique 1..N (Step 4b).
  assignUniqueImportance(issues);
  // Overall is derived from the issues, not GPT (Step 4d) — consistent with
  // the accumulating store where GPT only ever classifies the newest batch.
  return { issues, overall: stockOverallFromIssues(issues) };
}

/** Analyze a single stock: web_search the last 7 days of KR/US market news,
 *  then return up to `maxIssues` sorted issues and a stock-level overall.
 *  maxIssues = 20 on desktop/tablet (10×2 grid) and 10 on mobile (5×2 grid).
 *  Throws on OpenAI errors or unparseable responses — caller decides fallback. */
export async function analyzeStock(
  stockName: string,
  maxIssues = 20,
): Promise<{ issues: Issue[]; overall: OverallSignal }> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - RECENCY_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const prompt = `당신은 한국·미국 주식 시장 애널리스트입니다. 종목 "${stockName}"에 대해 web_search 도구로 최근 ${RECENCY_DAYS}일(${sevenDaysAgo} ~ ${today}) 뉴스/이슈를 조사하고, 결과를 아래 JSON 형식으로만 응답하세요. 코드 블록이나 다른 설명 없이 JSON 객체 하나만 출력합니다.

각 이슈 텍스트는 한 문장, 최대 30자 이내(공백 포함). signal은 "positive"/"neutral"/"negative", intensity는 "strong"/"mid"/"mild". neutral의 intensity는 반드시 "mid".

${SOURCE_QUALITY_RULE}

${SUMMARY_RULE}

${FIELD_RULE}

${LANGUAGE_RULE}

${DEDUP_RULE}

${RECENCY_RULE}

${RESOLVED_RULE}

${ISSUE_ORDER_RULE}

이슈는 최대 ${maxIssues}개. 중복을 합치고 남은 의미 있는 이슈만 추리세요 (적으면 적은 대로). overall은 종목 전반의 종합 판단으로, 단순 다수결이 아니라 이슈들의 중요도와 시장 맥락을 종합한 결과여야 합니다.

응답 형식:
${STOCK_SCHEMA_HINT}

종목: ${stockName}
오늘 날짜: ${today}`;

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    tools: [{ type: "web_search" }],
    input: prompt,
  });

  const obj = parseGptObject(response.output_text, stockName);
  return finalizeStockResult(obj, maxIssues, now.getTime());
}

/** Classify a pre-fetched list of real articles into issues (Step 4c). No
 *  web_search — GPT may use ONLY the supplied articles, so createdAt/source
 *  come from real article metadata (no hallucinated dates/outlets). An empty
 *  article list yields empty issues + a neutral overall (honest "no recent
 *  news" rather than fake mock data). Throws on unparseable GPT output. */
export async function classifyArticles(
  stockName: string,
  articles: Article[],
  maxIssues = 20,
): Promise<{ issues: Issue[]; overall: OverallSignal }> {
  if (articles.length === 0) {
    return { issues: [], overall: { signal: "neutral", intensity: "mid" } };
  }

  const now = new Date();
  const list = articles
    .slice(0, 25)
    .map((a, i) => {
      const summary = a.summary ? ` — ${a.summary.slice(0, 160)}` : "";
      return `${i + 1}. (${a.publishedAt.slice(0, 10)}) [${a.source}] ${a.title}${summary}\n   createdAt: ${a.publishedAt}\n   url: ${a.url}`;
    })
    .join("\n");

  const prompt = `당신은 한국·미국 주식 시장 애널리스트입니다. 아래는 종목 "${stockName}"에 대해 수집된 최근 뉴스 기사 목록입니다. **오직 이 기사들만 근거로** 이슈를 도출하세요. 목록에 없는 내용·외부 지식·추측은 절대 쓰지 마세요. 코드 블록 없이 JSON 객체 하나만 출력합니다.

각 이슈 텍스트는 한 문장, 최대 30자 이내(공백 포함). signal은 "positive"/"neutral"/"negative", intensity는 "strong"/"mid"/"mild". neutral의 intensity는 반드시 "mid".

${SOURCE_QUALITY_RULE}

${SUMMARY_RULE}

각 이슈의 "createdAt" 과 "source" 는 그 이슈의 근거가 된 기사 값을 **그대로** 사용하세요 (목록의 createdAt / [출처] / url). 지어내지 마세요.

${FIELD_RULE}

${LANGUAGE_RULE}

${DEDUP_RULE}

${RESOLVED_RULE}

${ISSUE_ORDER_RULE}

이슈는 최대 ${maxIssues}개. 서로 다른 사건만 남기고, 종목과 무관한 기사는 버리세요. overall은 종목 전반의 종합 판단(단순 다수결 아님)입니다.

기사 목록:
${list}

응답 형식:
${STOCK_SCHEMA_HINT}`;

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
  });

  const obj = parseGptObject(response.output_text, stockName);
  return finalizeStockResult(obj, maxIssues, now.getTime());
}

/** Refresh-path classify with accumulation (Step 4d). Given the stock's
 *  currently-stored issues, GPT extracts NEW issues from the articles (without
 *  repeating stored ones) and flags stored issues that are now resolved. The
 *  server then merges: drop resolved (v2) + dedupe + 21-day retention (v1) +
 *  keep the 20 most recent, then re-rank importance and recompute the overall.
 *  No articles → just age/retain the existing set (no GPT call). */
export async function classifyAndMerge(
  stockName: string,
  articles: Article[],
  existing: Issue[],
  maxIssues = 20,
): Promise<{ issues: Issue[]; overall: OverallSignal }> {
  const now = new Date();
  let kept = existing;
  let fresh: Issue[] = [];

  if (articles.length > 0) {
    const existingList =
      existing
        .map((it, i) => `${i + 1}. (${(it.createdAt ?? "?").slice(0, 10)}) ${it.text}`)
        .join("\n") || "(없음)";
    const articleList = articles
      .slice(0, 25)
      .map((a, i) => {
        const summary = a.summary ? ` — ${a.summary.slice(0, 160)}` : "";
        return `${i + 1}. (${a.publishedAt.slice(0, 10)}) [${a.source}] ${a.title}${summary}\n   createdAt: ${a.publishedAt}\n   url: ${a.url}`;
      })
      .join("\n");

    const prompt = `당신은 한국·미국 주식 시장 애널리스트입니다. 종목 "${stockName}"의 [현재 저장된 이슈]와 [최근 기사 목록]이 주어집니다. 코드 블록 없이 JSON 객체 하나만 출력하세요.

해야 할 일:
1) [최근 기사]에서 **새 이슈**만 도출하세요. [현재 저장된 이슈]와 같은 사건은 다시 만들지 마세요(중복 금지).
2) [현재 저장된 이슈] 중 이미 **해소·종결되어 더 이상 유효하지 않은** 것의 번호를 "resolvedExisting" 에 넣으세요(없으면 빈 배열).

새 이슈는 오직 기사 내용만 근거로 합니다. 각 이슈 텍스트는 한 문장, 최대 30자 이내(공백 포함). signal/intensity/importance/createdAt/source 를 포함하고, createdAt·source 는 근거 기사 값을 그대로 쓰세요.

${SOURCE_QUALITY_RULE}

${SUMMARY_RULE}

${FIELD_RULE}

${LANGUAGE_RULE}

${DEDUP_RULE}

${RESOLVED_RULE}

${ISSUE_ORDER_RULE}

[현재 저장된 이슈]
${existingList}

[최근 기사 목록]
${articleList}

응답 형식(코드 블록 없이 객체 하나):
{ "issues": [ { "text": "한 문장 30자 이내", "signal": "positive|neutral|negative", "intensity": "strong|mid|mild", "importance": 1, "createdAt": "2026-05-30T07:30:00Z", "source": { "name": "매체명", "url": "기사 URL" } } ], "resolvedExisting": [번호] }`;

    const response = await client.responses.create({ model: "gpt-4o-mini", input: prompt });
    const obj = parseGptObject(response.output_text, stockName);

    const rawIssues = Array.isArray(obj.issues) ? obj.issues : [];
    fresh = filterRecent(
      rawIssues.map(normalizeIssue).filter((x): x is Issue => x !== null),
      now.getTime(),
    );

    const resolvedRaw = Array.isArray(obj.resolvedExisting) ? obj.resolvedExisting : [];
    const resolvedIdx = new Set(
      resolvedRaw
        .map((n) => (typeof n === "number" ? n - 1 : Number.NaN))
        .filter((n) => Number.isInteger(n)),
    );
    kept = existing.filter((_, i) => !resolvedIdx.has(i));
  }

  // Merge: existing wins over fresh duplicates (preserves original metadata),
  // drop anything older than the retention window, keep the 20 most recent.
  const merged = dedupeIssues([...kept, ...fresh]);
  const retained = filterRecent(merged, now.getTime(), ISSUE_RETENTION_DAYS);
  retained.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const issues = sortByBucket(retained.slice(0, maxIssues));
  assignUniqueImportance(issues);

  return { issues, overall: stockOverallFromIssues(issues) };
}

// Portfolio overall is no longer derived by GPT — it's computed client-side
// from the per-stock overalls (src/lib/overall.ts, Step 4c-9).

/** Step 5: embed issue texts for the event store (Phase 1) and similarity
 *  retrieval (Phase 2). text-embedding-3-small (1536-dim, matches the
 *  event_log vector column) — cheap and multilingual (handles Korean). */
const EMBED_MODEL = "text-embedding-3-small";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await client.embeddings.create({ model: EMBED_MODEL, input: texts });
  return res.data.map((d) => d.embedding as number[]);
}
