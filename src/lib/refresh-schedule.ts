// ════════════════════════════════════════════════════════════════════════
//  REFRESH CADENCE — the one place to change how often analysis refreshes.
//  Edit this block and push (Vercel auto-redeploys). The Vercel cron ticks
//  every 5 min (vercel.json); this policy decides how *fresh* each stock must
//  be on a given tick, so the effective cadence lives here — not in cron.
//
//  PER-MARKET: a stock refreshes at `activeIntervalMin` only while ITS OWN
//  market is open, else `idleIntervalMin`. So during Korean hours only KR
//  stocks go fast (US slow), and vice-versa during US hours — cheaper than
//  refreshing everything fast all weekday.
// ════════════════════════════════════════════════════════════════════════

import type { Market } from "@/data/stock-catalog";

/** "test" → refresh at most every `testIntervalMin`, ignoring market hours.
 *  "live" → market-aware (per stock's market). Default "test". Flip to "live"
 *  after deploy, or set env REFRESH_MODE=live in Vercel to switch w/o a code edit. */
export const REFRESH_MODE: "test" | "live" =
  process.env.REFRESH_MODE === "live" ? "live" : "test";

export const SCHEDULE = {
  /** While the stock's market is open (pre-market −1h ~ after-hours close). */
  activeIntervalMin: 5,
  /** While the stock's market is closed (and weekends/holidays). */
  idleIntervalMin: 30,
  /** Test mode: refresh at most this often (default = every 2 days). */
  testIntervalMin: 2 * 24 * 60,
  /** Max stocks refreshed per cron tick (keep small for the function timeout). */
  batchSize: 5,
};

/** Each market's "active" window in LOCAL time (minutes from midnight). DST is
 *  handled automatically via the IANA timeZone. Edit the hours to taste.
 *   - US: pre-market opens 04:00 ET → −1h = 03:00; after-hours close = 20:00 ET
 *   - KR: pre-market call ~08:30 KST → −1h = 07:30; after-hours close ~18:00 KST */
const MARKET_WINDOWS: Record<Market, { tz: string; startMin: number; endMin: number }> = {
  US: { tz: "America/New_York", startMin: 3 * 60, endMin: 20 * 60 },
  KR: { tz: "Asia/Seoul", startMin: 7 * 60 + 30, endMin: 18 * 60 },
};

/** Market holidays as local YYYY-MM-DD. On a listed date that market is treated
 *  as closed (idle cadence). A missing entry just keeps that market on active
 *  cadence — harmless, so maintain as needed. */
const HOLIDAYS: Record<Market, ReadonlySet<string>> = {
  US: new Set([
    // "2026-01-01", "2026-07-03", "2026-12-25", ...
  ]),
  KR: new Set([
    // "2026-01-01", ...
  ]),
};

function localParts(now: Date, tz: string): { weekday: string; minutes: number; ymd: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0; // some runtimes emit "24" for midnight
  const minutes = hour * 60 + Number(get("minute"));
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  return { weekday: get("weekday"), minutes, ymd };
}

/** True if `market` is in its active trading window right now. */
export function marketActiveNow(market: Market, now: Date = new Date()): boolean {
  const w = MARKET_WINDOWS[market];
  const { weekday, minutes, ymd } = localParts(now, w.tz);
  if (weekday === "Sat" || weekday === "Sun") return false;
  if (HOLIDAYS[market].has(ymd)) return false;
  return minutes >= w.startMin && minutes <= w.endMin;
}

/** Required freshness (ms) for a stock in `market` on this tick: cached longer
 *  ago than this → eligible for refresh. */
export function desiredIntervalMsFor(market: Market, now: Date = new Date()): number {
  const min =
    REFRESH_MODE === "test"
      ? SCHEDULE.testIntervalMin
      : marketActiveNow(market, now)
        ? SCHEDULE.activeIntervalMin
        : SCHEDULE.idleIntervalMin;
  return min * 60 * 1000;
}

/** Markets currently in their active window (for logging/response). */
export function activeMarkets(now: Date = new Date()): Market[] {
  return (Object.keys(MARKET_WINDOWS) as Market[]).filter((m) => marketActiveNow(m, now));
}
