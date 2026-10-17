-- ==============================================================================
-- NearNotice Production Author Control, Dynamic Categories & Native Analytics
-- Migration: 20261017000010_author_control_and_categories.sql
-- ==============================================================================
begin;

-- 1. Admin Roles Store
create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'super_admin' check (role in ('admin', 'super_admin')),
  notes text default 'Author console access',
  created_at timestamptz not null default pg_catalog.now()
);

alter table public.admin_roles enable row level security;
revoke all on public.admin_roles from public, anon, authenticated;
grant select on public.admin_roles to authenticated;

drop policy if exists "Users can check own admin role" on public.admin_roles;
create policy "Users can check own admin role"
  on public.admin_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Provision primary author administrator (id provided by owner)
insert into public.admin_roles (user_id, role, notes)
values ('a8f637e8-2dfc-4b88-971c-5af7aabbe941', 'super_admin', 'Initial owner administrator')
on conflict (user_id) do update set role = 'super_admin';

-- 2. Security Definer Helper: is_admin()
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  caller_id uuid;
  has_role boolean;
begin
  caller_id := auth.uid();
  if caller_id is null then
    return false;
  end if;

  select exists(
    select 1
    from public.admin_roles r
    where r.user_id = caller_id
  ) into has_role;

  return coalesce(has_role, false);
end;
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 3. Dynamic Categories Table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null default 'Tag',
  color text not null default 'blue',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

alter table public.categories enable row level security;

-- Public can read all active categories (or all if admin)
drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
  on public.categories
  for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

-- Only admins can insert, update, or delete categories
drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories"
  on public.categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

-- Seed initial standard categories matching existing NearNotice categories
insert into public.categories (name, slug, icon, color, is_active, sort_order)
values
  ('Items for Sale', 'items-for-sale', 'ShoppingBag', 'amber', true, 1),
  ('Services', 'services', 'Wrench', 'emerald', true, 2),
  ('Community', 'community', 'Users', 'blue', true, 3),
  ('Jobs & Gigs', 'jobs-gigs', 'Briefcase', 'indigo', true, 4),
  ('Events', 'events', 'Calendar', 'purple', true, 5),
  ('Lost & Found', 'lost-found', 'Search', 'rose', true, 6),
  ('Rentals', 'rentals', 'Home', 'cyan', true, 7),
  ('General', 'general', 'Layers', 'slate', true, 8),
  ('Emergency', 'emergency', 'AlertTriangle', 'red', true, 9)
on conflict (slug) do nothing;

-- 4. Supabase-Native Visitor Analytics Table (Daily rollup)
create table if not exists public.site_analytics_daily (
  id uuid primary key default gen_random_uuid(),
  visit_date date not null default (pg_catalog.now() at time zone 'Asia/Kolkata')::date,
  page_path text not null,
  views_count bigint not null default 0,
  unique_visitors bigint not null default 0,
  visitor_hashes text[] not null default '{}',
  created_at timestamptz not null default pg_catalog.now(),
  unique (visit_date, page_path)
);

create index if not exists idx_site_analytics_date
  on public.site_analytics_daily (visit_date desc);

alter table public.site_analytics_daily enable row level security;
revoke all on public.site_analytics_daily from public, anon, authenticated;
grant select on public.site_analytics_daily to authenticated;

drop policy if exists "Admins can view site analytics" on public.site_analytics_daily;
create policy "Admins can view site analytics"
  on public.site_analytics_daily
  for select
  to authenticated
  using (public.is_admin());

