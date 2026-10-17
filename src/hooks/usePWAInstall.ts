import { useState, useEffect, useCallback } from 'react';

const DISMISSAL_STORAGE_KEY = 'nearnotice_pwa_dismissed_at';
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Check if app is installed
  const checkIsInstalled = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    const isStandaloneDisplay =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)').matches
        : false;
    const isIOSStandalone = Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);
    const isTWA = document.referrer.startsWith('android-app://');

    return isStandaloneDisplay || isIOSStandalone || isTWA;
  }, []);

  // Check dismissal state in sessionStorage (resets on refresh / new tab)
  const checkIsDismissed = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      // Clear any legacy 24h localStorage locks from past testing
      localStorage.removeItem(DISMISSAL_STORAGE_KEY);
      return Boolean(sessionStorage.getItem(DISMISSAL_STORAGE_KEY));
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect initial install state
    const installed = checkIsInstalled();
    setIsInstalled(installed);

    // Detect iOS and Android devices
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Check dismissal
    setIsDismissed(checkIsDismissed());

    // Listen to display-mode changes
    const mediaQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)') : null;
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    if (mediaQuery) {
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleDisplayModeChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleDisplayModeChange);
      }
    }

    // Capture beforeinstallprompt for Chrome, Edge, Android browsers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = prompt;
      setDeferredPrompt(prompt);
      promptListeners.forEach((l) => l(prompt));
    };

    // Detect successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      promptListeners.forEach((l) => l(null));
      try {
        localStorage.removeItem(DISMISSAL_STORAGE_KEY);
      } catch {
        // ignore
      }
    };

    // Sync prompt across instances
    const onPromptChange = (p: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(p);
    };
    promptListeners.add(onPromptChange);

    // Cross-component install guide trigger
    const handleShowGuide = () => {
      setShowInstructions(true);
    };
    window.addEventListener('nearnotice:show-install-guide', handleShowGuide);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      promptListeners.delete(onPromptChange);
      window.removeEventListener('nearnotice:show-install-guide', handleShowGuide);
      if (mediaQuery) {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleDisplayModeChange);
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(handleDisplayModeChange);
        }
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkIsInstalled, checkIsDismissed]);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'instructions' | 'unavailable'> => {
    if (isInstalled) {
      return 'unavailable';
    }

    const activePrompt = deferredPrompt || globalDeferredPrompt;

    // If native prompt is available (Android, Chrome, Edge)
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
        promptListeners.forEach((l) => l(null));
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
        }
        return choice.outcome;
      } catch (err) {
        console.error('Error invoking install prompt:', err);
        return 'unavailable';
      }
    }

    // If native prompt is not yet ready or on iOS/Android without prompt, show instructions modal
    setShowInstructions(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nearnotice:show-install-guide'));
    }
    return 'instructions';
  }, [deferredPrompt, isInstalled]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    setShowInstructions(false);
    try {
      sessionStorage.setItem(DISMISSAL_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  // Whether the banner should be visible
  const isEligible = !isInstalled && !isDismissed;

  return {
    isInstallable: Boolean(deferredPrompt) || isIOS || isAndroid,
    isInstalled,
    isIOS,
    isAndroid,
    isDismissed,
    isEligible,
    showInstructions,
    setShowInstructions,
    // Alias for backwards compatibility
    showIOSInstructions: showInstructions,
    setShowIOSInstructions: setShowInstructions,
    promptInstall,
    dismiss,
  };
}
