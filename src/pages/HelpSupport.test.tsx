import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HelpSupport from './HelpSupport';
import { SupportService } from '../services/supportService';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123', email: 'test@example.com' },
  }),
}));

vi.mock('../services/supportService', () => ({
  SupportService: {
    submitContactSupport: vi.fn().mockResolvedValue({ success: true, id: 'ticket-123' }),
    submitReport: vi.fn().mockResolvedValue({ success: true, id: 'report-123' }),
  },
}));

describe('Help & Support Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders FAQs tab by default with questions', () => {
    render(
      <MemoryRouter>
        <HelpSupport />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Help & Support/i })).toBeInTheDocument();
    expect(screen.getByText(/How do I post a notice on NearNotice\?/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search frequently asked questions/i)).toBeInTheDocument();
  });

  it('switches to Contact Support tab and submits contact form', async () => {
    render(
      <MemoryRouter>
        <HelpSupport />
      </MemoryRouter>
    );

    // Switch to Contact Support
    const contactBtn = screen.getByRole('button', { name: /Contact Support/i });
    fireEvent.click(contactBtn);

    expect(screen.getByText(/Contact Support Form/i)).toBeInTheDocument();

    // Fill in required fields
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Rahul Sharma/i), {
      target: { value: 'Amit Verma' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Question about my posted notice/i), {
      target: { value: 'Inquiry on item' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Please explain how we can help/i), {
      target: { value: 'I have a question regarding my notice status.' },
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Support Request/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(SupportService.submitContactSupport).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Amit Verma',
          email: 'test@example.com',
          message: 'I have a question regarding my notice status.',
        })
      );
    });

    expect(await screen.findByText(/Support request received successfully!/i)).toBeInTheDocument();
  });

  it('switches to Report tab and submits abuse report', async () => {
    render(
      <MemoryRouter>
        <HelpSupport />
      </MemoryRouter>
    );

    // Switch to Report
    const reportBtn = screen.getByRole('button', { name: /Report Notice\/User/i });
    fireEvent.click(reportBtn);

    expect(screen.getByText(/Report Notice or User/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Notice title or paste URL/i), {
      target: { value: 'Suspicious Bike Post' },
    });
    fireEvent.change(screen.getByPlaceholderText(/explain what happened/i), {
      target: { value: 'Seller asked for advance bank transfer without meeting.' },
    });

    const submitReportBtn = screen.getByRole('button', { name: /Submit Abuse Report/i });
    fireEvent.click(submitReportBtn);

    await waitFor(() => {
      expect(SupportService.submitReport).toHaveBeenCalledWith(
        expect.objectContaining({
          targetType: 'notice',
          targetId: 'Suspicious Bike Post',
          details: 'Seller asked for advance bank transfer without meeting.',
        })
      );
    });

    expect(await screen.findByText(/Report submitted successfully!/i)).toBeInTheDocument();
  });

  it('switches to Privacy & Safety tab and displays guidelines', () => {
    render(
      <MemoryRouter>
        <HelpSupport />
      </MemoryRouter>
    );

    const safetyBtn = screen.getByRole('button', { name: /Privacy & Safety/i });
    fireEvent.click(safetyBtn);

    expect(screen.getByText(/Neighborhood Safety Guidelines/i)).toBeInTheDocument();
    expect(screen.getByText(/Meet in Public Places/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspect Before Paying/i)).toBeInTheDocument();
    expect(screen.getByText(/Shielded Contact Info/i)).toBeInTheDocument();
  });
});
