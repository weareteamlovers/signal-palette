-- 4a-7 schema: profiles + portfolios + RLS + nickname dedup RPC.
-- Apply once via Supabase Dashboard → SQL Editor.
--
-- profiles    : 1:1 with auth.users. nickname is the single source of truth.
-- portfolios  : 2 rows per user (variant = 'current' | 'spare'). Stocks stored
--               as a text[] of hangul stock names, "" allowed for empty slots.
-- check_nickname(name) RPC: SECURITY DEFINER so the nickname-uniqueness query
--               can see every profile while RLS still restricts plain SELECT
--               to the row owner.

-- ============================================================================
-- profiles
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_nickname_idx on public.profiles (nickname);

alter table public.profiles enable row level security;

drop policy if exists "profiles owner read"   on public.profiles;
drop policy if exists "profiles owner insert" on public.profiles;
drop policy if exists "profiles owner update" on public.profiles;
drop policy if exists "profiles owner delete" on public.profiles;

create policy "profiles owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles owner insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles owner delete"
  on public.profiles for delete
  using (auth.uid() = id);

-- ============================================================================
-- portfolios
-- ============================================================================

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  variant text not null check (variant in ('current', 'spare')),
  stocks text[] not null default '{}'::text[],
  updated_at timestamptz not null default now(),
  unique (user_id, variant)
);

create index if not exists portfolios_user_idx on public.portfolios (user_id);

alter table public.portfolios enable row level security;

drop policy if exists "portfolios owner read"   on public.portfolios;
drop policy if exists "portfolios owner insert" on public.portfolios;
drop policy if exists "portfolios owner update" on public.portfolios;
drop policy if exists "portfolios owner delete" on public.portfolios;

create policy "portfolios owner read"
  on public.portfolios for select
  using (auth.uid() = user_id);

create policy "portfolios owner insert"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

create policy "portfolios owner update"
  on public.portfolios for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "portfolios owner delete"
  on public.portfolios for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- check_nickname(name) — nickname-uniqueness probe used by NicknameModal.
-- SECURITY DEFINER lets it scan the whole profiles table without exposing
-- ids (RLS on profiles still blocks raw SELECT for non-owners).
-- ============================================================================

create or replace function public.check_nickname(name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return not exists (select 1 from public.profiles where nickname = name);
end;
$$;

revoke all on function public.check_nickname(text) from public;
grant execute on function public.check_nickname(text) to authenticated, anon;

-- ============================================================================
-- updated_at trigger (auto-bumps on UPDATE)
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists portfolios_updated_at on public.portfolios;
create trigger portfolios_updated_at
  before update on public.portfolios
  for each row execute function public.set_updated_at();
