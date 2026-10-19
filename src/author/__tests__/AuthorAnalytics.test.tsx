import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import AuthorAnalytics from '../AuthorAnalytics';
import { AuthorService } from '../authorService';
import type { TrafficAnalytics } from '../types';

vi.mock('../authorService', () => ({
  AuthorService: {
    getTrafficAnalytics: vi.fn(),
  },
}));

describe('AuthorAnalytics Component', () => {
  const mockAnalyticsData: TrafficAnalytics = {
    start_date: '2026-10-10',
    end_date: '2026-10-17',
    total_visitors: 430,
    total_views: 1240,
    daily_trend: [
      {
        date: '2026-10-17',
        visitors: 48,
        views: 110,
      },
      {
        date: '2026-10-16',
        visitors: 39,
        views: 95,
      },
    ],
    top_pages: [
      { path: '/', views: 820, visitors: 310 },
      { path: '/create', views: 180, visitors: 70 },
      { path: '/notice/123', views: 90, visitors: 50 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthorService.getTrafficAnalytics).mockResolvedValue(mockAnalyticsData);
  });

  it('renders analytics summary cards with native Supabase metrics', async () => {
    render(<AuthorAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('1,240')).toBeInTheDocument(); // total pageviews
      expect(screen.getByText('430')).toBeInTheDocument(); // unique visitors
    });
  });

  it('renders top visited pages breakdown', async () => {
    render(<AuthorAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('/create')).toBeInTheDocument();
      expect(screen.getByText('180 views')).toBeInTheDocument();
    });
  });

  it('allows switching timeframe tabs', async () => {
    render(<AuthorAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    const todayBtn = screen.getByRole('button', { name: 'Today' });
    fireEvent.click(todayBtn);

    await waitFor(() => {
      expect(AuthorService.getTrafficAnalytics).toHaveBeenCalledTimes(2);
    });
  });
});
