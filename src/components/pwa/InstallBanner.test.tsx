import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { InstallBanner } from './InstallBanner';

describe('PWA InstallBanner Component', () => {
  const originalUserAgent = window.navigator.userAgent;
  const originalPlatform = window.navigator.platform;
  const originalMaxTouchPoints = window.navigator.maxTouchPoints;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    // Default matchMedia to not standalone
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Default navigator.standalone undefined
    delete (window.navigator as any).standalone;
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      value: originalMaxTouchPoints,
      configurable: true,
    });
  });

  it('renders install banner on initial load for visitors', () => {
    render(<InstallBanner />);
    expect(screen.getByRole('region', { name: /app installation banner/i })).toBeInTheDocument();
  });

  it('renders install banner when beforeinstallprompt event is fired', () => {
    render(<InstallBanner />);

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    mockPromptEvent.prompt = promptMock;
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    // Check branding and contents
    expect(screen.getByRole('region', { name: /app installation banner/i })).toBeInTheDocument();
    expect(screen.getByText('Install NearNotice')).toBeInTheDocument();
    expect(screen.getByText('Fast & Offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument();
  });

  it('triggers native prompt when Install App button is clicked', async () => {
    render(<InstallBanner />);

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    mockPromptEvent.prompt = promptMock;
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    const installBtn = screen.getByRole('button', { name: /install app/i });
    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(promptMock).toHaveBeenCalledTimes(1);
  });

  it('dismisses banner and persists dismissal in sessionStorage when Not now or close is clicked', () => {
    render(<InstallBanner />);

    expect(screen.getByRole('region', { name: /app installation banner/i })).toBeInTheDocument();

    const notNowBtn = screen.getByRole('button', { name: /not now/i });
    act(() => {
      fireEvent.click(notNowBtn);
    });

    // Banner should be dismissed
    expect(screen.queryByRole('region', { name: /app installation banner/i })).not.toBeInTheDocument();

    // Check sessionStorage dismissal
    const storedDismissal = sessionStorage.getItem('nearnotice_pwa_dismissed_at');
    expect(storedDismissal).toBeTruthy();
  });

  it('dismisses banner when Maybe Later is clicked', () => {
    render(<InstallBanner />);

    const maybeLaterBtn = screen.getByRole('button', { name: /maybe later/i });
    expect(maybeLaterBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(maybeLaterBtn);
    });

    expect(screen.queryByRole('region', { name: /app installation banner/i })).not.toBeInTheDocument();
    expect(sessionStorage.getItem('nearnotice_pwa_dismissed_at')).toBeTruthy();
  });

  it('does not show banner if previously dismissed in session', () => {
    sessionStorage.setItem('nearnotice_pwa_dismissed_at', 'true');

    render(<InstallBanner />);
    expect(screen.queryByRole('region', { name: /app installation banner/i })).not.toBeInTheDocument();
  });

  it('does not show banner when app is already installed in standalone mode', () => {
    // Mock standalone mode
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<InstallBanner />);

    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    mockPromptEvent.prompt = vi.fn();
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    expect(screen.queryByRole('region', { name: /app installation banner/i })).not.toBeInTheDocument();
  });

  it('hides banner when appinstalled event fires', () => {
    render(<InstallBanner />);

    const mockPromptEvent = new Event('beforeinstallprompt') as any;
    mockPromptEvent.prompt = vi.fn();
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    expect(screen.getByRole('region', { name: /app installation banner/i })).toBeInTheDocument();

    // Fire appinstalled event
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(screen.queryByRole('region', { name: /app installation banner/i })).not.toBeInTheDocument();
  });

  it('detects iOS device and shows Safari Add to Home Screen instructions modal', async () => {
    // Simulate iPhone user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      configurable: true,
    });

    render(<InstallBanner />);

    // Should render iOS banner with "How to Add"
    expect(screen.getByRole('region', { name: /app installation banner/i })).toBeInTheDocument();
    const howToAddBtn = screen.getByRole('button', { name: /how to add/i });
    expect(howToAddBtn).toBeInTheDocument();

    // Click "How to Add"
    await act(async () => {
      fireEvent.click(howToAddBtn);
    });

    // Check modal appears with Safari instructions
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Install on iPhone / iPad')).toBeInTheDocument();
    expect(screen.getByText(/Tap the/i)).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/i)).toBeInTheDocument();

    // Dismiss modal with "Got it"
    const gotItBtn = screen.getByRole('button', { name: /got it/i });
    act(() => {
      fireEvent.click(gotItBtn);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /app installation banner/i })).not.toBeInTheDocument();
  });

  it('detects Android device, shows banner immediately and displays Android instructions modal on click', async () => {
    // Simulate Android mobile user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
      configurable: true,
    });

    render(<InstallBanner />);

    // Should render banner immediately on Android mobile
    expect(screen.getByRole('region', { name: /app installation banner/i })).toBeInTheDocument();
    expect(screen.getByText('Add mobile app to home screen')).toBeInTheDocument();
    const installBtn = screen.getByRole('button', { name: /install app/i });
    expect(installBtn).toBeInTheDocument();

    // Click "Install" when deferredPrompt hasn't fired yet
    await act(async () => {
      fireEvent.click(installBtn);
    });

    // Check modal appears with Android instructions
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
    expect(screen.getByText(/three dots/i)).toBeInTheDocument();

    // Dismiss modal with "Got it"
    const gotItBtn = screen.getByRole('button', { name: /got it/i });
    act(() => {
      fireEvent.click(gotItBtn);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
