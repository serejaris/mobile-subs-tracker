-- Lesson 6: Supabase memory for SubTrack
-- Run this SQL in the Supabase SQL Editor for your own demo project.

create extension if not exists "pgcrypto";

create table if not exists public.subscriptions (
  id text primary key,
  name text not null,
  amount numeric not null,
  currency text not null,
  billing_cycle text not null,
  next_billing_date date not null,
  category text not null,
  status text not null default 'active',
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  trial_end_date date
);

alter table public.subscriptions enable row level security;

drop policy if exists "lesson_6_select_subscriptions" on public.subscriptions;
create policy "lesson_6_select_subscriptions"
on public.subscriptions
for select
to anon
using (true);

drop policy if exists "lesson_6_insert_subscriptions" on public.subscriptions;
create policy "lesson_6_insert_subscriptions"
on public.subscriptions
for insert
to anon
with check (true);

drop policy if exists "lesson_6_update_subscriptions" on public.subscriptions;
create policy "lesson_6_update_subscriptions"
on public.subscriptions
for update
to anon
using (true)
with check (true);

drop policy if exists "lesson_6_delete_subscriptions" on public.subscriptions;
create policy "lesson_6_delete_subscriptions"
on public.subscriptions
for delete
to anon
using (true);
