import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService } from '../features/auth/authService';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  isConfigured: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const checkUserStatus = (activeSession: Session | null, activeUser: User | null): {
    session: Session | null;
    user: User | null;
    status: AuthStatus;
  } => {
    // Treat as authenticated if session and user exist and confirmed
    if (activeSession && activeUser) {
      const isConfirmed = Boolean(
        activeUser.email_confirmed_at ||
        (activeUser as any).confirmed_at ||
        activeUser.app_metadata?.provider !== 'email' ||
        activeSession.user?.email_confirmed_at
      );
      if (isConfirmed) {
        return { session: activeSession, user: activeUser, status: 'authenticated' };
      }
      return { session: null, user: null, status: 'unauthenticated' };
    }
    return { session: null, user: null, status: 'unauthenticated' };
  };

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setStatus('unauthenticated');
      return;
    }

    // 1. Initial server-verified session resolution
    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!initialSession) {
          if (isMounted) {
            setSession(null);
            setUser(null);
            setStatus('unauthenticated');
          }
          return;
        }

        // Server-validate with getUser() rather than relying solely on localStorage
        const verifiedUser = await authService.getUser();
        if (isMounted) {
          const authState = checkUserStatus(initialSession, verifiedUser);
          setSession(authState.session);
          setUser(authState.user);
          setStatus(authState.status);
        }
      } catch (err) {
        console.error('[NearNotice Auth] Initial auth resolution error:', err);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setStatus('unauthenticated');
        }
      }
    };

    initAuth();

    // 2. Auth state subscription with deadlock protection
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Defer async calls with setTimeout(0) to prevent onAuthStateChange deadlocks
      setTimeout(async () => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null);
          setUser(null);
          setStatus('unauthenticated');
          return;
        }

        try {
          const verifiedUser = await authService.getUser();
          if (isMounted) {
            const authState = checkUserStatus(newSession, verifiedUser);
            setSession(authState.session);
            setUser(authState.user);
            setStatus(authState.status);
          }
        } catch (err) {
          console.error('[NearNotice Auth] Auth change error:', err);
          if (isMounted) {
            setSession(null);
            setUser(null);
            setStatus('unauthenticated');
          }
        }
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await authService.signOut('global');
    } finally {
      setSession(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  };

  const refreshSession = async () => {
    try {
      const activeUser = await authService.getUser();
      const activeSession = await authService.getSession();
      const authState = checkUserStatus(activeSession, activeUser);
      setSession(authState.session);
      setUser(authState.user);
      setStatus(authState.status);
    } catch {
      setSession(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  };

  const updateDisplayName = async (displayName: string) => {
    const updatedUser = await authService.updateDisplayName(displayName);
    setUser(updatedUser);
    await refreshSession();
  };

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      status,
      isConfigured: isSupabaseConfigured,
      signOut: handleSignOut,
      refreshSession,
      updateDisplayName,
    }),
    [session, user, status]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
