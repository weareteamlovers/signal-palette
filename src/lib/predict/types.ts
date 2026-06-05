// Step 5 / Phase 2: issue-level reaction prediction shapes. The numbers come
// from a deterministic aggregation of realized excess returns (event_outcome);
// the LLM only writes the `rationale` narrative on top of them.

export type PredictDirection = "up" | "down" | "neutral";
export type Confidence = "low" | "medium" | "high";
/** Which retrieval level produced the prediction: this stock's own history,
 *  the sector fallback, or none (too few similar labeled cases → cold start). */
export type PredictScope = "stock" | "sector" | "none";

/** Per-horizon distribution of realized sector-excess returns across the
 *  retrieved neighbors. Returns are fractions (−0.025 = −2.5%). */
export interface HorizonStat {
  tradingDays: number; // 1 | 3 | 5
  n: number;
  median: number;
  p25: number;
  p75: number;
  posRate: number; // fraction of neighbors with excess return > 0
}

export interface IssuePrediction {
  stockName: string;
  issueText: string;
  scope: PredictScope;
  sampleSize: number;
  direction: PredictDirection;
  /** Expected magnitude band (p25–p75) at the primary horizon, or null when
   *  neutral / cold start. Fractions; the UI formats as %. */
  band: { low: number; high: number } | null;
  /** Trading-day horizon where the effect is largest. */
  primaryHorizon: number;
  /** Contiguous horizons where the effect is material and matches `direction`,
   *  e.g. {from:3,to:5}. null when neutral / cold start. */
  impactPeriod: { from: number; to: number } | null;
  confidence: Confidence;
  horizons: HorizonStat[];
  rationale: string;
}

// ── Phase 3: stock-level aggregate prediction ───────────────────────────────

/** One issue's contribution to the stock prediction (for transparency/UI). */
export interface IssuePredictionSummary {
  issueText: string;
  importance?: number;
  scope: PredictScope;
  direction: PredictDirection;
  band: { low: number; high: number } | null;
  confidence: Confidence;
  sampleSize: number;
}

/** Blended stock-level distribution at one horizon. `center` is the
 *  confidence×importance-weighted mean tilt; [low,high] widens with
 *  within-case uncertainty AND cross-issue disagreement. */
export interface StockHorizon {
  tradingDays: number;
  center: number;
  low: number;
  high: number;
}

export interface StockPrediction {
  stockName: string;
  direction: PredictDirection;
  band: { low: number; high: number } | null;
  primaryHorizon: number;
  impactPeriod: { from: number; to: number } | null;
  confidence: Confidence;
  horizons: StockHorizon[];
  totalIssues: number;
  /** Issues that produced a usable (non-cold) prediction and fed the blend. */
  contributingIssues: number;
  rationale: string;
  issues: IssuePredictionSummary[];
}
