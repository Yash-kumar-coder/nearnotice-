import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import { supabase } from '../lib/supabase';

vi.mock('../features/onboarding/onboardingStorage', () => ({
  isOnboardingCompleted: () => true,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    status: 'unauthenticated',
  }),
}));

function createMockNotice(id: string, title: string, createdAt: string) {
  return {
    id,
    owner_id: 'owner-1',
    title,
    body: 'Notice description',
    category: 'Study',
    area_label: 'Patna',
    price: 500,
    contact_type: 'whatsapp',
    image_path: null,
    views_count: 10,
    created_at: createdAt,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    latitude: 25.6,
    longitude: 85.1,
    author_name: 'Resident',
  };
}

describe('Home Page - Cursor Pagination & Feed Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock IntersectionObserver
    window.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it('fetches initial page of 12 notices ordered by created_at desc, id desc', async () => {
    const mockNotices = Array.from({ length: 12 }, (_, i) =>
      createMockNotice(
        `notice-${i}`,
        `Notice Title ${i}`,
        new Date(Date.now() - i * 1000).toISOString()
      )
    );

    const limitMock = vi.fn().mockResolvedValue({ data: mockNotices, error: null });
    const orderMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockReturnValue({
      abortSignal: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: orderMock,
      limit: limitMock,
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: selectMock,
    } as any);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(limitMock).toHaveBeenCalledWith(12);
    });

    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(orderMock).toHaveBeenCalledWith('id', { ascending: false });
    expect(screen.getByText('Notice Title 0')).toBeInTheDocument();
  });

  it('shows Load More button when 12 notices returned and triggers keyset cursor query', async () => {
    const page1 = Array.from({ length: 12 }, (_, i) =>
      createMockNotice(
        `p1-notice-${i}`,
        `Batch 1 Notice ${i}`,
        new Date(Date.now() - i * 1000).toISOString()
      )
    );

    const orFilterMock = vi.fn().mockReturnThis();
    let callCount = 0;

    const limitMock = vi.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.resolve({ data: page1, error: null });
      }
      return Promise.resolve({
        data: [
          createMockNotice(
            'p2-notice-1',
            'Batch 2 Unique Notice',
            new Date(Date.now() - 20000).toISOString()
          ),
        ],
        error: null,
      });
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        abortSignal: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        or: orFilterMock,
        order: vi.fn().mockReturnThis(),
        limit: limitMock,
      }),
    } as any);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Batch 1 Notice 0')).toBeInTheDocument();
    });

    const loadMoreButton = await screen.findByRole('button', { name: /load more notices/i });
    expect(loadMoreButton).toBeInTheDocument();

    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Batch 2 Unique Notice')).toBeInTheDocument();
    });

    // Keyset cursor condition should have been passed to .or()
    expect(orFilterMock).toHaveBeenCalledWith(expect.stringContaining('created_at.lt.'));
  }, 15000);

  it('displays caught-up state when end of feed is reached', async () => {
    // Only 3 notices returned (less than 12)
    const shortList = Array.from({ length: 3 }, (_, i) =>
      createMockNotice(
        `short-${i}`,
        `Short Notice ${i}`,
        new Date(Date.now() - i * 1000).toISOString()
      )
    );

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        abortSignal: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: shortList, error: null }),
      }),
    } as any);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Short Notice 0')).toBeInTheDocument();
    });

    // Should display caught up indicator and no load more button
    expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more notices/i })).not.toBeInTheDocument();
  });

  it('deduplicates duplicate notice IDs seamlessly', async () => {
    const duplicateList = [
      createMockNotice('dup-1', 'Duplicate Notice', new Date().toISOString()),
      createMockNotice('dup-1', 'Duplicate Notice', new Date().toISOString()),
      createMockNotice('unique-1', 'Unique Notice', new Date().toISOString()),
    ];

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        abortSignal: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: duplicateList, error: null }),
      }),
    } as any);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Unique Notice')).toBeInTheDocument();
    });

    // Duplicate should only render once
    const dupCards = screen.getAllByText('Duplicate Notice');
    expect(dupCards).toHaveLength(1);
  });
});