-- Fast atomic logging RPC for client navigations
create or replace function public.record_site_visit(
  p_path text,
  p_visitor_hash text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  curr_date date;
  clean_path text;
  v_hash text;
begin
  -- Exclude private author routes from analytics
  if p_path ilike '/author%' then
    return;
  end if;

  clean_path := split_part(p_path, '?', 1);
  if clean_path = '' or clean_path is null then
    clean_path := '/';
  end if;

  curr_date := (pg_catalog.now() at time zone 'Asia/Kolkata')::date;
  v_hash := coalesce(nullif(trim(p_visitor_hash), ''), 'anon');

  insert into public.site_analytics_daily (
    visit_date,
    page_path,
    views_count,
    unique_visitors,
    visitor_hashes
  ) values (
    curr_date,
    clean_path,
    1,
    case when v_hash <> 'anon' then 1 else 0 end,
    case when v_hash <> 'anon' then array[v_hash] else '{}'::text[] end
  )
  on conflict (visit_date, page_path) do update
  set
    views_count = public.site_analytics_daily.views_count + 1,
    unique_visitors = case
      when v_hash <> 'anon' and not (public.site_analytics_daily.visitor_hashes @> array[v_hash])
      then public.site_analytics_daily.unique_visitors + 1
      else public.site_analytics_daily.unique_visitors
    end,
    visitor_hashes = case
      when v_hash <> 'anon' and not (public.site_analytics_daily.visitor_hashes @> array[v_hash])
      then array_append(public.site_analytics_daily.visitor_hashes, v_hash)
      else public.site_analytics_daily.visitor_hashes
    end;
end;
$$;

grant execute on function public.record_site_visit(text, text) to anon, authenticated;

-- 5. Audit Log Table
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default pg_catalog.now()
);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;
grant select on public.admin_audit_log to authenticated;

drop policy if exists "Admins can view audit log" on public.admin_audit_log;
create policy "Admins can view audit log"
  on public.admin_audit_log
  for select
  to authenticated
  using (public.is_admin());

create index if not exists idx_admin_audit_log_created_at
  on public.admin_audit_log (created_at desc);

-- 6. Additive Admin Policies on notices
drop policy if exists "Admins can select all notices" on public.notices;
create policy "Admins can select all notices"
  on public.notices
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update notices" on public.notices;
create policy "Admins can update notices"
  on public.notices
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete notices" on public.notices;
create policy "Admins can delete notices"
  on public.notices
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- 7. Privileged RPC: Overview Metrics
create or replace function public.get_author_overview_metrics()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  caller_is_admin boolean;
  curr_date date;
  v_today_visitors bigint;
  v_today_views bigint;
  v_total_users bigint;
  v_new_users_30d bigint;
  v_total_notices bigint;
  v_published_notices bigint;
  v_inactive_notices bigint;
  v_total_categories bigint;
  v_category_distribution jsonb;
  v_daily_notices_30d jsonb;
  v_daily_registrations_30d jsonb;
  threshold_date timestamptz;
begin
  select public.is_admin() into caller_is_admin;
  if not caller_is_admin then
    raise exception 'Access denied: Administrator privileges required' using errcode = '42501';
  end if;

  curr_date := (pg_catalog.now() at time zone 'Asia/Kolkata')::date;
  threshold_date := pg_catalog.now() - interval '30 days';

  -- Today's traffic
  select
    coalesce(sum(unique_visitors), 0),
    coalesce(sum(views_count), 0)
  into v_today_visitors, v_today_views
  from public.site_analytics_daily
  where visit_date = curr_date;

  -- User aggregates
  select count(*) into v_total_users from auth.users;
  select count(*) into v_new_users_30d from auth.users where created_at >= threshold_date;

  -- Notice aggregates
  select count(*) into v_total_notices from public.notices;
  select count(*) into v_published_notices from public.notices where status = 'published';
  select count(*) into v_inactive_notices from public.notices where status in ('draft', 'archived', 'removed');

  -- Category counts
  select count(*) into v_total_categories from public.categories where is_active = true;

  -- Category distribution from notices
  select coalesce(jsonb_object_agg(c.cat, c.cnt), '{}'::jsonb) into v_category_distribution
  from (
    select coalesce(nullif(trim(category), ''), 'uncategorized') as cat, count(*) as cnt
    from public.notices
    group by 1
    order by 2 desc
  ) c;

  -- Daily notices (last 30 days)
  select jsonb_agg(
    jsonb_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'),
      'count', coalesce(t.cnt, 0)
    )
  ) into v_daily_notices_30d
  from (
    select generate_series(
      date_trunc('day', threshold_date),
      date_trunc('day', pg_catalog.now()),
      interval '1 day'
    ) as day
  ) d
  left join (
    select date_trunc('day', created_at) as day, count(*) as cnt
    from public.notices
    where created_at >= threshold_date
    group by 1
  ) t on d.day = t.day;

  -- Daily user registrations (last 30 days)
  select jsonb_agg(
    jsonb_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'),
      'count', coalesce(u.cnt, 0)
    )
  ) into v_daily_registrations_30d
  from (
    select generate_series(
      date_trunc('day', threshold_date),
      date_trunc('day', pg_catalog.now()),
      interval '1 day'
    ) as day
  ) d
  left join (
    select date_trunc('day', created_at) as day, count(*) as cnt
    from auth.users
    where created_at >= threshold_date
    group by 1
  ) u on d.day = u.day;

  return jsonb_build_object(
    'today_visitors', v_today_visitors,
    'today_views', v_today_views,
    'total_users', coalesce(v_total_users, 0),
    'new_users_30d', coalesce(v_new_users_30d, 0),
    'total_notices', coalesce(v_total_notices, 0),
    'published_notices', coalesce(v_published_notices, 0),
    'inactive_notices', coalesce(v_inactive_notices, 0),
    'total_categories', coalesce(v_total_categories, 0),
    'category_distribution', coalesce(v_category_distribution, '{}'::jsonb),
    'daily_notices_30d', coalesce(v_daily_notices_30d, '[]'::jsonb),
    'daily_registrations_30d', coalesce(v_daily_registrations_30d, '[]'::jsonb),
    'timezone', 'Asia/Kolkata'
  );
