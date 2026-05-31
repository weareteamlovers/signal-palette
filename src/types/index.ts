export type Signal = "positive" | "neutral" | "negative";

export type Intensity = "strong" | "mid" | "mild";

export interface Issue {
  // GPT returns a single sentence summary, max ~30 chars.
  text: string;
  signal: Signal;
  /** Strength of the signal — neutral always uses "mid". */
  intensity: Intensity;
  /** ISO 8601 UTC timestamp of when the issue/article was reported. Added to
   *  the GPT response in Step 4b (server-validated/normalized; dropped if
   *  unparseable). Also present in fixture mode (mock values). Used by the
   *  stock detail modal to render KST timestamps. May be absent when GPT
   *  omits a usable date. */
  createdAt?: string;
  /** Unique importance rank within a stock's issue list — 1 = most important
   *  (Step 4b). The server re-ranks GPT's raw values to guarantee uniqueness.
   *  Reserved for Step 4d (mobile Top-10 / pop scoring); not used by the
   *  card-grid or modal sort yet. */
  importance?: number;
  /** News source backing the issue (Step 4b). Data only — not rendered yet;
   *  real source display lands with the Step 4c news adapters. */
  source?: { name: string; url?: string };
}

/** Issues come back in this fixed order from GPT and are rendered as-is:
 *  positive(strong → mid → mild) → neutral → negative(mild → mid → strong). */

export interface OverallSignal {
  signal: Signal;
  intensity: Intensity;
}

export interface Stock {
  name: string;
  issues: Issue[]; // up to 20
  overall: OverallSignal; // GPT-derived, not a simple majority of issues
  // Step 4a §14-10: empty slot in a user's portfolio. Card still renders at
  // normal size with --signal-empty colored header box + 20-grid; name is "".
  isEmpty?: boolean;
}

export interface Portfolio {
  label: "현재 포트폴리오" | "예비 포트폴리오";
  variant: "current" | "spare";
  stocks: Stock[]; // 8 stocks
  overall: OverallSignal; // GPT-derived after all stocks are in
}
