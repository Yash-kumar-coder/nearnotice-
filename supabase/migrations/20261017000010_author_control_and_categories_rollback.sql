-- ==============================================================================
-- NearNotice Rollback Migration: Rollback 20261017000010_author_control_and_categories.sql
-- ==============================================================================
begin;

-- 1. Drop Functions
drop function if exists public.get_author_users_directory(text, integer, integer) cascade;
drop function if exists public.author_manage_category(text, uuid, text, text, text, text, boolean, integer) cascade;
drop function if exists public.author_reveal_contact(uuid) cascade;
drop function if exists public.author_mutate_notice(uuid, text, jsonb) cascade;
drop function if exists public.get_author_traffic_analytics(date, date) cascade;
drop function if exists public.get_author_overview_metrics() cascade;
drop function if exists public.record_site_visit(text, text) cascade;

-- 2. Drop Additive Policies on surviving tables
do $$
begin
  if to_regclass('public.notices') is not null then
    execute 'drop policy if exists "Admins can select all notices" on public.notices';
    execute 'drop policy if exists "Admins can update notices" on public.notices';
    execute 'drop policy if exists "Admins can delete notices" on public.notices';
  end if;

  if to_regclass('public.profiles') is not null then
    execute 'drop policy if exists "Admins can view all profiles" on public.profiles';
  end if;
end $$;

-- 3. Drop Tables
drop table if exists public.site_analytics_daily cascade;
drop table if exists public.categories cascade;
drop table if exists public.admin_audit_log cascade;
drop table if exists public.admin_roles cascade;

-- 4. Drop Helper Function
drop function if exists public.is_admin() cascade;

commit;
