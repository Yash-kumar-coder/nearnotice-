import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AuthorGuard from '../AuthorGuard';
import { supabase } from '../../lib/supabase';

vi.mock('../authorService', () => ({
  AuthorService: {
    checkClearance: vi.fn(),
  },
}));

import { AuthorService } from '../authorService';

describe('AuthorGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login screen when user is unauthenticated', async () => {
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    render(
      <MemoryRouter initialEntries={['/author']}>
        <AuthorGuard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Author Console')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('author@nearnotice.app')).toBeInTheDocument();
    });
  });

  it('renders access denied screen when user is authenticated but not an admin/author', async () => {
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'regular-user-id', email: 'resident@example.com' } },
      error: null,
    } as any);

    vi.mocked(AuthorService.checkClearance).mockResolvedValue(false);

    render(
      <MemoryRouter initialEntries={['/author']}>
        <AuthorGuard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(
        screen.getByText(/Your authenticated account is not registered in/i)
      ).toBeInTheDocument();
    });
  });

  it('renders protected child content when user is authenticated author', async () => {
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'a8f637e8-2dfc-4b88-971c-5af7aabbe941', email: 'yash@nearnotice.local' } },
      error: null,
    } as any);

    vi.mocked(AuthorService.checkClearance).mockResolvedValue(true);

    render(
      <MemoryRouter initialEntries={['/author']}>
        <AuthorGuard>
          <div data-testid="author-dashboard">Author Dashboard Active</div>
        </AuthorGuard>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('author-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Author Dashboard Active')).toBeInTheDocument();
    });
  });
});
