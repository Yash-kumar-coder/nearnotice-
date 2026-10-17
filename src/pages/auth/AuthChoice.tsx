import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';
import { TextField } from '../../components/common/TextField';
import { PasswordField } from '../../components/common/PasswordField';
import { Button } from '../../components/common/Button';
import { authService } from '../../features/auth/authService';
import { validatePassword } from '../../features/auth/passwordPolicy';
import { mapAuthError } from '../../features/auth/authErrors';
import { sanitizeReturnPath } from '../../lib/safeReturnPath';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthChoice() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshSession } = useAuth();

  const rawNext = searchParams.get('next');
  const safeNext = sanitizeReturnPath(rawNext, '/');
  const nextQuery = safeNext !== '/' ? `?next=${encodeURIComponent(safeNext)}` : '';

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  // Form inputs
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Validation & feedback state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // Client backoff on repeated failures
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [backoffSeconds, setBackoffSeconds] = useState(0);

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setFormError(null);
    setGoogleError(null);
    setErrors({});
    const params = new URLSearchParams(searchParams);
    if (newMode === 'signup') {
      params.set('mode', 'signup');
    } else {
      params.delete('mode');
    }
    setSearchParams(params, { replace: true });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const cleanEmail = email.trim();

    if (mode === 'signup') {
      const cleanName = displayName.trim();
      if (!cleanName) {
        errs.displayName = 'Please enter your full name';
      } else if (cleanName.length < 2) {
        errs.displayName = 'Name must be at least 2 characters long';
      } else if (cleanName.includes('@')) {
        errs.displayName = 'Please enter your actual name, not an email address';
      }
    }

    if (!cleanEmail) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (mode === 'signup') {
      const passResult = validatePassword(password, cleanEmail);
      if (!passResult.isValid) {
        errs.password = passResult.error || 'Password does not meet requirements';
      }
    }

    setErrors(errs);
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
      if (mode === 'signin') {
        // Sign In Flow
        const data = await authService.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        const user = data.user;
        const isConfirmed = Boolean(
          user?.email_confirmed_at ||
          (user as any)?.confirmed_at ||
          user?.app_metadata?.provider !== 'email' ||
          data.session
        );

        if (!isConfirmed) {
          await authService.signOut('local');
          setUnverifiedEmail(email.trim().toLowerCase());
          setFormError('Please verify your email address before logging in.');
          setLoading(false);
          return;
        }

        await refreshSession();
        navigate(safeNext, { replace: true });
      } else {
        // Create Account Flow
        const origin = window.location.origin;
        const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

        const data = await authService.signUp({
          email: email.trim().toLowerCase(),
          password,
          redirectTo: callbackUrl,
          displayName: displayName.trim() || undefined,
        });

        if (data?.session) {
          try {
            sessionStorage.setItem('nearnotice:show_name_prompt', 'true');
          } catch {
            // no-op
          }
          await refreshSession();
          navigate(safeNext, { replace: true });
          return;
        }

        try {
          sessionStorage.setItem('nearnotice:pending_verify_email', email.trim().toLowerCase());
        } catch {
          // fallback
        }

        navigate(`/verify-email${nextQuery}`, {
          state: { email: email.trim().toLowerCase() },
          replace: true,
        });
      }
    } catch (err: unknown) {
      const errorObj = err as { code?: string; status?: number };
      const code = errorObj?.code?.toLowerCase();

      if (code === 'email_not_confirmed') {
        setUnverifiedEmail(email.trim().toLowerCase());
        setFormError('Please verify your email address before logging in.');
      } else {
        setFormError(mapAuthError(err));

        if (mode === 'signin') {
          const newFailCount = failedAttempts + 1;
          setFailedAttempts(newFailCount);

          if (newFailCount >= 5) {
            setBackoffSeconds(30);
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
    <div className="w-full min-h-screen bg-white flex flex-col justify-between selection:bg-blue-100">
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between px-5 sm:px-8 py-5">
        <div>
          {/* Top Feed Backlink */}
          <div className="mb-3.5 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 py-2 px-2.5 -ml-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px]"
            >
              <ArrowLeft size={20} className="shrink-0" />
              <span>Back to noticeboard</span>
            </Link>
          </div>

          {/* Real Brand Logo in Top Center */}
          <div className="mb-4 flex justify-center">
            <Link to="/" className="inline-flex items-center justify-center group">
              <img
                src="/logo.png"
                alt="NearNotice"
                className="h-14 sm:h-16 w-auto object-contain group-hover:scale-105 transition-transform"
              />
            </Link>
          </div>

          {/* Headline & Subtitle */}
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-1">
              {mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              {mode === 'signin'
                ? 'Sign in to your account to post and explore community notices.'
                : 'Join NearNotice and be part of your local community.'}
            </p>
          </div>

        {/* Error Feedback */}
        {formError && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs">
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

        {/* Backoff notification */}
        {backoffSeconds > 0 && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs">
            <p className="font-bold">Too many failed attempts</p>
            <p className="mt-0.5">Please wait {backoffSeconds}s before trying again.</p>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Display Name (Only in Create Account mode) */}
          {mode === 'signup' && (
            <TextField
              label="Display name"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: '' }));
              }}
              error={errors.displayName}
              placeholder="Your name (e.g. Rahul Sharma)"
              leftIcon={<User size={18} className="text-gray-400" aria-hidden="true" />}
              disabled={loading}
            />
          )}

          {/* Email Address */}
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            error={errors.email}
            placeholder="you@example.com"
            leftIcon={<Mail size={18} className="text-gray-400" aria-hidden="true" />}
            disabled={loading || backoffSeconds > 0}
          />

          {/* Password */}
          <div>
            <PasswordField
              label="Password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              error={errors.password}
              placeholder={
                mode === 'signin' ? 'Enter your password' : 'Create a password (min 6 characters)'
              }
              disabled={loading || backoffSeconds > 0}
            />

            {/* Forgot Password link on Sign In */}
            {mode === 'signin' && (
              <div className="flex justify-end mt-1.5">
                <Link
                  to={`/forgot-password${nextQuery}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}
          </div>

          {/* Password Checklist on Create Account */}
          {mode === 'signup' && (
            <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={15}
                  className={
                    password.length >= 6
                      ? 'text-emerald-600 fill-emerald-100 shrink-0'
                      : 'text-gray-300 shrink-0'
                  }
                />
                <span
                  className={password.length >= 6 ? 'text-emerald-800 font-medium' : 'text-gray-500'}
                >
                  At least 6 characters
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={15}
                  className={
                    /[a-zA-Z]/.test(password) && /[0-9]/.test(password)
                      ? 'text-emerald-600 fill-emerald-100 shrink-0'
                      : 'text-gray-300 shrink-0'
                  }
                />
                <span
                  className={
                    /[a-zA-Z]/.test(password) && /[0-9]/.test(password)
                      ? 'text-emerald-800 font-medium'
                      : 'text-gray-500'
                  }
                >
                  Include a mix of letters and numbers
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={15}
                  className={
                    /[A-Z]/.test(password) && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)
                      ? 'text-emerald-600 fill-emerald-100 shrink-0'
                      : 'text-gray-300 shrink-0'
                  }
                />
                <span
                  className={
                    /[A-Z]/.test(password) &&
                    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)
                      ? 'text-emerald-800 font-medium'
                      : 'text-gray-500'
                  }
                >
                  Keep it secure (uppercase & symbol: @, #, $, etc.)
                </span>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading || backoffSeconds > 0}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
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

        {/* Google OAuth Button */}
        <div>
          <GoogleAuthButton
            label="Continue with Google"
            next={safeNext}
            onError={(err) => setGoogleError(err)}
          />

          {googleError && (
            <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs">
              <div className="flex items-start gap-1.5">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Google login unavailable on server. Please use email and password above.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mode Switch Footer */}
      <div className="text-center pt-4 pb-2 text-sm text-gray-600 mt-auto">
        {mode === 'signin' ? (
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Login
            </button>
          </p>
        )}
      </div>
    </div>
  </div>
  );
}
