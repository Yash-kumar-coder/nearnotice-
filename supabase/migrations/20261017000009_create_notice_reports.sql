-- ==============================================================================
-- NearNotice Security & Safety Migration: SEC-06 Notice Reports Table
-- Migration: 20261017000009_create_notice_reports.sql
-- ==============================================================================
begin;

create table if not exists public.notice_reports (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Index for admin moderation queries
create index if not exists idx_notice_reports_notice_id on public.notice_reports(notice_id);
create index if not exists idx_notice_reports_status on public.notice_reports(status);
create index if not exists idx_notice_reports_created_at on public.notice_reports(created_at desc);

-- Enable Row Level Security
alter table public.notice_reports enable row level security;

-- Drop prior policies if rerunning
drop policy if exists "Anyone can submit a notice report" on public.notice_reports;
drop policy if exists "Authenticated users can submit a notice report" on public.notice_reports;
drop policy if exists "Only service role can read reports" on public.notice_reports;

-- Allow anyone (anonymous or authenticated) to submit a safety/abuse report
create policy "Anyone can submit a notice report"
  on public.notice_reports
  for insert
  to anon, authenticated
  with check (true);

-- Deny public reading of reports (only backend/service role or elevated admins can view)
create policy "Only service role can read reports"
  on public.notice_reports
  for select
  to service_role
  using (true);

-- Grant permissions
grant insert on public.notice_reports to anon, authenticated;
grant select, update, delete on public.notice_reports to service_role;

commit;
