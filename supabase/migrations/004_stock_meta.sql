-- Step 4e: auto-growing stock catalog. The search route (Naver autocomplete)
-- upserts {name, market, ticker} here as users search, so the news router can
-- route any added stock — including US stocks not in the static STOCK_CATALOG
-- (their ticker → Finnhub). Service role writes; public read.

create table if not exists public.stock_meta (
  name       text primary key,
  market     text not null check (market in ('KR', 'US')),
  ticker     text,
  updated_at timestamptz not null default now()
);

alter table public.stock_meta enable row level security;

drop policy if exists "stock_meta_read_all" on public.stock_meta;
create policy "stock_meta_read_all"
  on public.stock_meta for select
  using (true);

-- No insert/update/delete policy → only the service role (bypasses RLS) writes.
