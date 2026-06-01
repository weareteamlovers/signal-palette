// Google News RSS adapter (Step 4c-2). Keyless — works for both KR and US
// stocks by querying the Korean display name. Less structured than Naver/
// Finnhub, so it serves as a baseline + cross-market supplement.

import type { Article, AdapterContext, NewsAdapter } from "./types";

const ENDPOINT = "https://news.google.com/rss/search";
const MAX_ARTICLES = 30;

function buildUrl(query: string, recencyDays: number): string {
  // `when:Nd` restricts Google News to the last N days at query time.
  const q = encodeURIComponent(`${query} when:${recencyDays}d`);
  return `${ENDPOINT}?q=${q}&hl=ko&gl=KR&ceid=KR:ko`;
}

function unwrapCdata(s: string): string {
  const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : s;
}

function tagContent(block: string, tag: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? unwrapCdata(m[1]).trim() : undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&"); // ampersand last so the above aren't re-decoded
}

function stripTags(s: string): string {
  // Decode first: RSS descriptions carry HTML as entities (&lt;a&gt;…), so the
  // real tags only appear after decoding, then get stripped.
  return decodeEntities(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Parse a Google News RSS feed into Articles, dropping undated or stale items. */
export function parseGoogleRss(xml: string, recencyDays: number, nowMs: number): Article[] {
  const cutoff = nowMs - recencyDays * 24 * 60 * 60 * 1000;
  const out: Article[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const block = m[1];
    const pub = tagContent(block, "pubDate");
    const ms = pub ? Date.parse(pub) : NaN;
    if (Number.isNaN(ms) || ms < cutoff) continue; // need a real, recent date

    const link = tagContent(block, "link");
    if (!link) continue;

    const source = tagContent(block, "source");
    let title = decodeEntities(tagContent(block, "title") ?? "");
    // Google News titles end with " - <Publisher>"; drop that suffix.
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(source.length + 3)).trim();
    }
    if (!title) continue;

    const descRaw = tagContent(block, "description");
    const summary = descRaw ? stripTags(descRaw) : undefined;

    out.push({
      title,
      summary: summary && summary !== title ? summary : undefined,
      url: link,
      source: source ?? "Google News",
      publishedAt: new Date(ms).toISOString(),
    });
    if (out.length >= MAX_ARTICLES) break;
  }
  return out;
}

export const googleNewsAdapter: NewsAdapter = {
  id: "google-rss",
  async fetch(ctx: AdapterContext): Promise<Article[]> {
    const url = buildUrl(ctx.name, ctx.recencyDays);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SignalPalette/1.0)" },
        cache: "no-store",
      });
      if (!res.ok) return [];
      return parseGoogleRss(await res.text(), ctx.recencyDays, Date.now());
    } catch {
      return [];
    }
  },
};
