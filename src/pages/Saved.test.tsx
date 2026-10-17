import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Saved from './Saved';
import * as savedNoticesUtil from '../utils/savedNotices';
import type { PublicNotice } from '../types/database.types';

let mockAuth = {
  user: { id: 'user-1', email: 'test@example.com' },
  status: 'authenticated',
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

const mockNotice1: PublicNotice = {
  id: 'saved-1',
  owner_id: 'owner-1',
  title: 'Golden Retriever Found',
  body: 'Friendly dog found near park.',
  category: 'Lost & Found',
  area_label: 'Kankarbagh, Patna',
  price: null,
  contact_number: '9876543210',
  contact_type: 'whatsapp',
  image_path: null,
  views_count: 5,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 86400000).toISOString(),
  latitude: 25.6,
  longitude: 85.1,
  author_name: 'Amit Kumar',
};

describe('Saved Notices Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders back button on top left with link to feed', async () => {
    vi.spyOn(savedNoticesUtil, 'fetchSavedNotices').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Saved />
      </MemoryRouter>
    );

    const backButton = screen.getByLabelText('Back to feed');
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveAttribute('href', '/');
    await waitFor(() => {
      expect(screen.getByText('Saved Notices')).toBeInTheDocument();
      expect(screen.getByText('No saved notices yet')).toBeInTheDocument();
    });
  });

  it('renders empty state when no notices are saved', async () => {
    vi.spyOn(savedNoticesUtil, 'fetchSavedNotices').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Saved />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No saved notices yet')).toBeInTheDocument();
      expect(screen.getByText('Explore Community Feed')).toBeInTheDocument();
    });
  });

  it('renders saved notices when they exist', async () => {
    vi.spyOn(savedNoticesUtil, 'fetchSavedNotices').mockResolvedValue([mockNotice1]);

    render(
      <MemoryRouter>
        <Saved />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Golden Retriever Found')).toBeInTheDocument();
      expect(screen.getByText('1 Notice')).toBeInTheDocument();
    });
  });

  it('removes notice from list when bookmark is toggled to unsave', async () => {
    vi.spyOn(savedNoticesUtil, 'fetchSavedNotices').mockResolvedValue([mockNotice1]);
    const toggleSpy = vi.spyOn(savedNoticesUtil, 'toggleSaveNotice').mockReturnValue(false);

    render(
      <MemoryRouter>
        <Saved />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Golden Retriever Found')).toBeInTheDocument();
    });

    // Click remove from saved
    const bookmarkBtn = screen.getByLabelText('Remove from saved');
    fireEvent.click(bookmarkBtn);

    expect(toggleSpy).toHaveBeenCalledWith(mockNotice1);
    await waitFor(() => {
      expect(screen.queryByText('Golden Retriever Found')).not.toBeInTheDocument();
      expect(screen.getByText('No saved notices yet')).toBeInTheDocument();
    });
  });
});
