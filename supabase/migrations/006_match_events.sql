-- Step 5 / Phase 2: nearest-neighbor retrieval for issue-level reaction
-- prediction. Given a query embedding, return the most similar LABELED events
-- (those with a realized outcome), optionally scoped to one stock or sector.
-- The predictor calls this stock-first, then falls back to sector (Step 5
-- decision: 종목 단위 우선, 표본 부족 시 섹터 폴백).
--
-- No HNSW index yet — the event store is small (forward accumulation), so a
-- seq-scan + cosine sort is instant. Add an index in a later phase once it grows.

create or replace function public.match_events(
  query_embedding extensions.vector(1536),
  filter_stock    text,
  filter_sector   text,
  match_count     int
)
returns table (
  id         uuid,
  stock_name text,
  sector     text,
  issue_text text,
  t0         timestamptz,
  similarity double precision,
  abret_1d   double precision,
  abret_3d   double precision,
  abret_5d   double precision
)
language sql stable
set search_path = public, extensions
as $$
  select e.id, e.stock_name, e.sector, e.issue_text, e.t0,
         1 - (e.embedding <=> query_embedding) as similarity,
         o.abret_1d, o.abret_3d, o.abret_5d
  from public.event_log e
  join public.event_outcome o on o.event_id = e.id
  where (filter_stock  is null or e.stock_name = filter_stock)
    and (filter_sector is null or e.sector = filter_sector)
    and e.embedding is not null
    and o.abret_3d is not null
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
