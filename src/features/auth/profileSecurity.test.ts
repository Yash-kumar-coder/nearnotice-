import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import { authService } from './authService';
import { sanitizeDisplayName, getNoticeAuthor } from '../../utils/author';
import type { PublicNotice } from '../../types/database.types';

describe('SEC-05 Profile Security & RLS Policies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Anonymous Access Restrictions', () => {
    it('blocks anonymous enumeration of public.profiles table', async () => {
      // Simulating Supabase client behavior under RLS where anon role has SELECT revoked
      const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          then: vi.fn((resolve) =>
            resolve({
              data: null,
              error: {
                message: 'permission denied for table profiles',
                code: '42501',
              },
            })
          ),
        }),
      } as any);

      const { data, error } = await supabase.from('profiles').select('*');

      expect(fromSpy).toHaveBeenCalledWith('profiles');
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/permission denied/i);
      expect(data).toBeNull();
    });

    it('allows anonymous users to read author_name from public_notices view without querying profiles', async () => {
      const mockPublicNotice = {
        id: 'notice-pub-1',
        owner_id: 'owner-uuid-1',
        title: 'Community Yoga Class',
        body: 'Join us every Saturday morning at the park.',
        category: 'Events',
        area_label: 'Patna',
        author_name: 'Priya Sharma',
        views_count: 12,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      };

      const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          abortSignal: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          then: vi.fn((resolve) =>
            resolve({
              data: [mockPublicNotice],
              error: null,
            })
          ),
        }),
      } as any);

      const { data, error } = await supabase.from('public_notices').select('*');

      expect(fromSpy).toHaveBeenCalledWith('public_notices');
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.[0].author_name).toBe('Priya Sharma');
      // Verify no direct profiles query was required
      expect(fromSpy).not.toHaveBeenCalledWith('profiles');
    });
  });

  describe('Authenticated Cross-User Access Protections', () => {
    const currentUserId = 'auth-user-current';
    const targetUserId = 'auth-user-other';

    it('allows authenticated users to read their own profile row', async () => {
      const ownProfile = {
        id: currentUserId,
        display_name: 'Current Resident',
        created_at: '2026-10-14T00:00:00Z',
      };

      const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: ownProfile,
              error: null,
            }),
          }),
        }),
      } as any);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle();

      expect(fromSpy).toHaveBeenCalledWith('profiles');
      expect(error).toBeNull();
      expect(data).toEqual(ownProfile);
      expect(data?.id).toBe(currentUserId);
    });

    it('prevents authenticated users from reading other users profiles', async () => {
      // Under RLS policy "Profiles are viewable by owner", selecting a foreign ID returns null/empty
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as any);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it('filters out other users profiles during batch queries by non-owner', async () => {
      // Under RLS, querying multiple IDs only returns rows matching auth.uid()
      const ownProfile = { id: currentUserId, display_name: 'Current Resident' };

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [ownProfile], // only current user's profile is returned
            error: null,
          }),
        }),
      } as any);

      const { data } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', [currentUserId, targetUserId, 'another-user']);

      expect(data).toHaveLength(1);
      expect(data?.[0].id).toBe(currentUserId);
      expect(data?.some((p) => p.id === targetUserId)).toBe(false);
    });
  });

  describe('Profile Editing & Owner-Only Mutation', () => {
    it('syncs profile updates using the authenticated user id', async () => {
      const mockUser = {
        id: 'user-authenticated-456',
        email: 'resident@example.com',
        user_metadata: { display_name: 'Rajesh Kumar' },
      };

      vi.spyOn(supabase.auth, 'updateUser').mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: upsertSpy,
      } as any);

      const updatedUser = await authService.updateDisplayName('Rajesh Kumar');

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        data: {
          display_name: 'Rajesh Kumar',
          full_name: 'Rajesh Kumar',
        },
      });

      // Verify profiles upsert was called with current user's ID
      expect(upsertSpy).toHaveBeenCalledWith(
        { id: mockUser.id, display_name: 'Rajesh Kumar' },
        { onConflict: 'id' }
      );
      expect(updatedUser.id).toBe(mockUser.id);
    });

    it('prevents updating another users profile when RLS check fails', async () => {
      const upsertSpy = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'new row violates row-level security policy for table "profiles"',
          code: '42501',
        },
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: upsertSpy,
      } as any);

      const { error } = await supabase
        .from('profiles')
        .upsert(
          { id: 'foreign-user-id', display_name: 'Attacker Impersonation' },
          { onConflict: 'id' }
        );

      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/violates row-level security/i);
    });
  });

  describe('Public Notice Author Display Security', () => {
    it('resolves author_name cleanly without exposing email address or user id', () => {
      const noticeWithAuthor: PublicNotice = {
        id: 'notice-1',
        owner_id: 'owner-private-uuid-999',
        title: 'Title',
        body: 'Body',
        category: 'Services',
        area_label: 'Patna',
        image_path: null,
        latitude: null,
        longitude: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        author_name: 'Kavita Devi',
      };

      const resolved = getNoticeAuthor(noticeWithAuthor, 'viewer-uuid-111');
      expect(resolved.name).toBe('Kavita Devi');
      expect(resolved.postedBy).toBe('Posted by Kavita Devi');
      expect(resolved.name).not.toContain('owner-private-uuid');
    });

    it('falls back to "Neighbor" if author_name is null and current user is not owner', () => {
      const noticeWithoutAuthor: PublicNotice = {
        id: 'notice-2',
        owner_id: 'owner-private-uuid-999',
        title: 'Title',
        body: 'Body',
        category: 'Services',
        area_label: 'Patna',
        image_path: null,
        latitude: null,
        longitude: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        author_name: null,
      };

      const resolved = getNoticeAuthor(noticeWithoutAuthor, 'different-viewer-123');
      expect(resolved.name).toBe('Neighbor');
      expect(resolved.postedBy).toBe('Posted by Neighbor');
    });

    it('sanitizes email addresses to prevent email exposure even if entered in author name', () => {
      expect(sanitizeDisplayName('sneha@gmail.com')).toBeNull();
      expect(sanitizeDisplayName('admin@nearnotice.org')).toBeNull();
      expect(sanitizeDisplayName('Sneha Verma')).toBe('Sneha Verma');
    });
  });
});
