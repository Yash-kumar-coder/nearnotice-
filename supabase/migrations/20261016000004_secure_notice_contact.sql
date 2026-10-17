-- ==============================================================================
-- NearNotice Security Migration: SEC-01 Secure Resident Phone Numbers & Anti-Scraping
-- Migration: 20261016000004_secure_notice_contact.sql
-- ==============================================================================
begin;

-- 1. Create dedicated audit / rate-limiting table
create table if not exists public.notice_contact_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notice_id uuid not null references public.notices(id) on delete cascade,
  requested_at timestamptz not null default pg_catalog.now()
);

-- Revoke all direct client privileges
revoke all on table public.notice_contact_rate_limits from public, anon, authenticated;

-- Enable RLS with strict deny-all policy for clients
alter table public.notice_contact_rate_limits enable row level security;

drop policy if exists "Deny all client access to rate limits" on public.notice_contact_rate_limits;
create policy "Deny all client access to rate limits"
  on public.notice_contact_rate_limits
  for all
  to public
  using (false);

-- Index for concurrency lock checks and rolling window queries
create index if not exists idx_notice_contact_rate_limits_user_window
  on public.notice_contact_rate_limits (user_id, requested_at desc);

create index if not exists idx_notice_contact_rate_limits_user_notice
  on public.notice_contact_rate_limits (user_id, notice_id);

-- 2. Concurrency-Safe, Rate-Limited RPC for Single-Notice Contact Retrieval
create or replace function public.get_notice_contact(target_notice_id uuid)
returns table (
  contact_number text,
  contact_type text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  caller_role text;
  notice_row record;
  user_email_confirmed timestamptz;
  distinct_requests_count integer;
  already_viewed boolean;
  max_requests_per_hour constant integer := 25;
begin
  -- Step A: Strict Authorization
  caller_id := auth.uid();
  caller_role := auth.role();

  if caller_id is null or caller_role <> 'authenticated' then
    raise exception 'Authentication required to access contact details'
      using errcode = '42501';
  end if;

  -- Step B: Email confirmation requirement to hinder throwaway scrapers
  select u.email_confirmed_at
  into user_email_confirmed
  from auth.users u
  where u.id = caller_id;

  if user_email_confirmed is null then
    raise exception 'Email confirmation required before contacting neighbors'
      using errcode = '42501';
  end if;

  -- Step C: Retrieve target notice using fully-qualified relation
  select
    n.id,
    n.owner_id,
    n.status,
    n.expires_at,
    n.contact_number,
    n.contact_type
  into notice_row
  from public.notices n
  where n.id = target_notice_id;

  if not found then
    raise exception 'Notice not found'
      using errcode = 'P0002';
  end if;

  -- Step D: Notice Owner Access (Owners always have access, exempt from rate limits & status checks)
  if notice_row.owner_id = caller_id then
    return query
    select
      notice_row.contact_number,
      coalesce(notice_row.contact_type, 'both');
    return;
  end if;

  -- Step E: Active Notice Check for Non-Owners
  if notice_row.status <> 'published' or notice_row.expires_at <= pg_catalog.now() then
    raise exception 'This notice is not active or has expired'
      using errcode = '42501';
  end if;

  -- Step F: Concurrency-Safe Transactional Advisory Lock per user
  -- Serializes simultaneous requests from the same user to prevent TOCTOU race condition
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('contact_rate_limit_' || caller_id::text)
  );

  -- Step G: Deduplication Check (Has caller unlocked this notice in past 24 hours?)
  select exists (
    select 1
    from public.notice_contact_rate_limits r
    where r.user_id = caller_id
      and r.notice_id = target_notice_id
      and r.requested_at > (pg_catalog.now() - pg_catalog.interval '24 hours')
  ) into already_viewed;

  if not already_viewed then
    -- Count distinct notices requested in rolling 1-hour window
    select pg_catalog.count(distinct r.notice_id)
    into distinct_requests_count
    from public.notice_contact_rate_limits r
    where r.user_id = caller_id
      and r.requested_at > (pg_catalog.now() - pg_catalog.interval '1 hour');

    if distinct_requests_count >= max_requests_per_hour then
      raise exception 'Rate limit exceeded: Maximum % contact requests per hour reached', max_requests_per_hour
        using errcode = 'P0004';
    end if;

    -- Record request
    insert into public.notice_contact_rate_limits (user_id, notice_id, requested_at)
    values (caller_id, target_notice_id, pg_catalog.now());
  end if;

  return query
  select
    notice_row.contact_number,
    coalesce(notice_row.contact_type, 'both');
end;
$$;

-- Function Privileges: Restricted exclusively to authenticated users
revoke all on function public.get_notice_contact(uuid) from public;
revoke all on function public.get_notice_contact(uuid) from anon;
grant execute on function public.get_notice_contact(uuid) to authenticated;

-- 3. Recreate public.public_notices view WITHOUT contact_number
-- Explicitly DO NOT use CASCADE; no dependent objects exist
drop view if exists public.public_notices;

create view public.public_notices
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

-- Ensure view owner is postgres and grant select to anon & authenticated
alter view public.public_notices owner to postgres;
grant select on public.public_notices to anon, authenticated;

-- 4. Tighten Table Privileges & RLS on public.notices
-- Revoke direct anon select on base table
revoke select on public.notices from anon;

-- Replace existing broad select policy with owner-only select policy for direct table reads
drop policy if exists "Public and authenticated can read published unexpired notices" on public.notices;
drop policy if exists "Owners can view own notices" on public.notices;

create policy "Owners can view own notices"
  on public.notices
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

commit;
