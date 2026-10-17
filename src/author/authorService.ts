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
   * Fetch notices with server-side pagination, category, status, and reports
   */
  static async getNotices(params: {
    search?: string;
    category?: string;
    status?: string;
    reportedOnly?: boolean;
    page: number;
    limit: number;
  }): Promise<{ notices: AuthorNotice[]; total: number }> {
    const { search = '', category = 'all', status = 'all', page, limit } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let reportedNoticeIds: string[] | null = null;
    if (status === 'reported') {
      try {
        const { data: repData } = await supabase
          .from('notice_reports')
          .select('notice_id');
        reportedNoticeIds = Array.from(new Set((repData || []).map((r: any) => r.notice_id)));
        if (reportedNoticeIds.length === 0) {
          return { notices: [], total: 0 };
        }
      } catch {
        reportedNoticeIds = [];
      }
    }

    let query = supabase
      .from('notices')
      .select('id, title, body, category, status, created_at, updated_at, owner_id, contact_number, views_count, price, area_label, notice_reports(id, reason, details, status, created_at)', { count: 'exact' });

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (status === 'reported') {
      if (reportedNoticeIds && reportedNoticeIds.length > 0) {
        query = query.in('id', reportedNoticeIds);
      } else {
        return { notices: [], total: 0 };
      }
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    let { data, error, count } = await query;
    if (error) {
      // Graceful fallback if notice_reports relation is not yet exposed via PostgREST
      let fallbackQuery = supabase
        .from('notices')
        .select('id, title, body, category, status, created_at, updated_at, owner_id, contact_number, views_count, price, area_label', { count: 'exact' });

      if (category !== 'all') {
        fallbackQuery = fallbackQuery.eq('category', category);
      }
      if (status === 'reported' && reportedNoticeIds && reportedNoticeIds.length > 0) {
        fallbackQuery = fallbackQuery.in('id', reportedNoticeIds);
      } else if (status !== 'all' && status !== 'reported') {
        fallbackQuery = fallbackQuery.eq('status', status);
      }
      if (search.trim()) {
        fallbackQuery = fallbackQuery.ilike('title', `%${search.trim()}%`);
      }

      fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).range(from, to);
      const fallbackRes = await fallbackQuery;
      if (fallbackRes.error) throw new Error(fallbackRes.error.message);
      data = fallbackRes.data as any;
      count = fallbackRes.count;
    }

    // Always ensure reports are attached even if relation join returned empty
    const noticeIds = (data || []).map((n: any) => n.id);
    const reportsByNoticeId: Record<string, any[]> = {};
    if (noticeIds.length > 0) {
      try {
        const { data: repList } = await supabase
          .from('notice_reports')
          .select('id, notice_id, reason, details, status, created_at')
          .in('notice_id', noticeIds);
        if (repList) {
          for (const rep of repList) {
            if (!reportsByNoticeId[rep.notice_id]) reportsByNoticeId[rep.notice_id] = [];
            reportsByNoticeId[rep.notice_id].push(rep);
          }
        }
      } catch {
        // ignore fallback errors
      }
    }

    const masked: AuthorNotice[] = (data || []).map((n: any) => {
      let author_phone_masked = undefined;
      if (n.contact_number) {
        author_phone_masked = n.contact_number.length > 4
          ? '••••••' + n.contact_number.slice(-4)
          : '••••';
      }
      const rawReports = Array.isArray(n.notice_reports) && n.notice_reports.length > 0
        ? n.notice_reports
        : (reportsByNoticeId[n.id] || []);
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
        reports_count: rawReports.length,
        reports: rawReports,
      };
    });

    return { notices: masked, total: count || 0 };
  }

  /**
   * Dismiss/resolve reports on a notice
   */
  static async dismissNoticeReports(noticeId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notice_reports')
      .delete()
      .eq('notice_id', noticeId);
    if (error) throw new Error(error.message);
    return true;
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
