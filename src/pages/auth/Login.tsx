import React, { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, AlertCircle, RefreshCw } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { TextField } from '../../components/common/TextField';
import { PasswordField } from '../../components/common/PasswordField';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { authService } from '../../features/auth/authService';
import { mapAuthError } from '../../features/auth/authErrors';
import { sanitizeReturnPath } from '../../lib/safeReturnPath';
import { useAuth } from '../../contexts/AuthContext';

import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSession } = useAuth();

  const rawNext = searchParams.get('next');
  const safeNext = sanitizeReturnPath(rawNext, '/');
  const nextQuery = safeNext !== '/' ? `?next=${encodeURIComponent(safeNext)}` : '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // Client-side backoff after 5 consecutive failures
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [backoffSeconds, setBackoffSeconds] = useState(0);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    }

    setErrors(errs);

    // Focus first invalid field
    if (errs.email) {
      emailInputRef.current?.focus();
    } else if (errs.password) {
      passwordInputRef.current?.focus();
    }

    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setUnverifiedEmail(null);

    if (backoffSeconds > 0) return;
    if (!validate() || loading) return;

    setLoading(true);

    try {
      const data = await authService.signInWithPassword({
        email,
        password,
      });

      // Verify that email is confirmed or session is server-issued
      const user = data.user;
      const isConfirmed = Boolean(
        user?.email_confirmed_at ||
        (user as any)?.confirmed_at ||
        user?.app_metadata?.provider !== 'email' ||
        data.session
      );
      if (!isConfirmed) {
        // Sign out unverified session
        await authService.signOut('local');
        setUnverifiedEmail(email.trim().toLowerCase());
        setFormError('Please verify your email address before logging in.');
        setLoading(false);
        return;
      }

      await refreshSession();

      // Successful login -> navigate to intended destination
      navigate(safeNext, { replace: true });
    } catch (err: unknown) {
      const errorObj = err as { code?: string; status?: number };
      const code = errorObj?.code?.toLowerCase();

      if (code === 'email_not_confirmed') {
        setUnverifiedEmail(email.trim().toLowerCase());
        setFormError('Please verify your email address before logging in.');
      } else {
        setFormError(mapAuthError(err));
        const newFailCount = failedAttempts + 1;
        setFailedAttempts(newFailCount);

        // Client backoff after 5 consecutive failures
        if (newFailCount >= 5) {
          const backoffDuration = 30;
          setBackoffSeconds(backoffDuration);
          const timer = setInterval(() => {
            setBackoffSeconds((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendForUnverified = async () => {
    if (!unverifiedEmail) return;
    try {
      const origin = window.location.origin;
      const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
      await authService.resendVerification({
        email: unverifiedEmail,
        redirectTo: callbackUrl,
      });
      navigate(`/verify-email${nextQuery}`, {
        state: { email: unverifiedEmail },
        replace: true,
      });
    } catch (err: unknown) {
      setFormError(mapAuthError(err));
    }
  };

  return (
    <AuthLayout
      heading="Welcome Back"
      subheading="Sign in to your account to post and explore community notices."
    >
      <div className="space-y-3.5">
        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs">
              <p className="font-semibold">{formError}</p>
              {unverifiedEmail && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResendForUnverified}
                    className="gap-1.5 text-xs rounded-xl"
                  >
                    <RefreshCw size={13} /> Resend verification email
                  </Button>
                </div>
              )}
            </div>
          )}

          {backoffSeconds > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs">
              <p className="font-bold">Too many failed attempts</p>
              <p className="mt-0.5">Please wait {backoffSeconds}s before attempting to log in again.</p>
            </div>
          )}

          <TextField
            ref={emailInputRef}
            label="Email address"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            onBlur={() => {
              if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
              }
            }}
            error={errors.email}
            placeholder="you@example.com"
            leftIcon={<Mail size={18} aria-hidden="true" />}
            disabled={loading || backoffSeconds > 0}
          />

          <div>
            <PasswordField
              ref={passwordInputRef}
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              error={errors.password}
              disabled={loading || backoffSeconds > 0}
            />

            <div className="flex justify-end mt-1.5">
              <Link
                to={`/forgot-password${nextQuery}`}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={loading}
              disabled={backoffSeconds > 0}
              className="py-3.5 rounded-xl font-bold text-sm shadow-sm bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Log In</span>
              <span aria-hidden="true">&rarr;</span>
            </Button>
          </div>
        </form>

        {/* OR Divider */}
        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
              OR
            </span>
          </div>
        </div>

        {/* 1-Click Google Login */}
        <GoogleAuthButton
          label="Continue with Google"
          next={safeNext}
          onError={(err) => setFormError(err)}
        />

        <div className="text-center pt-3 border-t border-gray-100 mt-4">
          <p className="text-xs text-gray-500">
            Don't have an account?{' '}
            <Link
              to={`/auth?mode=signup${nextQuery ? `&${nextQuery.slice(1)}` : ''}`}
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline ml-0.5"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
