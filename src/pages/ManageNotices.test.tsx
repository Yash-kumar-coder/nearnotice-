import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import ManageNotices from './ManageNotices';
import { supabase } from '../lib/supabase';

let mockAuth = {
  user: {
    id: 'owner-789',
    email: 'author@example.com',
  } as any,
  status: 'authenticated',
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('ManageNotices Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when user has no posted notices', async () => {
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    render(
      <MemoryRouter>
        <ManageNotices />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("You haven't posted any notices")).toBeInTheDocument();
      expect(screen.getByText('Create First Notice')).toBeInTheDocument();
    });
  });

  it('renders list of notices with edit, view and delete buttons', async () => {
    const mockNotices = [
      {
        id: 'notice-abc',
        owner_id: 'owner-789',
        title: 'Sofa for Sale',
        category: 'Items for Sale',
        area_label: 'Indiranagar, Bangalore',
        status: 'published',
        body: '3-seater comfortable sofa in good condition.',
        views_count: 14,
        created_at: new Date().toISOString(),
      },
    ];

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockNotices, error: null }),
    } as any);

    render(
      <MemoryRouter>
        <ManageNotices />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sofa for Sale')).toBeInTheDocument();
      expect(screen.getByText('Indiranagar, Bangalore')).toBeInTheDocument();
      expect(screen.getByLabelText('View notice')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit notice')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete notice')).toBeInTheDocument();
    });
  });
});
