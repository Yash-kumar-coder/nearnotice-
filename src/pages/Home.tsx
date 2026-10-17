import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  Search,
  WifiOff,
  RefreshCw,
  MapPin,
  ChevronDown,
  LayoutGrid,
  GraduationCap,
  Briefcase,
  Home as HomeIcon,
  Calendar,
  Wrench,
  Package,
  Users,
  Compass,
  Zap,
  X,
  LogIn,
  Check,
  Loader2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PublicNotice } from '../types/database.types';
import { sanitizeDisplayName, humanizeAuthorName } from '../utils/author';
import { NoticeCard } from '../components/NoticeCard';
import { Skeleton } from '../components/common/Skeleton';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { useAuth } from '../contexts/AuthContext';
import { isOnboardingCompleted } from '../features/onboarding/onboardingStorage';
import { AuthPromptModal } from '../components/auth/AuthPromptModal';
import { getNoticeDistanceKm } from '../utils/distance';
import { getSavedNoticeIds, toggleSaveNotice } from '../utils/savedNotices';

// Categories matching the reference mockup iconography
const CATEGORY_TABS = [
  { id: 'All', label: 'All', icon: LayoutGrid },
  { id: 'Study', label: 'Study', icon: GraduationCap },
  { id: 'Jobs', label: 'Jobs', icon: Briefcase },
  { id: 'Rentals', label: 'Rentals', icon: HomeIcon },
  { id: 'Events', label: 'Events', icon: Calendar },
  { id: 'Services', label: 'Services', icon: Wrench },
  { id: 'Items', label: 'Items', icon: Package },
  { id: 'Community', label: 'Community', icon: Users },
];

const PAGE_SIZE = 12;

// Explicit column list without sensitive phone numbers (includes author_name, contact_type, etc.)
const PUBLIC_NOTICE_COLUMNS =
  'id, owner_id, title, body, category, image_path, images, area_label, price, contact_type, views_count, latitude, longitude, created_at, expires_at, author_name';

// PostgREST injection prevention: escapes %, _, and commas
function sanitizeFilterQuery(term: string): string {
  return term
    .trim()
    .slice(0, 100)
    .replace(/[%_,]/g, '\\$&');
}

