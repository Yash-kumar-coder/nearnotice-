import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, LogIn, RefreshCw, KeyRound } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/common/Button';
import { authService } from '../../features/auth/authService';
import { sanitizeReturnPath } from '../../lib/safeReturnPath';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSession } = useAuth();

  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'verifier_missing'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // StrictMode double-execution prevention
  const executionRef = useRef(false);

  useEffect(() => {
    if (executionRef.current) return;
    executionRef.current = true;

    const processAuthCallback = async () => {
      // 1. Parse params from search and hash (Supabase can send in either depending on config)
      const currentUrl = new URL(window.location.href);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      const code = currentUrl.searchParams.get('code') || hashParams.get('code');
      const errorCode =
        currentUrl.searchParams.get('error_code') ||
        hashParams.get('error_code') ||
        currentUrl.searchParams.get('error') ||
        hashParams.get('error');
      const errorDescription =
        currentUrl.searchParams.get('error_description') ||
        hashParams.get('error_description');

      const flow = currentUrl.searchParams.get('flow') || currentUrl.searchParams.get('type');
      const rawNext = currentUrl.searchParams.get('next');
      const safeNext = sanitizeReturnPath(rawNext, '/');

      // 2. Immediately strip sensitive code/tokens from URL to protect history
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {
        // no-op
      }

      // Check for error return from Supabase
      if (errorCode) {
        console.error('[NearNotice Auth] Callback returned error:', errorCode, errorDescription);
        if (errorCode === 'otp_expired' || errorCode === 'access_denied') {
          setErrorMessage(
            'This confirmation link has expired or has already been used. Please request a new one.'
          );
        } else {
          setErrorMessage(errorDescription || 'Authentication failed. Please try again.');
        }
        setStatus('error');
        return;
      }

      // 3. Handle code exchange if code is present
      if (code) {
        try {
          await authService.exchangeCodeForSession(code);
          await refreshSession();

          // Server-validate with getUser()
          const verifiedUser = await authService.getUser();

          if (!verifiedUser) {
            setStatus('error');
            setErrorMessage('Unable to verify user session. Please log in.');
            return;
          }

          // Check if this was a recovery flow
          if (flow === 'recovery') {
            navigate('/reset-password', { replace: true });
            return;
          }

          // Email confirmation success -> navigate to safe destination
          try {
            if (!verifiedUser.user_metadata?.display_name && !verifiedUser.user_metadata?.full_name) {
              sessionStorage.setItem('nearnotice:show_name_prompt', 'true');
            }
          } catch {
            // no-op
          }
          setStatus('success');
          setTimeout(() => {
            navigate(safeNext, { replace: true });
          }, 800);
        } catch (err: unknown) {
          console.error('[NearNotice Auth] Code exchange failed:', err);
          const errString = String(err);

          // Handle PKCE code verifier missing (e.g. link opened in different browser)
          if (
            errString.includes('code verifier') ||
            errString.includes('bad_code_verifier') ||
            errString.includes('PKCE')
          ) {
            setStatus('verifier_missing');
            return;
          }

          // Re-check if session already exists (e.g. page refreshed after consumption)
          const currentSession = await authService.getSession();
          if (currentSession) {
            navigate(safeNext, { replace: true });
            return;
          }

          setStatus('error');
          setErrorMessage(
            'This link is invalid, expired, or has already been used. Please sign in or request a new link.'
          );
        }
        return;
      }

      // 4. If no code was in URL, check if already authenticated (e.g. user refreshed the callback route)
      const existingSession = await authService.getSession();
      if (existingSession) {
        navigate(safeNext, { replace: true });
        return;
      }

      setStatus('error');
      setErrorMessage('No authentication code was found in the link.');
    };

    processAuthCallback();
  }, [navigate, refreshSession]);

  return (
    <AuthLayout heading="Verifying Account" showBackToFeed={false}>
      {status === 'processing' && (
        <div className="text-center py-6 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full border-3 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-gray-600">Completing verification, please wait...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center py-6 space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Verification Successful!</h3>
          <p className="text-xs text-gray-600">Redirecting to your destination...</p>
        </div>
      )}

      {status === 'verifier_missing' && (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-blue-100">
            <LogIn size={28} />
          </div>
          <h3 className="font-bold text-gray-900 text-base">
            Email Confirmed
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
            Your verification link was opened in a different browser. Your email is
            confirmed on the server. Please log in with your credentials to continue.
          </p>
          <div className="pt-2">
            <Button
              fullWidth
              variant="primary"
              onClick={() => navigate('/login', { replace: true })}
            >
              Log In Now
            </Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-red-100">
            <AlertCircle size={28} />
          </div>
          <h3 className="font-bold text-gray-900 text-base">Link Expired or Invalid</h3>
          <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
            {errorMessage}
          </p>
          <div className="pt-2 space-y-2">
            <Button
              fullWidth
              variant="primary"
              onClick={() => navigate('/login', { replace: true })}
            >
              Go to Log In
            </Button>
            <Button
              fullWidth
              variant="outline"
              onClick={() => navigate('/forgot-password', { replace: true })}
              className="gap-1.5"
            >
              <KeyRound size={15} /> Request Password Reset
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
