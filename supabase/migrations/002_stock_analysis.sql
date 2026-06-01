-- Step 4c-6: shared (non-user) analysis cache. The news-adapter / web_search
-- pipeline upserts results here via the service role; clients read a fresh row
-- instead of hitting OpenAI on every page load. Portfolio overalls are NOT
-- cached here (they depend on each user's specific stock set).

create table if not exists public.stock_analysis (
  stock_name text primary key,
  issues     jsonb not null,
  overall    jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.stock_analysis enable row level security;

-- Public read: analysis is shared market data, not user-specific.
drop policy if exists "stock_analysis_read_all" on public.stock_analysis;
create policy "stock_analysis_read_all"
  on public.stock_analysis for select
  using (true);

-- No insert/update/delete policy → only the service role (which bypasses RLS)
-- can write. The Next.js /api/analyze route uses SUPABASE_SECRET_KEY for that.
