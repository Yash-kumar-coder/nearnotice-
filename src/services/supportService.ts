import { supabase } from '../lib/supabase';

export type SupportTicketType =
  | 'contact_support'
  | 'report_notice'
  | 'report_user'
  | 'safety_inquiry'
  | 'general';

export type SupportTicketStatus = 'pending' | 'in_progress' | 'resolved' | 'dismissed';

export interface SupportTicket {
  id: string;
  type: SupportTicketType;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  target_id: string | null;
  target_type: 'notice' | 'user' | 'other' | null;
  reason: string | null;
  status: SupportTicketStatus;
  user_id: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateContactSupportPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface CreateReportPayload {
  targetType: 'notice' | 'user';
  targetId: string;
  reason: string;
  details: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
}

const LOCAL_STORAGE_KEY = 'nearnotice_support_tickets_cache';

function getLocalTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTicket(ticket: SupportTicket) {
  try {
    const list = getLocalTickets();
    const updated = [ticket, ...list.filter((t) => t.id !== ticket.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

export class SupportService {
  /**
   * Submit a Contact Support request
   */
  static async submitContactSupport(payload: CreateContactSupportPayload): Promise<{ success: boolean; id: string }> {
    const userRes = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const userId = userRes.data.user?.id || null;

    const row = {
      type: 'contact_support' as const,
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone?.trim() || null,
      subject: payload.subject.trim(),
      message: payload.message.trim(),
      target_id: null,
      target_type: null,
      reason: null,
      status: 'pending' as const,
      user_id: userId,
      admin_notes: null,
    };

    let generatedId = `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert(row)
        .select('id')
        .single();

      if (!error && data?.id) {
        generatedId = data.id;
      }
    } catch (err) {
      console.warn('[NearNotice] support_tickets table insert fallback to local cache:', err);
    }

    // Always mirror to local cache for instant retrieval & resilience
    saveLocalTicket({
      id: generatedId,
      ...row,
      created_at: new Date().toISOString(),
    });

    return { success: true, id: generatedId };
  }

  /**
   * Submit a Notice or User report
   */
  static async submitReport(payload: CreateReportPayload): Promise<{ success: boolean; id: string }> {
    const userRes = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const userId = userRes.data.user?.id || null;

    const row = {
      type: (payload.targetType === 'notice' ? 'report_notice' : 'report_user') as SupportTicketType,
      name: payload.reporterName?.trim() || null,
      email: payload.reporterEmail?.trim() || null,
      phone: payload.reporterPhone?.trim() || null,
      subject: `Report ${payload.targetType}: ${payload.reason}`,
      message: payload.details.trim(),
      target_id: payload.targetId.trim(),
      target_type: payload.targetType,
      reason: payload.reason,
      status: 'pending' as const,
      user_id: userId,
      admin_notes: null,
    };

    let generatedId = `report-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert(row)
        .select('id')
        .single();

      if (!error && data?.id) {
        generatedId = data.id;
      }

      // Also submit to legacy notice_reports if it's a notice report and UUID
      if (payload.targetType === 'notice' && payload.targetId.length > 20) {
        try {
          await supabase.from('notice_reports').insert({
            notice_id: payload.targetId,
            reporter_id: userId,
            reason: payload.reason,
            details: payload.details.trim() || null,
          });
        } catch {
          // Ignore legacy table errors
        }
      }
    } catch (err) {
      console.warn('[NearNotice] report table insert fallback to local cache:', err);
    }

    saveLocalTicket({
      id: generatedId,
      ...row,
      created_at: new Date().toISOString(),
    });

    return { success: true, id: generatedId };
  }

  /**
   * Fetch all tickets for Admin Console
   */
  static async fetchAdminTickets(): Promise<SupportTicket[]> {
    let serverTickets: SupportTicket[] = [];

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        serverTickets = data as SupportTicket[];
      }
    } catch (err) {
      console.warn('[NearNotice] Unable to fetch support_tickets from server:', err);
    }

    // Merge with local cached tickets that might not yet be in DB
    const local = getLocalTickets();
    const serverIds = new Set(serverTickets.map((t) => t.id));
    const merged = [...serverTickets];

    for (const item of local) {
      if (!serverIds.has(item.id)) {
        merged.push(item);
      }
    }

    // Sort by created_at desc
    return merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Update status of a ticket in Admin console
   */
  static async updateTicketStatus(
    id: string,
    status: SupportTicketStatus,
    adminNotes?: string
  ): Promise<boolean> {
    try {
      await supabase
        .from('support_tickets')
        .update({
          status,
          admin_notes: adminNotes !== undefined ? adminNotes : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch {
      // Fallback
    }

    // Update local cache
    const list = getLocalTickets();
    const updated = list.map((t) =>
      t.id === id ? { ...t, status, admin_notes: adminNotes ?? t.admin_notes } : t
    );
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    return true;
  }

  /**
   * Delete a ticket in Admin console
   */
  static async deleteTicket(id: string): Promise<boolean> {
    try {
      await supabase.from('support_tickets').delete().eq('id', id);
    } catch {}

    const list = getLocalTickets();
    const updated = list.filter((t) => t.id !== id);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    return true;
  }
}
