// Step 5: prediction-engine mode. Switchable any time via the PREDICTION_MODE
// env var (no code change, no redeploy of logic) so we can flip between the GPT
// judgment and a future trained model without touching call sites:
//
//   - "gpt"   (default) → one gpt-4o-mini call produces the color / impact
//                         period / expected band / 종합 서술 directly.
//   - "model"           → the case-based k-NN aggregation over the event store
//                         (the deterministic engine; later a trained model
//                         slots in here).
//
// Read server-side only — predictStock runs in /api/refresh (cache warming) and
// /api/predict-stock (on-demand fallback), never in the browser.

export type PredictionMode = "gpt" | "model";

export const PREDICTION_MODE: PredictionMode =
  process.env.PREDICTION_MODE === "model" ? "model" : "gpt";
