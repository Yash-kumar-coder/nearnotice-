import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NoticeCard } from './NoticeCard';
import type { PublicNotice } from '../types/database.types';
import { supabase } from '../lib/supabase';

let mockAuth = {
  user: null as any,
  status: 'unauthenticated',
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

const mockNoticeWhatsApp: PublicNotice = {
  id: 'test-notice-1',
  owner_id: 'owner-1',
  title: 'Maths Tutor Available',
  body: 'Expert tutor for class 10 and 12 mathematics.',
  category: 'Study',
  area_label: 'Boring Road, Patna',
  price: 500,
  contact_type: 'whatsapp',
  image_path: null,
  views_count: 10,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 86400000).toISOString(),
  latitude: 25.612,
  longitude: 85.123,
};

const mockNoticeCall: PublicNotice = {
  ...mockNoticeWhatsApp,
  id: 'test-notice-2',
  contact_type: 'call',
};

describe('NoticeCard - Button sizing and authentication state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = {
      user: null,
      status: 'unauthenticated',
    };
  });

  it('renders compact button and calls onRequireAuthPrompt when guest clicks WhatsApp', () => {
    const handleRequireAuth = vi.fn();

    render(
      <MemoryRouter>
        <NoticeCard
          notice={mockNoticeWhatsApp}
          onSaveToggle={() => {}}
          onRequireAuthPrompt={handleRequireAuth}
        />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /whatsapp/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    // Compact size check
    expect(button).toHaveClass('px-2.5');
    expect(button).toHaveClass('py-1');
    expect(button).toHaveClass('text-[11px]');

    fireEvent.click(button);
    expect(handleRequireAuth).toHaveBeenCalledTimes(1);
    expect(handleRequireAuth).toHaveBeenCalledWith(
      'chat on WhatsApp with this neighbor',
      '/notice/test-notice-1'
    );
  });

  it('renders compact button and opens local AuthPromptModal when guest clicks WhatsApp without parent callback', () => {
    render(
      <MemoryRouter>
        <NoticeCard notice={mockNoticeWhatsApp} onSaveToggle={() => {}} />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /whatsapp/i });
    fireEvent.click(button);

    expect(screen.getByRole('heading', { name: /sign in to connect/i })).toBeInTheDocument();
    expect(screen.getByText(/chat on whatsapp with this neighbor/i)).toBeInTheDocument();
  });

  it('calls onRequireAuthPrompt when guest clicks Call button', () => {
    const handleRequireAuth = vi.fn();

    render(
      <MemoryRouter>
        <NoticeCard
          notice={mockNoticeCall}
          onSaveToggle={() => {}}
          onRequireAuthPrompt={handleRequireAuth}
        />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /call/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).toHaveClass('px-2.5');
    expect(button).toHaveClass('py-1');
    expect(button).toHaveClass('text-[11px]');

    fireEvent.click(button);
    expect(handleRequireAuth).toHaveBeenCalledTimes(1);
    expect(handleRequireAuth).toHaveBeenCalledWith(
      'call this neighbor',
      '/notice/test-notice-2'
    );
  });

  it('fetches contact through RPC securely when user is authenticated non-owner', async () => {
    mockAuth = {
      user: { id: 'user-1', email: 'test@example.com' },
      status: 'authenticated',
    };

    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: [{ contact_number: '9876543210', contact_type: 'whatsapp' }],
      error: null,
    } as any);

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <MemoryRouter>
        <NoticeCard notice={mockNoticeWhatsApp} onSaveToggle={() => {}} />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /whatsapp/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).toHaveClass('px-2.5');
    expect(button).toHaveClass('py-1');
    expect(button).toHaveClass('text-[11px]');

    fireEvent.click(button);

    await waitFor(() => {
      expect(rpcSpy).toHaveBeenCalledWith('get_notice_contact', {
        target_notice_id: 'test-notice-1',
      });
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/919876543210'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    rpcSpy.mockRestore();
    windowOpenSpy.mockRestore();
  });

  it('allows owner to connect directly with their own notice details', async () => {
    mockAuth = {
      user: { id: 'owner-1', email: 'owner@example.com' },
      status: 'authenticated',
    };

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <MemoryRouter>
        <NoticeCard
          notice={{ ...mockNoticeWhatsApp, contact_number: '9876543210' }}
          onSaveToggle={() => {}}
        />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /whatsapp/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/919876543210'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    windowOpenSpy.mockRestore();
  });
});
