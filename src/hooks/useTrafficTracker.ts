import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const VISITOR_HASH_KEY = 'nearnotice_v_hash';

function getVisitorHash(): string {
  if (typeof window === 'undefined') return 'anon';
  try {
    let hash = sessionStorage.getItem(VISITOR_HASH_KEY);
    if (!hash) {
      hash = 'v_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      sessionStorage.setItem(VISITOR_HASH_KEY, hash);
    }
    return hash;
  } catch {
    return 'anon';
  }
}

/**
 * Native Supabase Traffic Tracking Hook
 * Tracks page visits anonymously, dedupes React 19 / StrictMode double-triggers,
 * and completely excludes private /author routes.
 */
export function useTrafficTracker() {
  const location = useLocation();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;

    // Never track author console routes
    if (path.startsWith('/author')) {
      return;
    }

    // Deduplicate same-route triggers
    if (lastTrackedRef.current === path) {
      return;
    }
    lastTrackedRef.current = path;

    const visitorHash = getVisitorHash();

    // Fire and forget atomic visit recording
    void (async () => {
      try {
        await supabase.rpc('record_site_visit', {
          p_path: path,
          p_visitor_hash: visitorHash,
        });
      } catch (err) {
        // Silently ignore tracking errors so they never disrupt user experience
        console.debug('Traffic tracking suppressed:', err);
      }
    })();
  }, [location.pathname]);
}
