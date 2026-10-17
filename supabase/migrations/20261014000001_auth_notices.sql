-- ==============================================================================
-- NearNotice Supabase Migration: Authentication, Profiles, Notices & RLS
-- Migration: 20261014000001_auth_notices.sql
-- ==============================================================================
begin;

-- 1. Profiles Table (populated strictly on email confirmation)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- 2. Notices Table
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) >= 3 and char_length(title) <= 120),
  body text check (char_length(body) <= 5000),
  category text not null,
  image_path text,
  area_label text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  status text not null default 'published' check (status in ('draft', 'published', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

-- 3. High Performance Indexes
create index if not exists idx_notices_status_created_id 
  on public.notices (status, created_at desc, id desc);

create index if not exists idx_notices_owner_id 
  on public.notices (owner_id);

create index if not exists idx_notices_category 
  on public.notices (category);

-- 4. Public Notices View
-- Defines security_invoker = true so PostgreSQL evaluates querying user's RLS permissions.
-- Exposes only safe public columns for published, non-expired listings.
-- Excludes owner_id, phone numbers, email addresses, and private audit attributes.
create or replace view public.public_notices
with (security_invoker = true) as
select
  id,
  title,
  body,
  category,
  image_path,
  area_label,
  round(latitude::numeric, 3) as latitude,
  round(longitude::numeric, 3) as longitude,
  created_at,
  expires_at
from public.notices
where status = 'published'
  and expires_at > now();

-- 5. Trigger Function: Create Profile On Email Confirmation
-- Security Definer with empty search path to prevent search_path hijacking
create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only create profile if email_confirmed_at is newly set or present on insert
  if (TG_OP = 'INSERT' and NEW.email_confirmed_at is not null) or
     (TG_OP = 'UPDATE' and OLD.email_confirmed_at is null and NEW.email_confirmed_at is not null) then
    
    insert into public.profiles (id, display_name, created_at)
    values (
      NEW.id,
      coalesce(
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1)
      ),
      now()
    )
    on conflict (id) do nothing;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row
  execute function public.handle_user_email_confirmed();

-- 6. Safe Backfill (Idempotent): Ensure any confirmed user has a profile
insert into public.profiles (id, display_name, created_at)
select 
  id, 
  coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1)), 
  created_at
from auth.users
where email_confirmed_at is not null
on conflict (id) do nothing;

-- 7. Trigger: Guard Immutable Notice Fields & Prevent Moderation Tampering
-- Blocks tampering of owner_id, created_at, or reversing a moderated 'removed' status
create or replace function public.guard_notice_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Disallow owner reassignment
  if NEW.owner_id <> OLD.owner_id then
    raise exception 'Cannot reassign notice owner_id';
  end if;

  -- Disallow tampering with original creation timestamp
  if NEW.created_at <> OLD.created_at then
    raise exception 'Cannot tamper with notice created_at timestamp';
  end if;

  -- Moderation guard: if a notice was removed by moderation, owner cannot un-remove it
  if OLD.status = 'removed' and NEW.status <> 'removed' then
    raise exception 'Cannot reinstate a notice that has been removed by moderation';
  end if;

  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists tr_guard_notice_fields on public.notices;
create trigger tr_guard_notice_fields
  before update on public.notices
  for each row
  execute function public.guard_notice_immutable_fields();

-- 8. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.notices enable row level security;

-- 9. Profiles RLS Policies
-- Users can only read and update their own profile
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 10. Notices RLS Policies
-- Public/Anon and Authenticated can read published, unexpired notices.
-- Authenticated owners can also read their own drafts.
drop policy if exists "Public and authenticated can read published unexpired notices" on public.notices;
create policy "Public and authenticated can read published unexpired notices"
  on public.notices
  for select
  to anon, authenticated
  using (
    (status = 'published' and expires_at > now())
    or (auth.uid() is not null and owner_id = (select auth.uid()))
  );

-- Only authenticated users with an existing profile can insert notices
drop policy if exists "Authenticated users can create notices" on public.notices;
create policy "Authenticated users can create notices"
  on public.notices
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid())
    )
  );

-- Only notice owners can update their notices
drop policy if exists "Owners can update their notices" on public.notices;
create policy "Owners can update their notices"
  on public.notices
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Only notice owners can delete their notices
drop policy if exists "Owners can delete their notices" on public.notices;
create policy "Owners can delete their notices"
  on public.notices
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- 11. Schema Grants (Least Privilege)
grant usage on schema public to anon, authenticated;
grant select on public.public_notices to anon, authenticated;
grant select on public.notices to anon, authenticated;
grant insert, update, delete on public.notices to authenticated;
grant select, update on public.profiles to authenticated;

-- 12. Storage Bucket: notice-images
-- Max 5MB, public read, owner folder write
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notice-images',
  'notice-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 13. Idempotent Storage RLS Policies
drop policy if exists "Public read notice images" on storage.objects;
create policy "Public read notice images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'notice-images');

drop policy if exists "Authenticated users upload into own folder" on storage.objects;
create policy "Authenticated users upload into own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'notice-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users update own notice images" on storage.objects;
create policy "Users update own notice images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'notice-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete own notice images" on storage.objects;
create policy "Users delete own notice images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'notice-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
