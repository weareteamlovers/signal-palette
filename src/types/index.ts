export type Signal = "positive" | "neutral" | "negative";

export type Intensity = "strong" | "mid" | "mild";

export interface Issue {
  // GPT returns a single sentence summary, max ~30 chars.
  text: string;
  signal: Signal;
  /** Strength of the signal — neutral always uses "mid". */
  intensity: Intensity;
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
}

export interface Portfolio {
  label: "현재 포트폴리오" | "예비 포트폴리오";
  variant: "current" | "spare";
  stocks: Stock[]; // 8 stocks
  overall: OverallSignal; // GPT-derived after all stocks are in
}
