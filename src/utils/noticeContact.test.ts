import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNoticeContact } from './noticeContact';
import { supabase } from '../lib/supabase';

describe('fetchNoticeContact utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('immediately returns phone number for notice owner without hitting RPC if already in memory', async () => {
    const rpcSpy = vi.spyOn(supabase, 'rpc');

    const result = await fetchNoticeContact(
      'notice-1',
      'owner-user-id',
      'owner-user-id',
      '9876543210'
    );

    expect(result).toEqual({
      contact_number: '9876543210',
      contact_type: 'both',
    });
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('strictly forces non-owners to fetch through get_notice_contact RPC even if a phone was passed', async () => {
    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: [{ contact_number: '9876543210', contact_type: 'whatsapp' }],
      error: null,
    } as any);

    const result = await fetchNoticeContact(
      'notice-1',
      'owner-user-id',
      'visitor-user-id',
      'cached-phone-number-should-be-ignored'
    );

    expect(rpcSpy).toHaveBeenCalledWith('get_notice_contact', {
      target_notice_id: 'notice-1',
    });
    expect(result).toEqual({
      contact_number: '9876543210',
      contact_type: 'whatsapp',
    });
  });

  it('handles rate limit or auth exceptions from RPC gracefully', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: null,
      error: { message: 'Rate limit exceeded: Maximum 25 contact requests per hour reached', code: 'P0004' },
    } as any);

    const result = await fetchNoticeContact(
      'notice-1',
      'owner-user-id',
      'visitor-user-id',
      null
    );

    expect(result.contact_number).toBeNull();
    expect(result.error).toContain('Rate limit exceeded');
  });

  it('handles notice not found or empty response gracefully', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: [],
      error: null,
    } as any);

    const result = await fetchNoticeContact(
      'notice-999',
      'owner-user-id',
      'visitor-user-id',
      null
    );

    expect(result.contact_number).toBeNull();
    expect(result.error).toBe('No contact number provided for this listing.');
  });
});
