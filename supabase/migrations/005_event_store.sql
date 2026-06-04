-- Step 5 / Phase 1: event store + labeling. A permanent, immutable log of
-- issues as they first appear (event_log, with a pgvector embedding for the
-- Phase 2 retrieval), plus the realized sector-relative chart reaction measured
-- a few trading days later (event_outcome). This is separate from the 21-day
-- stock_analysis cache — it's the accumulating training memory for reaction
-- prediction. Service role writes (bypasses RLS); public read like stock_analysis.

create extension if not exists vector with schema extensions;

-- One row per (stock, distinct issue), written once on first appearance.
create table if not exists public.event_log (
  id          uuid primary key default gen_random_uuid(),
  stock_name  text not null,
  market      text,                     -- 'KR' | 'US'
  symbol      text,                     -- Yahoo symbol of the stock (label input)
  sector      text,                     -- Yahoo GICS sector (English)
  industry    text,
  benchmark   text,                     -- Yahoo benchmark symbol (label input)
  issue_text  text not null,
  signal      text,                     -- positive | neutral | negative
  intensity   text,                     -- strong | mid | mild
  source_url  text,
  t0          timestamptz not null,     -- event time (issue.createdAt)
  embedding   extensions.vector(1536),  -- text-embedding-3-small
  dedup_key   text not null unique,     -- stock + normalized text → first-appearance only
  created_at  timestamptz not null default now()
);

create index if not exists event_log_stock_idx  on public.event_log (stock_name);
create index if not exists event_log_sector_idx on public.event_log (sector);
create index if not exists event_log_t0_idx     on public.event_log (t0);

-- Realized reaction: forward + sector-excess (abnormal) returns at 1/3/5
-- trading days. One row per labeled event.
create table if not exists public.event_outcome (
  event_id   uuid primary key references public.event_log(id) on delete cascade,
  benchmark  text,
  ret_1d     double precision,
  ret_3d     double precision,
  ret_5d     double precision,
  abret_1d   double precision,
  abret_3d   double precision,
  abret_5d   double precision,
  labeled_at timestamptz not null default now()
);

alter table public.event_log     enable row level security;
alter table public.event_outcome enable row level security;

-- Public read (shared market data, like stock_analysis); only the service role
-- (bypasses RLS) writes.
drop policy if exists "event_log_read_all" on public.event_log;
create policy "event_log_read_all" on public.event_log for select using (true);
drop policy if exists "event_outcome_read_all" on public.event_outcome;
create policy "event_outcome_read_all" on public.event_outcome for select using (true);

-- Unlabeled events older than min_age_seconds that carry the symbols needed to
-- label them, oldest first. Used by the scheduled labeler (/api/refresh).
create or replace function public.due_events(min_age_seconds int, lim int)
returns table (id uuid, stock_name text, symbol text, benchmark text, t0 timestamptz)
language sql stable
set search_path = public, extensions
as $$
  select e.id, e.stock_name, e.symbol, e.benchmark, e.t0
  from public.event_log e
  left join public.event_outcome o on o.event_id = e.id
  where o.event_id is null
    and e.symbol is not null
    and e.benchmark is not null
    and e.t0 <= now() - make_interval(secs => min_age_seconds)
  order by e.t0 asc
  limit lim;
$$;
