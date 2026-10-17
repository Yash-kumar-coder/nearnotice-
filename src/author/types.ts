// Types for Author Control Panel & Native Analytics

export interface AuthorOverviewMetrics {
  today_visitors: number;
  today_views: number;
  total_users: number;
  new_users_30d: number;
  total_notices: number;
  published_notices: number;
  inactive_notices: number;
  total_categories: number;
  category_distribution: Record<string, number>;
  daily_notices_30d: Array<{ date: string; count: number }>;
  daily_registrations_30d: Array<{ date: string; count: number }>;
  timezone: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface TrafficAnalytics {
  start_date: string;
  end_date: string;
  total_visitors: number;
  total_views: number;
  daily_trend: Array<{
    date: string;
    visitors: number;
    views: number;
  }>;
  top_pages: Array<{
    path: string;
    views: number;
    visitors: number;
  }>;
}

export interface AuthorNotice {
  id: string;
  title: string;
  content: string;
  category: string;
  status: 'published' | 'draft' | 'removed';
  created_at: string;
  updated_at?: string;
  owner_id: string;
  author_phone_masked?: string;
  contact_number?: string;
  views_count?: number;
  price?: number | null;
  area_label?: string;
}

export interface AuthorUser {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
  notices_count: number;
  published_notices_count: number;
}
