import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditNotice from './EditNotice';
import { supabase } from '../lib/supabase';

let mockAuth = {
  user: {
    id: 'user-owner',
    email: 'owner@example.com',
  } as any,
  status: 'authenticated',
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('EditNotice Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays permission error if user is not the notice owner', async () => {
    const foreignNotice = {
      id: 'notice-xyz',
      owner_id: 'different-user',
      title: 'Not Mine',
      category: 'Community',
      body: 'Someone else notice description.',
      area_label: 'Patna',
    };

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: foreignNotice, error: null }),
    } as any);

    render(
      <MemoryRouter initialEntries={['/notices/notice-xyz/edit']}>
        <Routes>
          <Route path="/notices/:id/edit" element={<EditNotice />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('You do not have permission to edit this notice.')).toBeInTheDocument();
    });
  });

  it('populates fields when user owns the notice', async () => {
    const ownNotice = {
      id: 'notice-xyz',
      owner_id: 'user-owner',
      title: 'My Gaming Laptop',
      category: 'Items for Sale',
      body: 'Excellent condition laptop with RTX 3060.',
      area_label: 'Sector 62, Noida',
      contact_number: '9876543210',
      contact_type: 'whatsapp',
      price: 45000,
      images: ['https://example.com/laptop.jpg'],
    };

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: ownNotice, error: null }),
    } as any);

    render(
      <MemoryRouter initialEntries={['/notices/notice-xyz/edit']}>
        <Routes>
          <Route path="/notices/:id/edit" element={<EditNotice />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('My Gaming Laptop')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Excellent condition laptop with RTX 3060.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Sector 62, Noida')).toBeInTheDocument();
      expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();
      expect(screen.getByDisplayValue('45000')).toBeInTheDocument();
    });
  });
});
