-- ==============================================================================
-- NearNotice Hotfix: Fix PostgreSQL COALESCE and LEAST Syntactic Constructs
-- Migration: 20261016000008_fix_pg_catalog_coalesce.sql
-- ==============================================================================
-- Description:
-- In PostgreSQL, COALESCE and LEAST are SQL syntactic language constructs, not
-- catalog functions. Qualifying them as "pg_catalog.coalesce" throws:
-- "function pg_catalog.coalesce(text, unknown) does not exist".
-- This migration updates get_notice_contact and increment_notice_views to use
-- standard COALESCE and LEAST.
-- ==============================================================================

begin;

-- 1. Fix get_notice_contact
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

-- Function Privileges
revoke all on function public.get_notice_contact(uuid) from public;
revoke all on function public.get_notice_contact(uuid) from anon;
grant execute on function public.get_notice_contact(uuid) to authenticated;

-- 2. Fix increment_notice_views
create or replace function public.increment_notice_views(notice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if notice_id is null then
    return;
  end if;

  update public.notices
  set views_count = least(coalesce(views_count, 0) + 1, 2147483647)
  where id = notice_id
    and status = 'published'
    and expires_at > pg_catalog.now();
end;
$$;

revoke all on function public.increment_notice_views(uuid) from public;
grant execute on function public.increment_notice_views(uuid) to anon, authenticated;

commit;
