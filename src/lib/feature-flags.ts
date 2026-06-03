/**
 * Fixture mode: when true, AnalysisProvider serves the frozen results in
 * src/data/analysis-fixture.ts instead of calling /api/analyze (zero OpenAI).
 * Env-controlled so production (live) and local dev (fixture) differ without
 * editing code — NEXT_PUBLIC_ so the client bundle can read it:
 *   - unset (default) → true  (fixture mode)
 *   - NEXT_PUBLIC_USE_FIXTURE="false" → live pipeline (adapters/cache/Realtime)
 * Set NEXT_PUBLIC_USE_FIXTURE=false in Vercel for production, and in .env.local
 * for local live testing.
 *
 * Capture flow (promote live → fixture): run with NEXT_PUBLIC_USE_FIXTURE=false,
 * let every card finish, copy the "[fixture-capture] …" JSON from the browser
 * console into src/data/analysis-fixture.ts, then unset the env again.
 */
export const USE_FIXTURE = process.env.NEXT_PUBLIC_USE_FIXTURE !== "false";

/** First-mount fake-load delay before the random-order stagger starts.
 *  Applied only when fixture mode is active. */
export const FIXTURE_HOLD_MS = 3000;

/** Gap between consecutive stock reveals in fixture mode (ms). */
export const FIXTURE_STAGGER_MS = 150;
