-- Step 5 / prediction caching. The stock-level reaction prediction
-- (StockPrediction: direction / band / impact period / confidence / rationale)
-- is computed once per scheduled refresh (every ~2 days per stock) and stored
-- here, so opening the stock modal reads a warm row instead of triggering an
-- embedding + GPT narration call on every open (0 OpenAI on modal open).
--
-- Column is nullable: cold / just-searched stocks have no prediction until the
-- next refresh bakes it, and /api/analyze cold writes omit it (so they never
-- clobber an existing prediction). Realtime already publishes stock_analysis
-- (migration 003, replica identity full), so this column propagates with it.

alter table public.stock_analysis
  add column if not exists prediction jsonb;
