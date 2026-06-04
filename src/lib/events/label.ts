// Step 5 / Phase 1: turn aged events into realized reactions. For each event
// whose t0 is old enough that 5 forward trading days exist, fetch the stock +
// benchmark daily candles (Phase 0 price layer) and compute forward and
// sector-excess (abnormal) returns at 1/3/5 trading days, then write
// event_outcome. Self-correcting: if the 5-day window isn't fully available yet
// (too recent / missing data), the event is left unlabeled and retried later.

import { excessReturn, fetchDailyCandles, forwardReturn } from "@/lib/prices";
import {
  insertOutcomes,
  selectDueEvents,
  type OutcomeRow,
} from "@/lib/supabase/events";

// Wait this long (calendar) before attempting a label — ~5 trading days plus a
// weekend of slack. forwardReturn still guards exact data availability.
const LABEL_MIN_AGE_MS = 9 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function labelDueEvents(
  limit: number,
): Promise<{ labeled: number; skipped: number }> {
  const due = await selectDueEvents(LABEL_MIN_AGE_MS, limit);
  if (due.length === 0) return { labeled: 0, skipped: 0 };

  const outcomes: OutcomeRow[] = [];
  for (const ev of due) {
    const t0 = Date.parse(ev.t0);
    if (Number.isNaN(t0)) continue;
    const from = t0 - 6 * DAY_MS;
    const to = t0 + 21 * DAY_MS; // ~3 weeks ⊇ 5 trading days forward
    const [stock, bench] = await Promise.all([
      fetchDailyCandles(ev.symbol, from, to),
      fetchDailyCandles(ev.benchmark, from, to),
    ]);
    const ab5 = excessReturn(stock, bench, t0, 5);
    if (ab5 === null) continue; // not enough forward data yet — retry later
    outcomes.push({
      event_id: ev.id,
      benchmark: ev.benchmark,
      ret_1d: forwardReturn(stock, t0, 1),
      ret_3d: forwardReturn(stock, t0, 3),
      ret_5d: forwardReturn(stock, t0, 5),
      abret_1d: excessReturn(stock, bench, t0, 1),
      abret_3d: excessReturn(stock, bench, t0, 3),
      abret_5d: ab5,
    });
  }

  await insertOutcomes(outcomes);
  return { labeled: outcomes.length, skipped: due.length - outcomes.length };
}
