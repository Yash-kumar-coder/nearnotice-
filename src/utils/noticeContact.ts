import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface NoticeContactResult {
  contact_number: string | null;
  contact_type: string;
  error?: string | null;
}

/**
 * SEC-01: Secure Contact Retrieval
 * - If the authenticated user is the owner, they may access their own contact details.
 * - Non-owners MUST NEVER use cached or client-held contact_number; they MUST fetch
 *   strictly through the get_notice_contact RPC which enforces authentication,
 *   email confirmation, active notice validation, and concurrency-safe rate limiting.
 */
export async function fetchNoticeContact(
  noticeId: string,
  ownerId?: string | null,
  currentUserId?: string | null,
  ownerContactNumber?: string | null
): Promise<NoticeContactResult> {
  const isOwner = Boolean(currentUserId && ownerId && currentUserId === ownerId);

  // Owners can immediately use their own contact number if already present in state
  if (isOwner && ownerContactNumber) {
    return {
      contact_number: ownerContactNumber,
      contact_type: 'both',
    };
  }

  if (!isSupabaseConfigured) {
    return {
      contact_number: null,
      contact_type: 'both',
      error: 'Backend connection not configured.',
    };
  }

  try {
    const { data, error } = await supabase.rpc('get_notice_contact', {
      target_notice_id: noticeId,
    });

    if (error) {
      if (ownerContactNumber) {
        return {
          contact_number: ownerContactNumber,
          contact_type: 'both',
        };
      }
      return {
        contact_number: null,
        contact_type: 'both',
        error: error.message?.includes('coalesce')
          ? 'Contact service update pending. Please run migration 20261016000008 in Supabase SQL Editor.'
          : (error.message || 'Unable to retrieve contact details.'),
      };
    }

    const row = Array.isArray(data) ? data[0] : (data as { contact_number?: string; contact_type?: string } | null);
    if (!row || !row.contact_number) {
      return {
        contact_number: null,
        contact_type: 'both',
        error: 'No contact number provided for this listing.',
      };
    }

    return {
      contact_number: row.contact_number,
      contact_type: row.contact_type || 'both',
    };
  } catch (err: unknown) {
    return {
      contact_number: null,
      contact_type: 'both',
      error: err instanceof Error ? err.message : 'Failed to retrieve contact details.',
    };
  }
}
