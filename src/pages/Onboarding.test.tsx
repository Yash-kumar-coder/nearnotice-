import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Onboarding from './Onboarding';
import {
  isOnboardingCompleted,
  resetOnboarding,
  ONBOARDING_STORAGE_KEY,
} from '../features/onboarding/onboardingStorage';

describe('Onboarding Carousel Component', () => {
  beforeEach(() => {
    resetOnboarding();
    localStorage.clear();
  });

  it('renders carousel with the first slide heading and real image', () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>
    );

    expect(screen.getByRole('region', { name: /welcome tour/i })).toBeInTheDocument();
    expect(screen.getByText('Discover Your Local Neighborhood')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('advances slides on Next button click and shows Get Started on slide 3', () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>
    );

    const nextBtn = screen.getByRole('button', { name: /next/i });

    // Slide 1 -> Slide 2
    fireEvent.click(nextBtn);
    expect(screen.getByText('Connect Directly With Neighbors')).toBeInTheDocument();

    // Slide 2 -> Slide 3
    fireEvent.click(nextBtn);
    expect(screen.getByText('Post Notices In Seconds')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('supports keyboard navigation via ArrowRight and ArrowLeft', () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>
    );

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Connect Directly With Neighbors')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('Discover Your Local Neighborhood')).toBeInTheDocument();
  });

  it('persists completion and navigates when Skip is clicked', () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>
    );

    const skipBtn = screen.getByText('Skip');
    fireEvent.click(skipBtn);

    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('done');
    expect(isOnboardingCompleted()).toBe(true);
  });
});
