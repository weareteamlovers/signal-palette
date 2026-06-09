// Step 5 / Phase 4: display formatters for predictions. Client-safe (pure, no
// server imports) — used by the StockModal prediction block and the fixture
// mock. Returns are fractions in, strings out.

/** Impact period chip text, e.g. {from:3,to:5} → "3~5일". */
export function formatImpactPeriod(p: { from: number; to: number }): string {
  return p.from === p.to ? `${p.from}일` : `${p.from}~${p.to}일`;
}

/** Expected-band chip text. Band edges are fractions (−0.026 = −2.6%).
 *  Every value carries % and an explicit sign (+ for up, − for down).
 *  - Same-sign band: nearest-to-zero first ("-0.4% ~ -2.6%", "+0.4% ~ +2.6%").
 *  - Mixed-sign band (low < 0 < high): negative first, positive last
 *    ("-6.4% ~ +2.2%"). */
export function formatBandPct(band: { low: number; high: number }): string {
  const f = (x: number) => `${x > 0 ? "+" : ""}${(x * 100).toFixed(1)}`;
  if (band.low < 0 && band.high > 0) {
    return `${f(band.low)}% ~ ${f(band.high)}%`;
  }
  const nearer = Math.abs(band.low) <= Math.abs(band.high) ? band.low : band.high;
  const farther = nearer === band.low ? band.high : band.low;
  return `${f(nearer)}% ~ ${f(farther)}%`;
}
