import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageSkeleton } from '../common/Skeleton';
import { sanitizeReturnPath } from '../../lib/safeReturnPath';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for auth pages (/auth, /login, /signup, /forgot-password).
 * Verified users are redirected away to their requested next path or '/'.
 */
export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'loading') {
    return <PageSkeleton />;
  }

  if (status === 'authenticated') {
    const rawNext = searchParams.get('next');
    const safeDestination = sanitizeReturnPath(rawNext, '/');
    return <Navigate to={safeDestination} replace />;
  }

  return <>{children}</>;
}
