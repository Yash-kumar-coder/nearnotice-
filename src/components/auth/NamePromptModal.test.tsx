import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { NamePromptModal } from './NamePromptModal';

const mockUpdateDisplayName = vi.fn();

let mockAuthState = {
  user: null as any,
  status: 'unauthenticated',
  updateDisplayName: mockUpdateDisplayName,
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

describe('NamePromptModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockAuthState = {
      user: null,
      status: 'unauthenticated',
      updateDisplayName: mockUpdateDisplayName,
    };
  });

  it('does not render when unauthenticated', () => {
    render(<NamePromptModal />);
    expect(screen.queryByText(/add your name/i)).not.toBeInTheDocument();
  });

  it('renders modal when authenticated and user has no display_name', () => {
    mockAuthState = {
      user: {
        id: 'user-1',
        email: 'resident@example.com',
        user_metadata: {},
      },
      status: 'authenticated',
      updateDisplayName: mockUpdateDisplayName,
    };

    render(<NamePromptModal />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add Your Name')).toBeInTheDocument();
    expect(
      screen.getByText(/visible to neighbors on every notice and post you publish/i)
    ).toBeInTheDocument();
  });

  it('validates input length on submission', async () => {
    mockAuthState = {
      user: {
        id: 'user-1',
        email: 'resident@example.com',
        user_metadata: {},
      },
      status: 'authenticated',
      updateDisplayName: mockUpdateDisplayName,
    };

    render(<NamePromptModal />);
    const input = screen.getByPlaceholderText('e.g. Rahul Sharma');
    fireEvent.change(input, { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: /save name & continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter your name')).toBeInTheDocument();
    });
    expect(mockUpdateDisplayName).not.toHaveBeenCalled();
  });

  it('calls updateDisplayName and shows success on valid submit', async () => {
    mockUpdateDisplayName.mockResolvedValueOnce(undefined);
    mockAuthState = {
      user: {
        id: 'user-1',
        email: 'resident@example.com',
        user_metadata: {},
      },
      status: 'authenticated',
      updateDisplayName: mockUpdateDisplayName,
    };

    render(<NamePromptModal />);
    const input = screen.getByPlaceholderText('e.g. Rahul Sharma');
    fireEvent.change(input, { target: { value: 'Ananya Roy' } });
    fireEvent.click(screen.getByRole('button', { name: /save name & continue/i }));

    await waitFor(() => {
      expect(mockUpdateDisplayName).toHaveBeenCalledWith('Ananya Roy');
      expect(screen.getByText('Name Saved!')).toBeInTheDocument();
    });
  });

  it('allows user to dismiss with "I\'ll do this later"', () => {
    mockAuthState = {
      user: {
        id: 'user-1',
        email: 'resident@example.com',
        user_metadata: {},
      },
      status: 'authenticated',
      updateDisplayName: mockUpdateDisplayName,
    };

    render(<NamePromptModal />);
    const dismissBtn = screen.getByRole('button', { name: /i'll do this later/i });
    fireEvent.click(dismissBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('nearnotice:name_prompt_dismissed')).toBe('true');
  });

  it('renders modal when user display_name contains an email address', () => {
    mockAuthState = {
      user: {
        id: 'user-1',
        email: 'resident@example.com',
        user_metadata: {
          display_name: 'resident@example.com',
        },
      },
      status: 'authenticated',
      updateDisplayName: mockUpdateDisplayName,
    };

    render(<NamePromptModal />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add Your Name')).toBeInTheDocument();
  });

  it('rejects email address entered into the name input', async () => {
    mockAuthState = {
      user: {
        id: 'user-1',
        email: 'resident@example.com',
        user_metadata: {},
      },
      status: 'authenticated',
      updateDisplayName: mockUpdateDisplayName,
    };

    render(<NamePromptModal />);
    const input = screen.getByPlaceholderText('e.g. Rahul Sharma');
    fireEvent.change(input, { target: { value: 'someone@gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: /save name & continue/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Please enter your actual name, not an email address')
      ).toBeInTheDocument();
    });
    expect(mockUpdateDisplayName).not.toHaveBeenCalled();
  });

  it('does not render modal when user already has a valid full name', () => {
    mockAuthState = {
      user: {
        id: 'user-1',
        email: 'resident@example.com',
        user_metadata: {
          display_name: 'Arjun Mehta',
        },
      },
      status: 'authenticated',
      updateDisplayName: mockUpdateDisplayName,
    };

    render(<NamePromptModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
