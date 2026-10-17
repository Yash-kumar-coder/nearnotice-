-- ==============================================================================
-- NearNotice Performance Migration: Composite Partial Indexes for Active Feed
-- Migration: 20261016000007_feed_performance_indexes.sql
-- ==============================================================================
-- Justification:
-- At 1,000 to 10,000+ notices, feed queries on public.public_notices filter by:
--   status = 'published' and expires_at > now()
-- and sort by:
--   created_at desc, id desc
--
-- Adding composite partial indexes filtered on status = 'published' allows PostgreSQL
-- to satisfy cursor pagination with direct index range scans, skipping drafts,
-- deleted, or moderated notices without expensive table scans.
-- ==============================================================================

begin;

-- 1. Composite partial index for default feed cursor pagination (created_at desc, id desc)
create index if not exists idx_notices_active_feed
  on public.notices (created_at desc, id desc)
  where status = 'published';

-- 2. Composite partial index for category-filtered feed pagination
create index if not exists idx_notices_active_category_feed
  on public.notices (category, created_at desc, id desc)
  where status = 'published';

commit;
