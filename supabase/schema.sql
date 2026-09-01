-- ==========================================================================
-- MealMate – Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query)
-- after creating the project. Safe to re-run (uses IF NOT EXISTS / OR REPLACE
-- where possible).
-- ==========================================================================

-- ---------- meal_logs: one row per logged meal ----------
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  name text not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner')),
  calories integer not null default 0 check (calories >= 0),
  on_time boolean not null default false,
  emoji text,
  created_at timestamptz not null default now()
);

create index if not exists meal_logs_user_date_idx
  on public.meal_logs (user_id, log_date);

alter table public.meal_logs enable row level security;

drop policy if exists "meal_logs_select_own" on public.meal_logs;
create policy "meal_logs_select_own" on public.meal_logs
  for select using (auth.uid() = user_id);

drop policy if exists "meal_logs_insert_own" on public.meal_logs;
create policy "meal_logs_insert_own" on public.meal_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "meal_logs_delete_own" on public.meal_logs;
create policy "meal_logs_delete_own" on public.meal_logs
  for delete using (auth.uid() = user_id);

-- ---------- user_settings: one row per user ----------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  breakfast_time text not null default '07:30',
  lunch_time text not null default '12:00',
  dinner_time text not null default '18:00',
  display_name text,
  age integer check (age is null or (age > 0 and age < 130)),
  updated_at timestamptz not null default now()
);

-- Existing projects: run this once to add the new profile columns to a
-- table that was already created before this change (safe to re-run).
alter table public.user_settings add column if not exists display_name text;
alter table public.user_settings add column if not exists age integer
  check (age is null or (age > 0 and age < 130));

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "user_settings_upsert_own" on public.user_settings;
create policy "user_settings_upsert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id);

-- ---------- daily_groups: which of the 5 food groups were eaten, per day ----------
create table if not exists public.daily_groups (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  groups text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

alter table public.daily_groups enable row level security;

drop policy if exists "daily_groups_select_own" on public.daily_groups;
create policy "daily_groups_select_own" on public.daily_groups
  for select using (auth.uid() = user_id);

drop policy if exists "daily_groups_upsert_own" on public.daily_groups;
create policy "daily_groups_upsert_own" on public.daily_groups
  for insert with check (auth.uid() = user_id);

drop policy if exists "daily_groups_update_own" on public.daily_groups;
create policy "daily_groups_update_own" on public.daily_groups
  for update using (auth.uid() = user_id);

-- ==========================================================================
-- Notes:
-- * No policy allows selecting/editing another user's rows — auth.uid()
--   only ever matches the currently signed-in user, enforced by Postgres
--   itself, not by application code.
-- * Anonymous (signed-out) visitors have no matching auth.uid(), so all
--   policies deny them by default — guest mode keeps using localStorage
--   only, on the client, exactly like the static version.
-- ==========================================================================
