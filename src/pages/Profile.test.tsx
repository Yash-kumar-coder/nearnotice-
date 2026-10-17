import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Profile from './Profile';

const mockUpdateDisplayName = vi.fn();
const mockSignOut = vi.fn();

let mockUser = {
  id: 'user-123',
  email: 'aman@example.com',
  user_metadata: {
    display_name: 'Aman Verma',
  },
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: mockSignOut,
    updateDisplayName: mockUpdateDisplayName,
    status: 'authenticated',
  }),
}));

const mockPromptInstall = vi.fn();
let mockIsInstalled = false;

vi.mock('../hooks/usePWAInstall', () => ({
  usePWAInstall: () => ({
    promptInstall: mockPromptInstall,
    isInstalled: mockIsInstalled,
    isEligible: !mockIsInstalled,
    showInstructions: false,
    setShowInstructions: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

describe('Profile Component - Edit Name Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsInstalled = false;
    mockUser = {
      id: 'user-123',
      email: 'aman@example.com',
      user_metadata: {
        display_name: 'Aman Verma',
      },
    };
  });

  it('renders user display name and edit button', () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    expect(screen.getByText('Aman Verma')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(
      screen.getByText(/seen by neighbors on every notice and post you publish/i)
    ).toBeInTheDocument();
  });

  it('opens edit input pre-filled with current display name when Edit is clicked', () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);

    const input = screen.getByPlaceholderText('Enter your name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Aman Verma');
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('cancels editing and restores view mode when Cancel is clicked', () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    const input = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(input, { target: { value: 'Something Else' } });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByPlaceholderText('Enter your name')).not.toBeInTheDocument();
    expect(screen.getByText('Aman Verma')).toBeInTheDocument();
  });

  it('validates minimum 2 characters', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    const input = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(input, { target: { value: 'A' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters long/i)).toBeInTheDocument();
    });
    expect(mockUpdateDisplayName).not.toHaveBeenCalled();
  });

  it('calls updateDisplayName and shows success message on save', async () => {
    mockUpdateDisplayName.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    const input = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(input, { target: { value: 'Vikram Singh' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateDisplayName).toHaveBeenCalledWith('Vikram Singh');
      expect(screen.getByText(/name updated!/i)).toBeInTheDocument();
    });
  });

  it('renders "No name set" instead of raw email if display_name contains email', () => {
    mockUser = {
      id: 'user-123',
      email: 'aman@example.com',
      user_metadata: {
        display_name: 'aman@example.com',
      },
    };

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    const nameHeading = screen.getByRole('heading', { level: 2 });
    expect(nameHeading).toHaveTextContent('No name set');
    expect(nameHeading).not.toHaveTextContent('aman@example.com');
  });

  it('rejects saving an email address as name', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    const input = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(input, { target: { value: 'resident@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/please enter your actual name, not an email address/i)
      ).toBeInTheDocument();
    });
    expect(mockUpdateDisplayName).not.toHaveBeenCalled();
  });

  it('renders "Install NearNotice" button in quick actions and triggers promptInstall on click', () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    const installBtn = screen.getByRole('button', { name: /install nearnotice/i });
    expect(installBtn).toBeInTheDocument();
    expect(screen.getByText(/fast, offline & add to home screen/i)).toBeInTheDocument();

    fireEvent.click(installBtn);
    expect(mockPromptInstall).toHaveBeenCalledTimes(1);
  });

  it('renders "NearNotice App Installed" status when app is already installed', () => {
    mockIsInstalled = true;

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: /install nearnotice/i })).not.toBeInTheDocument();
    expect(screen.getByText('NearNotice App')).toBeInTheDocument();
    expect(screen.getByText('Installed on this device')).toBeInTheDocument();
    expect(screen.getByText('Installed')).toBeInTheDocument();
  });
});
