/**
 * When true, AnalysisProvider serves the frozen results in
 * src/data/analysis-fixture.ts instead of calling /api/analyze. Keeps the
 * OpenAI bill at zero during 1차 MVP development. Flip to false to hit the
 * real API and trigger the capture helper that prints the next fixture JSON
 * to the browser console.
 *
 * Capture flow:
 *   1) Set USE_FIXTURE = false here.
 *   2) Reload the page and wait until every card finishes (16 stocks + 2
 *      portfolio overalls). About 30–90s on a warm OpenAI account.
 *   3) The browser console prints "[fixture-capture] …" followed by a JSON
 *      blob. Copy it.
 *   4) Open src/data/analysis-fixture.ts and replace the existing
 *      ANALYSIS_FIXTURE value with the captured JSON.
 *   5) Set USE_FIXTURE = true again. Commit & push.
 */
export const USE_FIXTURE = true;

/** First-mount fake-load delay before the random-order stagger starts.
 *  Applied only when fixture mode is active. */
export const FIXTURE_HOLD_MS = 3000;

/** Gap between consecutive stock reveals in fixture mode (ms). */
export const FIXTURE_STAGGER_MS = 150;
