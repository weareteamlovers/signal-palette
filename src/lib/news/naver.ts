// Naver 뉴스 검색 adapter (Step 4c-2). Primary KR source. Queries by the
// Korean display name. Requires NAVER_CLIENT_ID / NAVER_CLIENT_SECRET; returns
// [] when unconfigured so the router just falls back to Google RSS.

import { hostname, stripTags } from "./html";
import type { Article, AdapterContext, NewsAdapter } from "./types";

const ENDPOINT = "https://openapi.naver.com/v1/search/news.json";
const DISPLAY = 30;

interface NaverItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string; // RFC 1123, e.g. "Mon, 26 May 2026 14:30:00 +0900"
}

/** Parse a Naver search response into recent Articles. Exported for unit tests. */
export function parseNaver(
  body: { items?: NaverItem[] },
  recencyDays: number,
  nowMs: number,
): Article[] {
  const cutoff = nowMs - recencyDays * 24 * 60 * 60 * 1000;
  const out: Article[] = [];
  for (const it of body.items ?? []) {
    const ms = Date.parse(it.pubDate);
    if (Number.isNaN(ms) || ms < cutoff) continue; // need a real, recent date

    const url = it.originallink || it.link;
    if (!url) continue;
    const title = stripTags(it.title ?? "");
    if (!title) continue;
    const summary = it.description ? stripTags(it.description) : undefined;

    out.push({
      title,
      summary: summary && summary !== title ? summary : undefined,
      url,
      // Naver doesn't name the press outlet; use the article's hostname.
      source: hostname(url) ?? "네이버뉴스",
      publishedAt: new Date(ms).toISOString(),
    });
  }
  return out;
}

export const naverAdapter: NewsAdapter = {
  id: "naver",
  async fetch(ctx: AdapterContext): Promise<Article[]> {
    const id = process.env.NAVER_CLIENT_ID;
    const secret = process.env.NAVER_CLIENT_SECRET;
    if (!id || !secret) return [];

    const url = `${ENDPOINT}?query=${encodeURIComponent(ctx.name)}&display=${DISPLAY}&sort=date`;
    try {
      const res = await fetch(url, {
        headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
        cache: "no-store",
      });
      if (!res.ok) return [];
      const body = (await res.json()) as { items?: NaverItem[] };
      return parseNaver(body, ctx.recencyDays, Date.now());
    } catch {
      return [];
    }
  },
};
