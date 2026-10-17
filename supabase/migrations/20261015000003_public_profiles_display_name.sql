-- ==============================================================================
-- NearNotice Migration: Allow Public Reading of Profile Display Names
-- Migration: 20261015000003_public_profiles_display_name.sql
-- ==============================================================================
begin;

-- 1. Grant SELECT on public.profiles to anon and authenticated roles
grant select on public.profiles to anon, authenticated;

-- 2. Drop restrictive owner-only select policy on profiles
drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Profiles display_name viewable by all" on public.profiles;

-- 3. Create public viewable policy so neighbors and visitors can see author usernames
create policy "Profiles display_name viewable by all"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- 4. Ensure authenticated users can insert their own profile on profile sync
drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

-- 5. Trigger Function Update: Do NOT default display_name to email or split_part(email, '@', 1)
create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (TG_OP = 'INSERT' and NEW.email_confirmed_at is not null) or
     (TG_OP = 'UPDATE' and OLD.email_confirmed_at is null and NEW.email_confirmed_at is not null) then
    
    insert into public.profiles (id, display_name, created_at)
    values (
      NEW.id,
      nullif(trim(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', '')), ''),
      now()
    )
    on conflict (id) do update
      set display_name = coalesce(nullif(trim(public.profiles.display_name), ''), excluded.display_name);
  end if;
  return NEW;
end;
$$;

-- 6. Data Sanitization: Clean any existing profiles where display_name contains an email address or equals the email prefix
update public.profiles p
set display_name = null
from auth.users u
where p.id = u.id
  and (
    p.display_name like '%@%'
    or lower(p.display_name) = lower(split_part(u.email, '@', 1))
  );

-- 7. Add author_name to notices table if not exists
alter table public.notices add column if not exists author_name text;

-- 8. Recreate public_notices view with owner_id and author_name
create or replace view public.public_notices
with (security_invoker = true) as
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
  n.contact_number,
  n.contact_type,
  n.views_count,
  round(n.latitude::numeric, 3) as latitude,
  round(n.longitude::numeric, 3) as longitude,
  n.created_at,
  n.expires_at,
  coalesce(nullif(trim(n.author_name), ''), nullif(trim(p.display_name), ''), 'Neighbor') as author_name
from public.notices n
left join public.profiles p on n.owner_id = p.id
where n.status = 'published'
  and n.expires_at > now();

commit;

