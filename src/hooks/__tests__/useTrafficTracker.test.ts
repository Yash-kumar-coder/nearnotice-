import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTrafficTracker } from '../useTrafficTracker';
import { supabase } from '../../lib/supabase';

// Mock location
const mockLocation = {
  pathname: '/',
};

vi.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
}));

describe('useTrafficTracker Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockLocation.pathname = '/';
  });

  it('generates a session ID and records visit via Supabase RPC', () => {
    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: true, error: null } as any);

    renderHook(() => useTrafficTracker());

    expect(sessionStorage.getItem('nearnotice_v_hash')).toBeTruthy();
    expect(rpcSpy).toHaveBeenCalledWith('record_site_visit', {
      p_path: '/',
      p_visitor_hash: expect.any(String),
    });
  });

  it('skips tracking when path starts with /author', () => {
    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: true, error: null } as any);
    mockLocation.pathname = '/author/analytics';

    renderHook(() => useTrafficTracker());

    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
