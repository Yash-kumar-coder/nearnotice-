-- ==============================================================================
-- NearNotice Security Migration: SEC-05 Secure Profile RLS & Prevent User Enumeration
-- Migration: 20261016000006_secure_profiles_rls.sql
-- ==============================================================================
-- 1. Inspect & Harden RLS on public.profiles:
--    - Revoke anonymous privileges on public.profiles to prevent user enumeration.
--    - Remove the overly permissive policy: "Profiles display_name viewable by all"
--    - Ensure Row Level Security (RLS) is active on public.profiles.
--    - Grant authenticated users SELECT, INSERT, and UPDATE privileges restricted strictly
--      to their own profile record (id = auth.uid()).
-- 2. Preserve Public Feed Author Display:
--    - Ensure public.public_notices view (security_invoker = false, owned by postgres)
--      continues to safely project author_name (coalesce(n.author_name, p.display_name, 'Neighbor'))
--      without exposing user UUIDs, account creation dates, or direct access to public.profiles.
-- ==============================================================================

begin;

-- 1. Ensure RLS is enabled on public.profiles
alter table if exists public.profiles enable row level security;

-- 2. Revoke any direct anonymous access to public.profiles
revoke all on public.profiles from anon;

-- 3. Grant minimum necessary table privileges to authenticated role
grant select, insert, update on public.profiles to authenticated;

-- 4. Drop insecure/open policies that allow enumerating all profiles
drop policy if exists "Profiles display_name viewable by all" on public.profiles;
drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Profiles are insertable by owner" on public.profiles;
drop policy if exists "Profiles are updatable by owner" on public.profiles;

-- 5. Create strict owner-only RLS policies on public.profiles

-- (a) SELECT: Authenticated users can only read their own profile row
create policy "Profiles are viewable by owner"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

-- (b) INSERT: Authenticated users can only insert their own profile row
create policy "Profiles are insertable by owner"
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

-- (c) UPDATE: Authenticated users can only update their own profile row
create policy "Profiles are updatable by owner"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 6. Verify / Re-affirm public.public_notices view definition and privileges
-- The view runs with postgres owner privileges (security_invoker = false)
-- so it can resolve author_name without granting anon/authenticated direct SELECT on profiles.
create or replace view public.public_notices
with (security_invoker = false) as
select
  n.id,
  n.owner_id,
  n.title,
  n.body,
  n.category,
  n.image_path,
  n.images,
  n.area_label,
  n.price,
  n.contact_type,
  coalesce(n.views_count, 0) as views_count,
  round(n.latitude::numeric, 3) as latitude,
  round(n.longitude::numeric, 3) as longitude,
  n.created_at,
  n.expires_at,
  coalesce(nullif(trim(n.author_name), ''), nullif(trim(p.display_name), ''), 'Neighbor') as author_name
from public.notices n
left join public.profiles p on n.owner_id = p.id
where n.status = 'published'
  and n.expires_at > pg_catalog.now();

alter view public.public_notices owner to postgres;
grant select on public.public_notices to anon, authenticated;

commit;
