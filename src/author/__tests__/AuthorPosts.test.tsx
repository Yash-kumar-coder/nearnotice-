import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AuthorPosts from '../AuthorPosts';
import { AuthorService } from '../authorService';

vi.mock('../authorService', () => ({
  AuthorService: {
    getNotices: vi.fn(),
    getCategories: vi.fn(),
    mutateNotice: vi.fn(),
    revealContact: vi.fn(),
    getReportedNoticesCount: vi.fn(),
    dismissNoticeReports: vi.fn(),
  },
}));

describe('AuthorPosts Component', () => {
  const mockNotices = [
    {
      id: 'notice-101',
      title: 'Vintage Leather Armchair',
      content: 'Solid teakwood frame with distressed leather cushioning.',
      category: 'Items for Sale',
      status: 'published' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner_id: 'user-abc',
      author_phone_masked: '••••••1234',
      views_count: 42,
      price: 4500,
      area_label: 'Indiranagar',
      reports_count: 2,
      reports: [
        {
          id: 'rep-1',
          reason: 'Spam or advertising',
          details: 'User posting commercial ads repeatedly',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
        {
          id: 'rep-2',
          reason: 'Inappropriate content',
          details: null,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ],
    },
  ];

  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Items for Sale',
      slug: 'items-for-sale',
      icon: 'ShoppingBag',
      color: 'amber',
      is_active: true,
      sort_order: 1,
      created_at: '',
      updated_at: '',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthorService.getNotices).mockResolvedValue({
      notices: mockNotices,
      total: 1,
    });
    vi.mocked(AuthorService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(AuthorService.getReportedNoticesCount).mockResolvedValue(1);
    vi.mocked(AuthorService.dismissNoticeReports).mockResolvedValue(true);
  });

  it('renders notices list with filters and statistics', async () => {
    render(
      <MemoryRouter>
        <AuthorPosts />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Vintage Leather Armchair')).toBeInTheDocument();
      expect(screen.getAllByText('Items for Sale').length).toBeGreaterThan(0);
      expect(screen.getAllByText('published').length).toBeGreaterThan(0);
      expect(screen.getByText(/Reported Posts \(1\)/i)).toBeInTheDocument();
      expect(screen.getAllByText(/2 Reports/i).length).toBeGreaterThan(0);
    });
  });

  it('filters notices when search input is changed', async () => {
    render(
      <MemoryRouter>
        <AuthorPosts />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Vintage Leather Armchair')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by notice title/i);
    fireEvent.change(searchInput, { target: { value: 'Sofa' } });

    await waitFor(() => {
      expect(AuthorService.getNotices).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Sofa' })
      );
    });
  });

  it('opens edit modal with current post values', async () => {
    render(
      <MemoryRouter>
        <AuthorPosts />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Vintage Leather Armchair')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Edit Notice');
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Notice' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Vintage Leather Armchair')).toBeInTheDocument();
    });
  });

  it('opens inspect drawer with detailed report count and reasons', async () => {
    render(
      <MemoryRouter>
        <AuthorPosts />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Vintage Leather Armchair')).toBeInTheDocument();
    });

    const inspectBtn = screen.getByRole('button', { name: /Inspect/i });
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      expect(screen.getByText(/Total Reports for this Post: 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Spam or advertising/i)).toBeInTheDocument();
      expect(screen.getByText(/User posting commercial ads repeatedly/i)).toBeInTheDocument();
    });
  });
});
