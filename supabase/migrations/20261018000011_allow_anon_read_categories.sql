-- NearNotice Production Migration: Allow anon and authenticated users to read active categories without RLS error
-- Migration: 20261018000011_allow_anon_read_categories.sql

-- 1. Grant execute on public.is_admin() to anon role
-- This allows PostgreSQL RLS to evaluate without 'permission denied for function is_admin'
grant execute on function public.is_admin() to anon;

-- 2. Update RLS policy on public.categories so that anon users safely read active categories
drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
  on public.categories
  for select
  to anon, authenticated
  using (is_active = true or (auth.uid() is not null and public.is_admin()));
