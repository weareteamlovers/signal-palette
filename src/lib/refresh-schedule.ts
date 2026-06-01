// ════════════════════════════════════════════════════════════════════════
//  REFRESH CADENCE — the one place to change how often analysis refreshes.
//  Edit this block and push (Vercel auto-redeploys). The Vercel cron ticks
//  every 5 min (vercel.json); this policy decides how *fresh* each stock must
//  be on a given tick, so the effective cadence lives here — not in cron.
//
//  Why code (not a cron expression)? Market-hours windows, weekends, holidays,
//  and DST can't be expressed in a single cron line. The 5-min tick is just a
//  heartbeat; this file is the real knob.
// ════════════════════════════════════════════════════════════════════════

/** "test" → refresh at most every `testIntervalMin`, ignoring market hours.
 *  "live" → market-aware: active window = `activeIntervalMin`, else `idleIntervalMin`.
 *  Default "test". Flip to "live" after deploy, or set env REFRESH_MODE=live
 *  in Vercel to switch without a code edit. */
export const REFRESH_MODE: "test" | "live" =
  process.env.REFRESH_MODE === "live" ? "live" : "test";

export const SCHEDULE = {
  /** Pre-market −1h ~ after-hours close (see MARKETS): refresh this often. */
  activeIntervalMin: 5,
  /** Outside market hours, weekends, holidays. */
  idleIntervalMin: 30,
  /** Test mode: refresh at most this often (default = every 2 days). */
  testIntervalMin: 2 * 24 * 60,
  /** Max stocks refreshed per cron tick (keep small for the function timeout). */
  batchSize: 5,
};

/** "Active" trading window per market, in that market's LOCAL time (minutes
 *  from midnight). DST is handled automatically via the IANA timeZone. The
 *  overall active window is the UNION of these. Edit the hours to taste.
 *   - US: pre-market opens 04:00 ET → −1h = 03:00; after-hours close = 20:00 ET
 *   - KR: pre-market call ~08:30 KST → −1h = 07:30; after-hours close ~18:00 KST */
const MARKETS: ReadonlyArray<{ tz: string; startMin: number; endMin: number }> = [
  { tz: "America/New_York", startMin: 3 * 60, endMin: 20 * 60 },
  { tz: "Asia/Seoul", startMin: 7 * 60 + 30, endMin: 18 * 60 },
];

/** Market holidays as local YYYY-MM-DD per timezone. On a listed date that
 *  market is treated as closed (idle cadence). A missing entry just means the
 *  market stays at active cadence that day — harmless, so maintain as needed. */
const HOLIDAYS: Record<string, ReadonlySet<string>> = {
  "America/New_York": new Set([
    // "2026-01-01", "2026-07-03", "2026-12-25", ...
  ]),
  "Asia/Seoul": new Set([
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

function marketActive(now: Date, m: (typeof MARKETS)[number]): boolean {
  const { weekday, minutes, ymd } = localParts(now, m.tz);
  if (weekday === "Sat" || weekday === "Sun") return false;
  if (HOLIDAYS[m.tz]?.has(ymd)) return false;
  return minutes >= m.startMin && minutes <= m.endMin;
}

/** True if any market is in its active window right now. */
export function isActiveWindow(now: Date = new Date()): boolean {
  return MARKETS.some((m) => marketActive(now, m));
}

/** Required freshness (ms) for this tick: stocks cached longer ago than this
 *  are eligible for refresh. */
export function desiredIntervalMs(now: Date = new Date()): number {
  const min =
    REFRESH_MODE === "test"
      ? SCHEDULE.testIntervalMin
      : isActiveWindow(now)
        ? SCHEDULE.activeIntervalMin
        : SCHEDULE.idleIntervalMin;
  return min * 60 * 1000;
}
