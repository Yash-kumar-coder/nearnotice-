-- ==============================================================================
-- NearNotice Migration: Add Price, Contact Details, Multi-Image, Views & CRUD Fixes
-- Migration: 20261014000002_add_notice_details.sql
-- ==============================================================================
begin;

-- 1. Add new columns to public.notices table
alter table public.notices 
  add column if not exists price numeric(10, 2),
  add column if not exists contact_number text,
  add column if not exists contact_type text default 'both',
  add column if not exists images text[] default '{}',
  add column if not exists views_count integer default 0;

-- 2. Atomic function to increment views on notice click
create or replace function public.increment_notice_views(notice_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.notices
  set views_count = coalesce(views_count, 0) + 1
  where id = notice_id;
end;
$$;

grant execute on function public.increment_notice_views(uuid) to anon, authenticated;

-- 3. Drop existing view to allow new column layout
drop view if exists public.public_notices;

-- 4. Recreate public_notices view with owner_id and the new columns
create view public.public_notices
with (security_invoker = true) as
select
  id,
  owner_id,
  title,
  body,
  category,
  image_path,
  images,
  area_label,
  price,
  contact_number,
  contact_type,
  coalesce(views_count, 0) as views_count,
  round(latitude::numeric, 3) as latitude,
  round(longitude::numeric, 3) as longitude,
  created_at,
  expires_at
from public.notices
where status = 'published'
  and expires_at > now();

grant select on public.public_notices to anon, authenticated;

-- 5. Ensure CRUD RLS policies on notices table work smoothly for owners
-- INSERT (Create): any authenticated user can insert with their own owner_id
drop policy if exists "Authenticated users can create notices" on public.notices;
create policy "Authenticated users can create notices"
  on public.notices
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

-- UPDATE: owners can update their notices
drop policy if exists "Owners can update their notices" on public.notices;
create policy "Owners can update their notices"
  on public.notices
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- DELETE: owners can delete their notices
drop policy if exists "Owners can delete their notices" on public.notices;
create policy "Owners can delete their notices"
  on public.notices
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- SELECT: owners can select all their notices (published or drafts)
drop policy if exists "Public and authenticated can read published unexpired notices" on public.notices;
create policy "Public and authenticated can read published unexpired notices"
  on public.notices
  for select
  to anon, authenticated
  using (
    (status = 'published' and expires_at > now())
    or (owner_id = (select auth.uid()))
  );

grant select, insert, update, delete on public.notices to authenticated;
grant select on public.notices to anon;

commit;
