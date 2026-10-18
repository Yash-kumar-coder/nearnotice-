import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthorSupport from '../AuthorSupport';
import { SupportService, SupportTicket } from '../../services/supportService';

const MOCK_TICKETS: SupportTicket[] = [
  {
    id: 'ticket-1',
    type: 'contact_support',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    phone: '9876543210',
    subject: 'Issue uploading notice image',
    message: 'My image failed to upload when creating notice.',
    target_id: null,
    target_type: null,
    reason: null,
    status: 'pending',
    user_id: 'user-1',
    admin_notes: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ticket-2',
    type: 'report_notice',
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: null,
    subject: 'Report notice: Fraud, scam or suspicious payment request',
    message: 'User is asking for crypto deposit.',
    target_id: 'notice-xyz-99',
    target_type: 'notice',
    reason: 'Fraud, scam or suspicious payment request',
    status: 'pending',
    user_id: 'user-2',
    admin_notes: null,
    created_at: new Date().toISOString(),
  },
];

vi.mock('../../services/supportService', () => ({
  SupportService: {
    fetchAdminTickets: vi.fn(),
    updateTicketStatus: vi.fn().mockResolvedValue(true),
    deleteTicket: vi.fn().mockResolvedValue(true),
  },
}));

describe('AuthorSupport Admin Console Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SupportService.fetchAdminTickets).mockResolvedValue(MOCK_TICKETS);
  });

  it('renders tickets list and summary statistics', async () => {
    render(<AuthorSupport />);

    expect(await screen.findByText(/Support Inquiries & Abuse Reports/i)).toBeInTheDocument();
    expect(await screen.findByText(/Issue uploading notice image/i)).toBeInTheDocument();
    expect(await screen.findByText(/Report notice: Fraud, scam or suspicious payment request/i)).toBeInTheDocument();

    // Check stats
    expect(screen.getByText(/Total Submissions/i)).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('filters tickets by search query', async () => {
    render(<AuthorSupport />);

    await screen.findByText(/Issue uploading notice image/i);

    const searchInput = screen.getByPlaceholderText(/Search by name, email/i);
    fireEvent.change(searchInput, { target: { value: 'Priya' } });

    expect(screen.getByText(/Issue uploading notice image/i)).toBeInTheDocument();
    expect(screen.queryByText(/User is asking for crypto deposit/i)).not.toBeInTheDocument();
  });

  it('opens inspect modal and updates status to resolved', async () => {
    render(<AuthorSupport />);

    const inspectBtns = await screen.findAllByRole('button', { name: /Inspect/i });
    fireEvent.click(inspectBtns[0]);

    expect(screen.getByText(/Contact & Reporter Info/i)).toBeInTheDocument();
    expect(screen.getByText(/Full Message \/ Details/i)).toBeInTheDocument();

    const resolveBtn = screen.getByRole('button', { name: /Mark Resolved/i });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(SupportService.updateTicketStatus).toHaveBeenCalledWith(
        'ticket-1',
        'resolved',
        ''
      );
    });
  });
});
