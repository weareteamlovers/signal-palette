// Small HTML/text helpers shared by the news adapters (Step 4c). Naver returns
// JSON whose title/description carry HTML (<b> highlights + entities); Google
// RSS descriptions are entity-encoded HTML. Both need decode + tag-strip.

export function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&"); // ampersand last so the above aren't re-decoded
}

/** Decode entities first (RSS/Naver carry HTML as entities), then strip the
 *  real tags and collapse whitespace. */
export function stripTags(s: string): string {
  return decodeEntities(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Publisher hostname from a URL, e.g. "https://www.hankyung.com/x" → "hankyung.com".
 *  Used as a source label when an API doesn't name the press outlet. */
export function hostname(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}
