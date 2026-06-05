// Step 5 / Phase 4: display formatters for predictions. Client-safe (pure, no
// server imports) — used by the StockModal prediction block and the fixture
// mock. Returns are fractions in, strings out.

/** Impact period chip text, e.g. {from:3,to:5} → "3~5일". */
export function formatImpactPeriod(p: { from: number; to: number }): string {
  return p.from === p.to ? `${p.from}일` : `${p.from}~${p.to}일`;
}

/** Expected-band chip text, nearest-to-zero first to match the Figma sample
 *  ("-0.4 ~ -2.6%"). Band edges are fractions (−0.026 = −2.6%). */
export function formatBandPct(band: { low: number; high: number }): string {
  const nearer = Math.abs(band.low) <= Math.abs(band.high) ? band.low : band.high;
  const farther = nearer === band.low ? band.high : band.low;
  const f = (x: number) => (x * 100).toFixed(1);
  return `${f(nearer)} ~ ${f(farther)}%`;
}
