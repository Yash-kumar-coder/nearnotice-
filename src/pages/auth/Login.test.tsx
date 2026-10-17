import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { authService } from '../../features/auth/authService';

vi.mock('../../features/auth/authService', () => ({
  authService: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    refreshSession: vi.fn(),
  }),
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email, password inputs, show/hide button, and submit action', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('toggles password visibility between password and text', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^password/i);
    const toggleBtn = screen.getByRole('button', { name: /show password/i });

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('validates required fields and shows inline errors on empty submit', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /log in/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Email address is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(authService.signInWithPassword).not.toHaveBeenCalled();
  });

  it('prevents double-submission while a request is in flight', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(authService.signInWithPassword).mockReturnValue(pendingPromise as any);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole('button', { name: /log in/i });

    fireEvent.change(emailInput, { target: { value: 'neighbor@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecretPassword123!' } });

    // Click submit once
    fireEvent.click(submitBtn);

    // Double-click submit immediately
    fireEvent.click(submitBtn);

    expect(authService.signInWithPassword).toHaveBeenCalledTimes(1);

    // Resolve request safely
    await waitFor(() => {
      resolvePromise!({ user: { email_confirmed_at: '2026-10-14T00:00:00Z' } });
    });
  });
});
