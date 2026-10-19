import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AuthorService } from './authorService';
import AuthorAuth from './AuthorAuth';
import AuthorAccessDenied from './AuthorAccessDenied';
import { Loader2 } from 'lucide-react';

interface AuthorGuardProps {
  children?: React.ReactNode;
}

type AuthState = 'checking' | 'unauthenticated' | 'unauthorized' | 'authorized';

export default function AuthorGuard({ children }: AuthorGuardProps) {
  const [authState, setAuthState] = useState<AuthState>('checking');

  // Enforce noindex, nofollow on all author screens
  useEffect(() => {
    let metaRobots = document.querySelector('meta[name="robots"]');
    let created = false;
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
      created = true;
    }
    const previousContent = metaRobots.getAttribute('content');
    metaRobots.setAttribute('content', 'noindex,nofollow');

    return () => {
      if (created) {
        metaRobots?.remove();
      } else if (previousContent) {
        metaRobots?.setAttribute('content', previousContent);
      } else {
        metaRobots?.removeAttribute('content');
      }
    };
  }, []);

  const evaluateAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthState('unauthenticated');
        return;
      }

      const hasClearance = await AuthorService.checkClearance();
      if (hasClearance) {
        setAuthState('authorized');
      } else {
        setAuthState('unauthorized');
      }
    } catch {
      setAuthState('unauthenticated');
    }
  }, []);

  useEffect(() => {
    evaluateAccess();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        evaluateAccess();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      evaluateAccess();
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, [evaluateAccess]);

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="text-xs text-gray-500 font-medium">Verifying clearance...</span>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <AuthorAuth onSuccess={evaluateAccess} />;
  }

  if (authState === 'unauthorized') {
    return <AuthorAccessDenied onSignOut={evaluateAccess} />;
  }

  return <>{children || <Outlet />}</>;
}
