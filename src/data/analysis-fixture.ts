import type { Issue, OverallSignal } from "@/types";

export interface AnalysisFixture {
  stocks: Record<string, { issues: Issue[]; overall: OverallSignal }>;
  overalls: { current: OverallSignal; spare: OverallSignal };
}

/**
 * Frozen analysis output served when USE_FIXTURE is true. Starts as null —
 * populate it once via the capture flow documented in
 * src/lib/feature-flags.ts. While this is null, fixture mode still works but
 * every card falls back to mock data (no OpenAI call, no real data either).
 */
export const ANALYSIS_FIXTURE: AnalysisFixture | null = null;
