import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import CreateNotice from './CreateNotice';
import { supabase } from '../lib/supabase';
import * as geocodeUtil from '../utils/geocode';

let mockAuth = {
  user: {
    id: 'user-456',
    email: 'creator@example.com',
    user_metadata: { display_name: 'Priya Sharma' },
  } as any,
  status: 'authenticated',
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('CreateNotice Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = {
      user: {
        id: 'user-456',
        email: 'creator@example.com',
        user_metadata: { display_name: 'Priya Sharma' },
      },
      status: 'authenticated',
    };
  });

  it('renders form elements properly', () => {
    render(
      <MemoryRouter>
        <CreateNotice />
      </MemoryRouter>
    );

    expect(screen.getByText('Create a Notice')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Buy my i-phone/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe condition, specifications/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Motihari, Bihar/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('9876543210')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^post$/i })).toBeInTheDocument();
  });

  it('validates title minimum length', async () => {
    const { container } = render(
      <MemoryRouter>
        <CreateNotice />
      </MemoryRouter>
    );

    const titleInput = screen.getByPlaceholderText(/e.g. Buy my i-phone/i);
    fireEvent.change(titleInput, { target: { value: 'ab' } });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('validates description minimum length', async () => {
    const { container } = render(
      <MemoryRouter>
        <CreateNotice />
      </MemoryRouter>
    );

    const titleInput = screen.getByPlaceholderText(/e.g. Buy my i-phone/i);
    fireEvent.change(titleInput, { target: { value: 'Valid Title Here' } });

    const descInput = screen.getByPlaceholderText(/Describe condition, specifications/i);
    fireEvent.change(descInput, { target: { value: 'Short' } });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/description is required \(at least 10 characters\)/i)).toBeInTheDocument();
    });
  });

  it('allows publishing without images as images are optional', async () => {
    const { container } = render(
      <MemoryRouter>
        <CreateNotice />
      </MemoryRouter>
    );

    const titleInput = screen.getByPlaceholderText(/e.g. Buy my i-phone/i);
    fireEvent.change(titleInput, { target: { value: 'Valid Title Here' } });

    const descInput = screen.getByPlaceholderText(/Describe condition, specifications/i);
    fireEvent.change(descInput, { target: { value: 'This is a valid detailed description for community notice.' } });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      // Since images are optional, it validates the next required field: neighborhood/location
      expect(screen.getByText(/please provide a neighborhood or location area/i)).toBeInTheDocument();
      expect(screen.queryByText(/please add at least 1 image for your notice/i)).not.toBeInTheDocument();
    });
  });

  it('automatically resolves coordinates when user types custom location without GPS', async () => {
    const geocodeSpy = vi.spyOn(geocodeUtil, 'geocode').mockResolvedValueOnce({
      latitude: 26.65,
      longitude: 84.91,
      displayName: 'Motihari, Bihar',
      shortName: 'Motihari, Bihar',
    });

    const insertSpy = vi.fn().mockResolvedValueOnce({ error: null });
    vi.spyOn(supabase, 'from').mockReturnValue({
      insert: insertSpy,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [] }),
    } as any);

    const { container } = render(
      <MemoryRouter>
        <CreateNotice />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/e.g. Buy my i-phone/i), {
      target: { value: 'iPhone 14 Pro Max' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe condition, specifications/i), {
      target: { value: 'Like new condition with box and bill' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. Motihari, Bihar/i), {
      target: { value: 'Motihari, Bihar' },
    });
    fireEvent.change(screen.getByPlaceholderText('9876543210'), {
      target: { value: '9876543210' },
    });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(geocodeSpy).toHaveBeenCalledWith('Motihari, Bihar');
    });
  });
});
