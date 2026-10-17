import { supabase } from '../lib/supabase';
import type {
  AuthorOverviewMetrics,
  CategoryItem,
  TrafficAnalytics,
  AuthorNotice,
  AuthorUser,
} from './types';

export class AuthorService {
  /**
   * Check if current authenticated user has author/admin clearance
   */
  static async checkClearance(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.rpc('is_admin');
      if (error) {
        console.error('Clearance check error:', error);
        return false;
      }
      return Boolean(data);
    } catch {
      return false;
    }
  }

  /**
   * Overview metrics (today visitors, totals, 30d creation velocity)
   */
  static async getOverview(): Promise<AuthorOverviewMetrics> {
    const { data, error } = await supabase.rpc('get_author_overview_metrics');
    if (error) throw new Error(error.message);
    return data as AuthorOverviewMetrics;
  }

  /**
   * Native Supabase visitor analytics for any date range
   */
  static async getTrafficAnalytics(startDate?: string, endDate?: string): Promise<TrafficAnalytics> {
    const { data, error } = await supabase.rpc('get_author_traffic_analytics', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });
    if (error) throw new Error(error.message);
    return data as TrafficAnalytics;
  }

  /**
   * Fetch notices with server-side pagination, category, and status filters
   */
  static async getNotices(params: {
    search?: string;
    category?: string;
    status?: string;
    page: number;
    limit: number;
  }): Promise<{ notices: AuthorNotice[]; total: number }> {
    const { search = '', category = 'all', status = 'all', page, limit } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('notices')
      .select('id, title, body, category, status, created_at, updated_at, owner_id, contact_number, views_count, price, area_label', { count: 'exact' });

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    const masked: AuthorNotice[] = (data || []).map((n) => {
      let author_phone_masked = undefined;
      if (n.contact_number) {
        author_phone_masked = n.contact_number.length > 4
          ? '••••••' + n.contact_number.slice(-4)
          : '••••';
      }
      return {
        id: n.id,
        title: n.title,
        content: n.body || '',
        category: n.category,
        status: n.status as 'published' | 'draft' | 'removed',
        created_at: n.created_at,
        updated_at: n.updated_at,
        owner_id: n.owner_id,
        author_phone_masked,
        contact_number: undefined, // stripped from list view
        views_count: n.views_count,
        price: n.price,
        area_label: n.area_label,
      };
    });

    return { notices: masked, total: count || 0 };
  }

  /**
   * Mutate notice (edit, soft delete, hard delete, publish/unpublish)
   */
  static async mutateNotice(
    noticeId: string,
    action: 'publish' | 'unpublish' | 'edit' | 'soft_delete' | 'hard_delete',
    patch?: { title?: string; body?: string; category?: string }
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('author_mutate_notice', {
      p_notice_id: noticeId,
      p_action: action,
      p_patch: patch || {},
    });
    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  /**
   * Reveal masked phone number with server-side audit
   */
  static async revealContact(noticeId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('author_reveal_contact', {
      p_notice_id: noticeId,
    });
    if (error) throw new Error(error.message);
    return data as string;
  }

  /**
   * Fetch all categories (active & inactive)
   */
  static async getCategories(): Promise<CategoryItem[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as CategoryItem[];
  }

  /**
   * Manage categories (create, update, toggle active, delete)
   */
  static async manageCategory(params: {
    action: 'create' | 'update' | 'toggle_active' | 'delete';
    id?: string;
    name?: string;
    slug?: string;
    icon?: string;
    color?: string;
    is_active?: boolean;
    sort_order?: number;
  }): Promise<boolean> {
    const { data, error } = await supabase.rpc('author_manage_category', {
      p_action: params.action,
      p_id: params.id || null,
      p_name: params.name || null,
      p_slug: params.slug || null,
      p_icon: params.icon || 'Tag',
      p_color: params.color || 'blue',
      p_is_active: params.is_active ?? true,
      p_sort_order: params.sort_order ?? 0,
    });

    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  /**
   * Users directory with search & pagination
   */
  static async getUsers(params: {
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ users: AuthorUser[]; total: number }> {
    const { search = '', page, limit } = params;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase.rpc('get_author_users_directory', {
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw new Error(error.message);
    const payload = data as { users: AuthorUser[]; total: number };
    return {
      users: payload.users || [],
      total: payload.total || 0,
    };
  }
}
