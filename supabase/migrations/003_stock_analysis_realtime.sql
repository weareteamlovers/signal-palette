-- Step 4c-8: enable Supabase Realtime on the analysis cache so clients get
-- pushed updates when the scheduled refresh (4c-7) rewrites a row. Idempotent.

-- Full row image on changes (recommended for Realtime + RLS evaluation).
alter table public.stock_analysis replica identity full;

-- Add the table to the Realtime publication if it isn't already a member.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stock_analysis'
  ) then
    alter publication supabase_realtime add table public.stock_analysis;
  end if;
end $$;
