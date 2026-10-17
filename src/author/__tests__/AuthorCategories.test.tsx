import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import AuthorCategories from '../AuthorCategories';
import { AuthorService } from '../authorService';

vi.mock('../authorService', () => ({
  AuthorService: {
    getCategories: vi.fn(),
    manageCategory: vi.fn(),
  },
}));

describe('AuthorCategories Component', () => {
  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Items for Sale',
      slug: 'items-for-sale',
      icon: 'ShoppingBag',
      color: 'amber',
      is_active: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'cat-2',
      name: 'Services',
      slug: 'services',
      icon: 'Wrench',
      color: 'emerald',
      is_active: false,
      sort_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthorService.getCategories).mockResolvedValue(mockCategories);
  });

  it('renders all categories with status badges and actions', async () => {
    render(<AuthorCategories />);

    await waitFor(() => {
      expect(screen.getByText('Items for Sale')).toBeInTheDocument();
      expect(screen.getByText('items-for-sale')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('services')).toBeInTheDocument();
    });
  });

  it('opens category creation modal when clicking "Add Category"', async () => {
    render(<AuthorCategories />);

    await waitFor(() => {
      expect(screen.getByText('Items for Sale')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /Create Extra Category/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Create New Category')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Real Estate/i)).toBeInTheDocument();
    });
  });

  it('triggers toggle active on click', async () => {
    vi.mocked(AuthorService.manageCategory).mockResolvedValue(true);

    render(<AuthorCategories />);

    await waitFor(() => {
      expect(screen.getByText('Items for Sale')).toBeInTheDocument();
    });

    const activeToggle = screen.getByRole('button', { name: /Active/i });
    fireEvent.click(activeToggle);

    await waitFor(() => {
      expect(AuthorService.manageCategory).toHaveBeenCalledWith({
        action: 'toggle_active',
        id: 'cat-1',
      });
    });
  });
});
