-- ==============================================================================
-- NearNotice pgTAP Security & RLS Test Suite
-- ==============================================================================
begin;
select plan(7);

-- 1. Unconfirmed users have no profile
insert into auth.users (id, email, email_confirmed_at)
values ('11111111-1111-1111-1111-111111111111', 'unconfirmed@example.com', null);

select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'Unconfirmed users have no profile row'
);

-- Confirming user triggers profile creation
update auth.users
set email_confirmed_at = now()
where id = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'Confirmed user automatically creates profile row via trigger'
);

-- Setup User B
insert into auth.users (id, email, email_confirmed_at)
values ('22222222-2222-2222-2222-222222222222', 'user_b@example.com', now());

-- User A creates a published notice and a draft notice
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

insert into public.notices (id, owner_id, title, body, category, area_label, status)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Notice from User A',
  'Notice description body',
  'Community',
  'Downtown',
  'published'
);

insert into public.notices (id, owner_id, title, body, category, area_label, status)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '11111111-1111-1111-1111-111111111111',
  'Draft from User A',
  'Draft body',
  'Community',
  'Downtown',
  'draft'
);

-- 2. Anon reads published notices only
set local role anon;
select is(
  (select count(*) from public.notices where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'Anon can read published unexpired notices'
);

select is(
  (select count(*) from public.notices where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  0::bigint,
  'Anon cannot read draft notices'
);

-- 3. Anon cannot write notices
select throws_ok(
  $$
    insert into public.notices (owner_id, title, category, area_label)
    values ('11111111-1111-1111-1111-111111111111', 'Hacked notice', 'Community', 'Area')
  $$,
  '42501', -- Insufficient privilege
  'Anon cannot insert notices'
);

-- 4. User B cannot touch User A's notice
set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

update public.notices
set title = 'Malicious Edit'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  (select title from public.notices where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Notice from User A',
  'User B cannot update User A notice'
);

-- 5. Owner ID cannot be reassigned
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  $$
    update public.notices
    set owner_id = '22222222-2222-2222-2222-222222222222'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'P0001', -- Custom exception from trigger
  'Cannot reassign notice owner_id'
);

select * from finish();
rollback;