end;
$$;

revoke execute on function public.get_author_overview_metrics() from public, anon;
grant execute on function public.get_author_overview_metrics() to authenticated;

-- 8. Privileged RPC: Native Supabase Traffic Analytics (Custom date ranges)
create or replace function public.get_author_traffic_analytics(
  p_start_date date default null,
  p_end_date date default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  caller_is_admin boolean;
  v_start date;
  v_end date;
  v_total_visitors bigint;
  v_total_views bigint;
  v_daily_trend jsonb;
  v_top_pages jsonb;
begin
  select public.is_admin() into caller_is_admin;
  if not caller_is_admin then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  v_end := coalesce(p_end_date, (pg_catalog.now() at time zone 'Asia/Kolkata')::date);
  v_start := coalesce(p_start_date, v_end - integer '29');

  -- Aggregate totals
  select
    coalesce(sum(unique_visitors), 0),
    coalesce(sum(views_count), 0)
  into v_total_visitors, v_total_views
  from public.site_analytics_daily
  where visit_date between v_start and v_end;

  -- Daily trend
  select jsonb_agg(
    jsonb_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'),
      'visitors', coalesce(t.visitors, 0),
      'views', coalesce(t.views, 0)
    )
    order by d.day asc
  ) into v_daily_trend
  from (
    select generate_series(v_start::timestamp, v_end::timestamp, interval '1 day')::date as day
  ) d
  left join (
    select
      visit_date as day,
      sum(unique_visitors) as visitors,
      sum(views_count) as views
    from public.site_analytics_daily
    where visit_date between v_start and v_end
    group by visit_date
  ) t on d.day = t.day;

  -- Top visited pages
  select jsonb_agg(
    jsonb_build_object(
      'path', page_path,
      'views', total_page_views,
      'visitors', total_page_visitors
    )
  ) into v_top_pages
  from (
    select
      page_path,
      sum(views_count) as total_page_views,
      sum(unique_visitors) as total_page_visitors
    from public.site_analytics_daily
    where visit_date between v_start and v_end
    group by page_path
    order by total_page_views desc
    limit 10
  ) p;

  return jsonb_build_object(
    'start_date', v_start,
    'end_date', v_end,
    'total_visitors', v_total_visitors,
    'total_views', v_total_views,
    'daily_trend', coalesce(v_daily_trend, '[]'::jsonb),
    'top_pages', coalesce(v_top_pages, '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_author_traffic_analytics(date, date) from public, anon;
grant execute on function public.get_author_traffic_analytics(date, date) to authenticated;

-- 9. Privileged Mutation RPC: author_mutate_notice
create or replace function public.author_mutate_notice(
  p_notice_id uuid,
  p_action text,
  p_patch jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  caller_is_admin boolean;
  old_row record;
  updated_row record;
  new_status text;
  new_title text;
  new_content text;
  new_category text;
begin
  caller_id := auth.uid();
  select public.is_admin() into caller_is_admin;
  if not caller_is_admin or caller_id is null then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select * into old_row from public.notices where id = p_notice_id;
  if not found then
    raise exception 'Notice not found' using errcode = 'P0002';
  end if;

  if p_action = 'hard_delete' then
    delete from public.notices where id = p_notice_id;

    insert into public.admin_audit_log (
      actor_id, action, target_type, target_id, metadata
    ) values (
      caller_id, 'hard_delete', 'notice', p_notice_id,
      jsonb_build_object('title', old_row.title, 'category', old_row.category)
    );

    return jsonb_build_object('success', true, 'action', 'hard_delete', 'id', p_notice_id);
  end if;

  if p_action = 'publish' then
    new_status := 'published';
  elsif p_action = 'unpublish' then
    new_status := 'draft';
  elsif p_action = 'soft_delete' then
    new_status := 'removed';
  elsif p_action = 'edit' then
    new_title := nullif(trim(p_patch->>'title'), '');
    new_content := coalesce(p_patch->>'body', p_patch->>'content');
    new_category := nullif(trim(p_patch->>'category'), '');
  else
    raise exception 'Invalid action: %', p_action using errcode = '22023';
  end if;

  update public.notices
  set
    status = coalesce(new_status, status),
    title = coalesce(new_title, title),
    body = coalesce(new_content, body),
    category = coalesce(new_category, category),
    updated_at = pg_catalog.now()
  where id = p_notice_id
  returning * into updated_row;

  insert into public.admin_audit_log (
    actor_id, action, target_type, target_id, metadata
  ) values (
    caller_id, p_action, 'notice', p_notice_id,
    jsonb_build_object(
      'before', jsonb_build_object('status', old_row.status, 'title', old_row.title),
      'after', jsonb_build_object('status', updated_row.status, 'title', updated_row.title)
    )
  );

  return jsonb_build_object(
    'success', true,
    'id', updated_row.id,
    'status', updated_row.status,
    'title', updated_row.title,
    'category', updated_row.category,
    'updated_at', updated_row.updated_at
  );
end;
$$;

revoke execute on function public.author_mutate_notice(uuid, text, jsonb) from public, anon;
grant execute on function public.author_mutate_notice(uuid, text, jsonb) to authenticated;

-- 10. Privileged Contact Reveal RPC: author_reveal_contact
create or replace function public.author_reveal_contact(p_notice_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  caller_is_admin boolean;
  phone_res text;
begin
  caller_id := auth.uid();
  select public.is_admin() into caller_is_admin;
  if not caller_is_admin or caller_id is null then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select contact_number into phone_res from public.notices where id = p_notice_id;

  insert into public.admin_audit_log (
    actor_id, action, target_type, target_id, metadata
  ) values (
    caller_id, 'reveal_contact_number', 'notice', p_notice_id,
    jsonb_build_object('timestamp', pg_catalog.now())
  );

  return phone_res;
end;
$$;

revoke execute on function public.author_reveal_contact(uuid) from public, anon;
grant execute on function public.author_reveal_contact(uuid) to authenticated;

-- 11. Privileged Category Manager RPC: author_manage_category
create or replace function public.author_manage_category(
  p_action text,
  p_id uuid default null,
  p_name text default null,
  p_slug text default null,
  p_icon text default 'Tag',
  p_color text default 'blue',
  p_is_active boolean default true,
  p_sort_order integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  caller_is_admin boolean;
  clean_slug text;
  result_row record;
begin
  caller_id := auth.uid();
  select public.is_admin() into caller_is_admin;
  if not caller_is_admin or caller_id is null then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  if p_action = 'create' then
    if p_name is null or trim(p_name) = '' then
      raise exception 'Category name is required' using errcode = '22023';
    end if;

    clean_slug := coalesce(nullif(trim(p_slug), ''), lower(regexp_replace(trim(p_name), '\s+', '-', 'g')));

    insert into public.categories (name, slug, icon, color, is_active, sort_order)
    values (trim(p_name), clean_slug, coalesce(p_icon, 'Tag'), coalesce(p_color, 'blue'), coalesce(p_is_active, true), coalesce(p_sort_order, 0))
    returning * into result_row;

    insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
    values (caller_id, 'create_category', 'category', result_row.id, jsonb_build_object('name', result_row.name, 'slug', result_row.slug));

    return jsonb_build_object('success', true, 'category', to_jsonb(result_row));

  elsif p_action = 'update' then
    update public.categories
    set
      name = coalesce(nullif(trim(p_name), ''), name),
      slug = coalesce(nullif(trim(p_slug), ''), slug),
      icon = coalesce(p_icon, icon),
      color = coalesce(p_color, color),
      is_active = coalesce(p_is_active, is_active),
      sort_order = coalesce(p_sort_order, sort_order),
      updated_at = pg_catalog.now()
    where id = p_id
    returning * into result_row;

    if not found then
      raise exception 'Category not found' using errcode = 'P0002';
    end if;

    insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
    values (caller_id, 'update_category', 'category', p_id, jsonb_build_object('name', result_row.name));

    return jsonb_build_object('success', true, 'category', to_jsonb(result_row));

  elsif p_action = 'toggle_active' then
    update public.categories
    set is_active = not is_active, updated_at = pg_catalog.now()
    where id = p_id
    returning * into result_row;

    if not found then
      raise exception 'Category not found' using errcode = 'P0002';
    end if;

    insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
    values (caller_id, 'toggle_category_active', 'category', p_id, jsonb_build_object('is_active', result_row.is_active));

    return jsonb_build_object('success', true, 'category', to_jsonb(result_row));

  elsif p_action = 'delete' then
    delete from public.categories where id = p_id returning * into result_row;

    if not found then
      raise exception 'Category not found' using errcode = 'P0002';
    end if;

    insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
    values (caller_id, 'delete_category', 'category', p_id, jsonb_build_object('name', result_row.name));

    return jsonb_build_object('success', true, 'id', p_id);

  else
    raise exception 'Invalid action: %', p_action using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.author_manage_category(text, uuid, text, text, text, text, boolean, integer) from public, anon;
grant execute on function public.author_manage_category(text, uuid, text, text, text, text, boolean, integer) to authenticated;

-- 12. Privileged RPC: Users Directory
create or replace function public.get_author_users_directory(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  caller_is_admin boolean;
  total_count bigint;
  users_data jsonb;
begin
  select public.is_admin() into caller_is_admin;
  if not caller_is_admin then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  if p_limit > 100 then
    p_limit := 100;
  end if;
  if p_limit < 1 then
    p_limit := 25;
  end if;

  select count(*) into total_count
  from auth.users u
  left join public.profiles p on u.id = p.id
  where (
    p_search is null 
    or p_search = ''
    or u.email ilike ('%' || p_search || '%')
    or p.display_name ilike ('%' || p_search || '%')
  );

  select jsonb_agg(
    jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'display_name', coalesce(p.display_name, split_part(u.email, '@', 1)),
      'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at,
      'is_confirmed', (u.email_confirmed_at is not null),
      'notices_count', coalesce(nc.cnt, 0),
      'published_notices_count', coalesce(nc.pub_cnt, 0)
    )
  ) into users_data
  from auth.users u
  left join public.profiles p on u.id = p.id
  left join (
    select
      owner_id,
      count(*) as cnt,
      count(*) filter (where status = 'published') as pub_cnt
    from public.notices
    group by owner_id
  ) nc on u.id = nc.owner_id
  where (
    p_search is null 
    or p_search = ''
    or u.email ilike ('%' || p_search || '%')
    or p.display_name ilike ('%' || p_search || '%')
  )
  order by u.created_at desc
  offset p_offset
  limit p_limit;

  return jsonb_build_object(
    'total', coalesce(total_count, 0),
    'offset', p_offset,
    'limit', p_limit,
    'users', coalesce(users_data, '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_author_users_directory(text, integer, integer) from public, anon;
grant execute on function public.get_author_users_directory(text, integer, integer) to authenticated;

commit;
