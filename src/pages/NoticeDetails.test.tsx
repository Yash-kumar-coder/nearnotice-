import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NoticeDetails from './NoticeDetails';
import { supabase } from '../lib/supabase';

let mockAuth = {
  user: null as any,
  status: 'unauthenticated',
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('NoticeDetails - View counting and RPC security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockAuth = {
      user: null,
      status: 'unauthenticated',
    };
  });

  it('triggers increment_notice_views RPC when viewing a notice for the first time', async () => {
    const mockNotice = {
      id: 'notice-view-1',
      owner_id: 'owner-1',
      title: 'Maths Tutor Notice',
      body: 'Experienced maths teacher offering tuition.',
      category: 'Study',
      area_label: 'Boring Road, Patna',
      contact_type: 'both',
      views_count: 5,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      author_name: 'Rahul Kumar',
    };

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockNotice, error: null }),
    } as any);

    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: null,
      error: null,
    } as any);

    render(
      <MemoryRouter initialEntries={['/notice/notice-view-1']}>
        <Routes>
          <Route path="/notice/:id" element={<NoticeDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Maths Tutor Notice')).toBeInTheDocument();
    });

    expect(rpcSpy).toHaveBeenCalledWith('increment_notice_views', {
      notice_id: 'notice-view-1',
    });
    expect(sessionStorage.getItem('viewed_notice_notice-view-1')).toBe('1');
  });

  it('suppresses duplicate increment_notice_views calls if notice was already viewed in session', async () => {
    sessionStorage.setItem('viewed_notice_notice-view-1', '1');

    const mockNotice = {
      id: 'notice-view-1',
      owner_id: 'owner-1',
      title: 'Maths Tutor Notice',
      body: 'Experienced maths teacher offering tuition.',
      category: 'Study',
      area_label: 'Boring Road, Patna',
      contact_type: 'both',
      views_count: 6,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      author_name: 'Rahul Kumar',
    };

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockNotice, error: null }),
    } as any);

    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: null,
      error: null,
    } as any);

    render(
      <MemoryRouter initialEntries={['/notice/notice-view-1']}>
        <Routes>
          <Route path="/notice/:id" element={<NoticeDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Maths Tutor Notice')).toBeInTheDocument();
    });

    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('renders report button on notice page and opens report modal on click', async () => {
    const mockNotice = {
      id: 'notice-report-test',
      owner_id: 'owner-1',
      title: 'Suspicious Job Offer',
      body: 'Earn 10000 per day by clicking links.',
      category: 'Jobs & Gigs',
      area_label: 'Connaught Place, Delhi',
      contact_type: 'whatsapp',
      views_count: 10,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      author_name: 'Unknown Recruiter',
    };

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockNotice, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any);

    render(
      <MemoryRouter initialEntries={['/notice/notice-report-test']}>
        <Routes>
          <Route path="/notice/:id" element={<NoticeDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Suspicious Job Offer')).toBeInTheDocument();
    });

    // Report buttons should be present
    const reportButtons = screen.getAllByRole('button', { name: /report/i });
    expect(reportButtons.length).toBeGreaterThan(0);

    // Click report button
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(reportButtons[0]);

    // Modal dialog should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Report this Notice')).toBeInTheDocument();
      expect(screen.getByText(/Suspicious or scam/i)).toBeInTheDocument();
    });

    // Submit report
    const submitBtn = screen.getByRole('button', { name: /submit report/i });
    fireEvent.click(submitBtn);

    // Confirmation screen should appear
    await waitFor(() => {
      expect(screen.getByText('Report Submitted')).toBeInTheDocument();
      expect(screen.getByText(/thank you for keeping our neighborhood safe/i)).toBeInTheDocument();
    });
  });
});
