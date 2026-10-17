-- ==============================================================================
-- NearNotice Security Migration: SEC-02 Secure increment_notice_views Function
-- Migration: 20261016000005_secure_increment_views.sql
-- ==============================================================================
begin;

-- 1. Hardened increment_notice_views with pinned search_path and input validation
create or replace function public.increment_notice_views(notice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Input validation: ignore null notice_id safely
  if notice_id is null then
    return;
  end if;

  -- Strictly target only the single active, published, and unexpired notice
  -- Fully qualified catalog functions and table name to eliminate search_path hijacking
  -- Prevent arbitrary row updates, draft/removed view tampering, and integer overflow
  update public.notices
  set views_count = least(coalesce(views_count, 0) + 1, 2147483647)
  where id = notice_id
    and status = 'published'
    and expires_at > pg_catalog.now();
end;
$$;

-- 2. Restrict execute privileges: revoke from public, grant strictly to anon & authenticated
revoke all on function public.increment_notice_views(uuid) from public;
grant execute on function public.increment_notice_views(uuid) to anon, authenticated;

commit;
