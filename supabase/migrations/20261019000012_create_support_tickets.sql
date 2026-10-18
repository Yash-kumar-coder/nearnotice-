-- ==============================================================================
-- NearNotice Support & Moderation Migration: Support Tickets & Reports
-- Migration: 20261019000012_create_support_tickets.sql
-- ==============================================================================
begin;

-- 1. Create support_tickets table
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('contact_support', 'report_notice', 'report_user', 'safety_inquiry', 'general')),
  name text,
  email text,
  phone text,
  subject text,
  message text not null,
  target_id text,
  target_type text check (target_type in ('notice', 'user', 'other')),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'resolved', 'dismissed')),
  user_id uuid references auth.users(id) on delete set null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast filtering and ordering
create index if not exists idx_support_tickets_type on public.support_tickets(type);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_tickets_created_at on public.support_tickets(created_at desc);
create index if not exists idx_support_tickets_user_id on public.support_tickets(user_id);

-- Enable RLS
alter table public.support_tickets enable row level security;

-- Drop policies if rerunning
drop policy if exists "Anyone can submit support tickets" on public.support_tickets;
drop policy if exists "Users can view own support tickets" on public.support_tickets;
drop policy if exists "Admins can view all support tickets" on public.support_tickets;
drop policy if exists "Admins can update support tickets" on public.support_tickets;
drop policy if exists "Admins can delete support tickets" on public.support_tickets;

-- Anyone (guest or authenticated) can submit support requests and reports
create policy "Anyone can submit support tickets"
  on public.support_tickets
  for insert
  to anon, authenticated
  with check (true);

-- Authenticated users can view tickets they submitted
create policy "Users can view own support tickets"
  on public.support_tickets
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Admins and Authors can view all support tickets
create policy "Admins can view all support tickets"
  on public.support_tickets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where user_id = (select auth.uid())
    )
  );

-- Admins can update ticket status and admin notes
create policy "Admins can update support tickets"
  on public.support_tickets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.admin_roles
      where user_id = (select auth.uid())
    )
  );

-- Admins can delete tickets if needed
create policy "Admins can delete support tickets"
  on public.support_tickets
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where user_id = (select auth.uid())
    )
  );

-- Grant privileges
grant insert on public.support_tickets to anon, authenticated;
grant select on public.support_tickets to anon, authenticated;
grant update, delete on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;

-- Grant admins select on notice_reports if not yet granted
drop policy if exists "Admins can view notice reports" on public.notice_reports;
create policy "Admins can view notice reports"
  on public.notice_reports
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where user_id = (select auth.uid())
    )
  );

grant select, update, delete on public.notice_reports to authenticated;

commit;