export default function Home() {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  // First-time visitors (no onboarding flag) go to /onboarding
  if (!isOnboardingCompleted()) {
    return <Navigate to="/onboarding" replace />;
  }

  const [notices, setNotices] = useState<PublicNotice[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'all' | 'nearby'>('all');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(getSavedNoticeIds())
  );

  // Location state: Strictly tracks user's actual current location
  const [currentCity, setCurrentCity] = useState(() => {
    const stored = localStorage.getItem('nearnotice_city');
    if (stored && stored !== 'Patna, Bihar') return stored;
    return 'Current Location';
  });
  const [locationEnabled, setLocationEnabled] = useState(
    localStorage.getItem('nearnotice_loc_enabled') === 'true'
  );
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const isEnabled = localStorage.getItem('nearnotice_loc_enabled') === 'true';
    if (!isEnabled) return null;
    const savedLat = localStorage.getItem('nearnotice_lat');
    const savedLng = localStorage.getItem('nearnotice_lng');
    if (savedLat && savedLng) {
      const lat = parseFloat(savedLat);
      const lng = parseFloat(savedLng);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    return null;
  });

  const handleFeedTabChange = (tab: 'all' | 'nearby') => {
    setActiveTab(tab);
    if (tab === 'nearby' && (!locationEnabled || !userCoords)) {
      handleEnableLocation();
    }
  };

  // Guest prompt modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState('sign in to continue');
  const [authModalNext, setAuthModalNext] = useState('/');

  // Keyset pagination cursor & concurrency guards
  const cursorRef = useRef<{ createdAt: string; id: string } | null>(null);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const observerTargetRef = useRef<HTMLDivElement>(null);

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync saved notice IDs whenever bookmarks change
  useEffect(() => {
    const handleSavedChange = () => {
      setSavedIds(new Set(getSavedNoticeIds()));
    };
    window.addEventListener('nearnotice_saved_changed', handleSavedChange);
    return () => {
      window.removeEventListener('nearnotice_saved_changed', handleSavedChange);
    };
  }, []);

  // 300ms Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Request browser geolocation to find user's real current location & calculate notice distances
  const handleEnableLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });
        localStorage.setItem('nearnotice_lat', lat.toString());
        localStorage.setItem('nearnotice_lng', lng.toString());
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          const address = data?.address || {};
          const locality =
            address.suburb ||
            address.neighbourhood ||
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.district ||
            address.county ||
            '';
          const state = address.state || address.state_district || '';
          const detected =
            locality && state ? `${locality}, ${state}` : (locality || state || 'Current Location');
          setCurrentCity(detected);
          localStorage.setItem('nearnotice_city', detected);
          setLocationEnabled(true);
          localStorage.setItem('nearnotice_loc_enabled', 'true');
        } catch {
          setCurrentCity((prev) => (prev !== 'Current Location' ? prev : 'Current Location'));
          setLocationEnabled(true);
          localStorage.setItem('nearnotice_loc_enabled', 'true');
        } finally {
          setLocating(false);
        }
      },
      (geoError) => {
        console.info('[NearNotice] Location permission denied or unavailable:', geoError?.message);
        setLocationError(
          geoError?.code === 1
            ? 'Location access was denied. Please allow location permissions in your browser.'
            : 'Unable to retrieve your current location.'
        );
        setLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  // Automatically detect user's current location on load if permission is available
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      if (!localStorage.getItem('nearnotice_city') || localStorage.getItem('nearnotice_loc_enabled') === 'true') {
        handleEnableLocation();
      }
    }
  }, [handleEnableLocation]);

  // Fetch notices from public_notices view using stable cursor keyset pagination
  const fetchNotices = useCallback(
    async (isInitial: boolean) => {
      // Prevent concurrent duplicate requests for subsequent pages
      if (!isInitial && isFetchingRef.current) {
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (isInitial) {
        setLoading(true);
        setError(null);
        cursorRef.current = null;
      } else {
        setLoadingMore(true);
      }
      isFetchingRef.current = true;

      try {
        if (!isSupabaseConfigured) {
          setNotices([]);
          setHasMore(false);
          setLoading(false);
          setLoadingMore(false);
          isFetchingRef.current = false;
          return;
        }

        let query = supabase
          .from('public_notices')
          .select(PUBLIC_NOTICE_COLUMNS)
          .abortSignal(controller.signal);

        // Category filter
        if (selectedCategory !== 'All') {
          query = query.ilike('category', `%${selectedCategory}%`);
        }

        // Sanitized search filter
        if (debouncedSearch) {
          const safeTerm = sanitizeFilterQuery(debouncedSearch);
          query = query.or(`title.ilike.%${safeTerm}%,body.ilike.%${safeTerm}%,area_label.ilike.%${safeTerm}%`);
        }

        // Ordering: latest first with deterministic unique ID tie-breaker
        query = query
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });

        // Stable Keyset Cursor Pagination (O(1) index seek)
        if (!isInitial && cursorRef.current) {
          query = query.or(
            `created_at.lt.${cursorRef.current.createdAt},and(created_at.eq.${cursorRef.current.createdAt},id.lt.${cursorRef.current.id})`
          );
        }

        query = query.limit(PAGE_SIZE);

        if (controller.signal.aborted) return;

        const { data, error: queryError } = await query;

        if (controller.signal.aborted) return;

        if (queryError) {
          if (
            queryError.message?.includes('AbortError') ||
            queryError.message?.includes('aborted') ||
            queryError.hint?.includes('aborted')
          ) {
            return;
          }
          throw queryError;
        }

        const rows = (data as PublicNotice[]) || [];

        // Note: public_notices view already joins profiles and projects safe author_name,
        // eliminating N+1 secondary queries to profiles table.
        rows.forEach((r) => {
          if (!r.author_name) {
            const cached =
              localStorage.getItem(`nearnotice_post_author_${r.id}`) ||
              (r.owner_id ? localStorage.getItem(`nearnotice_owner_name_${r.owner_id}`) : null);
            r.author_name = cached || 'Neighbor';
          }
        });

        // Ensure current user's notices always show their real display name immediately
        if (user) {
          const myName =
            sanitizeDisplayName(user.user_metadata?.display_name as string) ||
            sanitizeDisplayName(user.user_metadata?.full_name as string) ||
            (user.email ? humanizeAuthorName(user.email.split('@')[0]) : null);
          if (myName) {
            rows.forEach((r) => {
              if (r.owner_id === user.id) {
                r.author_name = myName;
              }
            });
          }
        }

        let mergedRows = [...rows];

        // Deduplicate notices to guarantee no duplicate cards
        if (isInitial) {
          const seenIds = new Set<string>();
          const uniqueRows = mergedRows.filter((item) => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
          });
          setNotices(uniqueRows);
        } else {
          setNotices((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const fresh = rows.filter((r) => !existingIds.has(r.id));
            return [...prev, ...fresh];
          });
        }

        setHasMore(rows.length === PAGE_SIZE);

        if (rows.length > 0) {
          const lastItem = rows[rows.length - 1];
          cursorRef.current = { createdAt: lastItem.created_at, id: lastItem.id };
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const msg = (err as { message?: string })?.message || '';
        const name = (err as Error)?.name || '';
        if (
          name === 'AbortError' ||
          msg.includes('AbortError') ||
          msg.includes('aborted')
        ) {
          return;
        }
        console.error('[NearNotice] Failed to fetch feed:', err);
        setError('Unable to load notices. Please check your internet connection.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
          isFetchingRef.current = false;
        }
      }
    },
    [selectedCategory, debouncedSearch, currentCity, user]
  );

  // Refetch on filter / search changes
  useEffect(() => {
    fetchNotices(true);
  }, [fetchNotices]);

  // Infinite scroll observer: triggers 250px before the user reaches the bottom
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !isFetchingRef.current) {
          fetchNotices(false);
        }
      },
      { threshold: 0.1, rootMargin: '250px' }
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, loading, loadingMore, fetchNotices]);

  // Guest action handler with stable callback
  const handleGuestAction = useCallback((actionLabel: string, returnPath: string) => {
    if (status !== 'authenticated') {
      setAuthModalReason(actionLabel);
      setAuthModalNext(returnPath);
      setShowAuthModal(true);
      return false;
    }
    return true;
  }, [status]);

  // Notice save handler with stable callback
  const handleSaveToggle = useCallback((noticeId: string) => {
    if (!handleGuestAction('save this notice', '/saved')) {
      return;
    }

    setNotices((currentNotices) => {
      const targetNotice = currentNotices.find((n) => n.id === noticeId);

      if (targetNotice) {
        toggleSaveNotice(targetNotice);
      } else {
        toggleSaveNotice({ id: noticeId } as any);
      }
      return currentNotices;
    });

    setSavedIds(new Set(getSavedNoticeIds()));
  }, [handleGuestAction]);

  // Memoized notices: sorted by proximity in 'nearby' tab, newest first in 'all' tab
  const displayNotices = useMemo(() => {
    if (activeTab === 'nearby') {
      return [...notices].sort((a, b) => {
        const distA = getNoticeDistanceKm(
          a.distance_km,
          userCoords?.lat,
          userCoords?.lng,
          a.latitude,
          a.longitude
        );
        const distB = getNoticeDistanceKm(
          b.distance_km,
          userCoords?.lat,
          userCoords?.lng,
          b.latitude,
          b.longitude
        );
        if (distA != null && distB != null) return distA - distB;
        if (distA != null) return -1;
        if (distB != null) return 1;
        return 0;
      });
    }
    return notices;
  }, [notices, activeTab, userCoords]);

  return (
    <div className="pb-36 max-w-md mx-auto min-h-screen bg-white">
      {/* Offline Banner */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-40"
        >
          <WifiOff size={14} aria-hidden="true" />
          <span>You are currently offline. Showing cached notices.</span>
        </div>
      )}

      {/* Top App Header Matching Mockup */}
      <header className="px-5 pt-4 pb-2 bg-white sticky top-0 z-30 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Logo Only (Brand image contains icon + text) */}
          <Link to="/" className="inline-flex items-center group py-0.5">
            <img
              src="/logo.png"
              alt="NearNotice"
              className="h-16 sm:h-18 w-auto object-contain group-hover:scale-102 transition-transform shrink-0"
            />
          </Link>

          {/* Current Location Pill: Strictly detects & displays user's real current location */}
          <button
            type="button"
            onClick={handleEnableLocation}
            disabled={locating}
            className="flex items-center gap-1.5 bg-blue-50/80 hover:bg-blue-100 active:scale-95 text-blue-700 px-3.5 py-1.5 rounded-full text-xs font-bold border border-blue-200/80 transition-all cursor-pointer shadow-2xs shrink-0"
            title="Tap to refresh your current GPS location"
            aria-label="Current Location - Click to refresh"
          >
            {locating ? (
              <Loader2 size={13} className="text-blue-600 animate-spin shrink-0" />
            ) : (
              <MapPin size={13} className="text-blue-600 shrink-0" />
            )}
            <span className="truncate max-w-[120px] sm:max-w-[170px]">
              {locating ? 'Detecting...' : currentCity}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notices, jobs, rentals..."
            maxLength={100}
            className="w-full bg-gray-50 border border-gray-200/90 rounded-2xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Feed Tab Toggle: All Posts / Near Posts */}
        <div className="bg-gray-100/90 p-1 rounded-2xl flex items-center mb-3">
          <button
            type="button"
            onClick={() => handleFeedTabChange('all')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LayoutGrid size={14} />
            <span>All Posts</span>
          </button>

          <button
            type="button"
            onClick={() => handleFeedTabChange('nearby')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'nearby'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MapPin size={14} className={activeTab === 'nearby' ? 'fill-white' : ''} />
            <span>Near Posts</span>
          </button>
        </div>

        {/* Location Notice Banner if permission was denied */}
        {locationError && (
          <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-200">
            <span>{locationError}</span>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              className="text-amber-600 hover:text-amber-900 font-bold px-1.5 py-0.5 rounded-lg text-sm leading-none cursor-pointer hover:bg-amber-100"
              aria-label="Dismiss notice"
            >
              &times;
            </button>
          </div>
        )}

        {/* Category Icon Tiles (Matching Mockup with Rounded Boxes) */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 pt-1 -mx-5 px-5">
          {CATEGORY_TABS.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center min-w-[56px] group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-2 border-blue-600 text-blue-600 shadow-xs'
                      : 'bg-gray-50 border border-gray-200/80 text-gray-600 group-hover:bg-gray-100 group-hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <span
                  className={`text-[11px] mt-1.5 font-bold transition-colors ${
                    isSelected ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {cat.label}
                </span>
                {isSelected && (
                  <div className="w-4 h-0.5 bg-blue-600 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-5 pt-3">
        {/* Section Header */}
        <div className="mb-3 pt-1">
          <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight">
            {activeTab === 'nearby' ? 'Near Posts' : 'All Posts'}
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            {activeTab === 'nearby'
              ? locationEnabled && userCoords
                ? `Showing posts closest to your location${currentCity !== 'Current Location' ? ` in ${currentCity.split(',')[0]}` : ''}`
                : 'Enable location to sort notices by distance from you'
              : currentCity !== 'Current Location'
                ? `Showing latest posts from ${currentCity.split(',')[0]} and nearby areas`
                : 'Showing latest community notices around you'}
          </p>
        </div>

        {/* Location Callout Banner (Matching Mockup) */}
        {!locationEnabled && (
          <div className="bg-blue-50/70 border border-blue-100/90 rounded-2xl p-3.5 mb-4 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100/90 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 leading-snug">
                  Enable your location to see more relevant nearby notices.
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  See accurate distances to notices in your community.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnableLocation}
              disabled={locating}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl whitespace-nowrap shadow-xs transition-all cursor-pointer shrink-0"
            >
              {locating ? 'Locating...' : 'Enable Location'}
            </button>
          </div>
        )}

        {/* Error State with Retry Button */}
        {error && (
          <div className="mb-4">
            <Alert variant="error" title="Feed unavailable">
              {error}
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchNotices(true)}
                  className="gap-1.5"
                >
                  <RefreshCw size={14} /> Retry
                </Button>
              </div>
            </Alert>
          </div>
        )}

        {/* Notice List */}
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-2xs flex gap-3.5"
              >
                <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="flex justify-between">
                    <Skeleton className="w-16 h-4 rounded-full" />
                    <Skeleton className="w-12 h-4" />
                  </div>
                  <Skeleton className="w-3/4 h-5" />
                  <Skeleton className="w-full h-3" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="w-24 h-3" />
                    <Skeleton className="w-16 h-6 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayNotices.length > 0 ? (
          <div>
            <div className="space-y-3">
              {displayNotices.map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  isSaved={savedIds.has(notice.id)}
                  onSaveToggle={handleSaveToggle}
                  onRequireAuthPrompt={(action, returnPath) =>
                    handleGuestAction(action, returnPath)
                  }
                  userLat={userCoords?.lat}
                  userLng={userCoords?.lng}
                />
              ))}
            </div>

            {/* Keyset Infinite Scroll Observer Target */}
            <div ref={observerTargetRef} className="py-2" />

            {/* Lightweight Loading Indicator for Subsequent Pages */}
            {loadingMore && (
              <div
                className="flex items-center justify-center gap-2 py-4 text-gray-500 text-xs font-medium"
                role="status"
                aria-label="Loading more notices"
              >
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Loading more notices...</span>
              </div>
            )}

            {/* Load More Fallback Button if needed */}
            {hasMore && !loadingMore && (
              <div className="text-center py-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNotices(false)}
                  fullWidth
                  className="rounded-xl font-bold text-xs"
                >
                  Load More Notices
                </Button>
              </div>
            )}

            {/* End of Feed State */}
            {!hasMore && notices.length > 0 && (
              <div className="text-center py-6 text-gray-400 text-xs font-medium flex items-center justify-center gap-2">
                <span className="w-8 h-px bg-gray-200" />
                <span>You're all caught up</span>
                <span className="w-8 h-px bg-gray-200" />
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-gray-100 mt-2 shadow-2xs">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Search size={24} aria-hidden="true" />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">
              No notices found
            </h3>
            <p className="text-gray-500 text-xs max-w-xs mx-auto leading-relaxed mb-4">
              {debouncedSearch
                ? `No notices match "${debouncedSearch}". Try another keyword or category.`
                : activeTab === 'nearby'
                ? `No near notices in ${currentCity.split(',')[0]} under "${selectedCategory}". Be the first to share one!`
                : `No active notices in ${currentCity.split(',')[0]} under "${selectedCategory}". Be the first to share one!`}
            </p>
            <Button
              variant="primary"
              size="sm"
              className="rounded-xl font-bold cursor-pointer"
              onClick={() => {
                if (handleGuestAction('create a notice', '/notices/new')) {
                  navigate('/notices/new');
                }
              }}
            >
              Create a Notice
            </Button>
          </div>
        )}
      </main>

      {/* Guest Sign-in Prompt Modal */}
      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        reason={authModalReason}
        nextPath={authModalNext}
      />
    </div>
  );
}
