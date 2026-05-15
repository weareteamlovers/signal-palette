export type Signal = "positive" | "neutral" | "negative";

export interface Issue {
  // Short keyword or one-line summary
  text: string;
  signal: Signal;
}

export interface Stock {
  name: string;
  issues: Issue[]; // up to 20
  overall: Signal; // stock-level overall color (will come from GPT later)
}

export interface Portfolio {
  label: "현재 포트폴리오" | "예비 포트폴리오";
  variant: "current" | "spare";
  stocks: Stock[]; // 8 stocks
  overall: Signal; // portfolio-level overall color
}
