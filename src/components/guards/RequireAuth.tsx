import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageSkeleton } from '../common/Skeleton';
import { sanitizeReturnPath } from '../../lib/safeReturnPath';

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Route guard for protected pages.
 * - Shows a skeleton while auth status is 'loading' (prevents flash of content or premature redirect).
 * - Redirects unauthenticated users to /auth with encoded, sanitized return path via replace.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PageSkeleton />;
  }

  if (status !== 'authenticated') {
    const rawDestination = `${location.pathname}${location.search}${location.hash}`;
    const safeNext = sanitizeReturnPath(rawDestination, '/');
    const redirectUrl = `/auth?next=${encodeURIComponent(safeNext)}`;

    return <Navigate to={redirectUrl} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
