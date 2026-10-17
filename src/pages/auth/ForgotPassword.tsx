import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { TextField } from '../../components/common/TextField';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { authService } from '../../features/auth/authService';
import { getCooldownStatus, triggerCooldown } from '../../features/auth/cooldown';
import { mapAuthError } from '../../features/auth/authErrors';
import { sanitizeReturnPath } from '../../lib/safeReturnPath';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get('next');
  const safeNext = sanitizeReturnPath(rawNext, '/');
  const nextQuery = safeNext !== '/' ? `?next=${encodeURIComponent(safeNext)}` : '';

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    const update = () => {
      const status = getCooldownStatus('recovery');
      setCooldownSeconds(status.remainingSeconds);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (cooldownSeconds > 0 || loading) return;

    setLoading(true);

    try {
      const origin = window.location.origin;
      // Recovery flow parameter in callback
      const callbackUrl = `${origin}/auth/callback?flow=recovery`;

      await authService.resetPasswordForEmail({
        email: cleanEmail,
        redirectTo: callbackUrl,
      });

      triggerCooldown('recovery', 60);
      setSubmitted(true);
    } catch (err: unknown) {
      // Anti-enumeration: only network and rate limit errors are surfaced
      const errObj = err as { status?: number; code?: string };
      if (errObj?.status === 429 || errObj?.code === 'over_request_rate_limit') {
        setError(mapAuthError(err));
      } else {
        // Generic success display to prevent user enumeration
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Reset your password"
      subheading="Enter your email to receive a password reset link"
    >
      {submitted ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
            <CheckCircle2 size={32} />
          </div>

          <h3 className="font-bold text-gray-900 text-lg">Check your inbox</h3>

          <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
            If an account matches <span className="font-semibold text-gray-800">{email}</span>,
            you will receive an email with instructions to reset your password shortly.
          </p>

          <div className="pt-4">
            <Link to={`/auth${nextQuery}`} className="block">
              <Button fullWidth variant="outline" className="py-3.5 rounded-xl font-bold gap-1.5 cursor-pointer">
                <ArrowLeft size={16} /> Return to Sign In
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <TextField
            label="Account Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="you@example.com"
            leftIcon={<Mail size={18} aria-hidden="true" />}
            disabled={loading}
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={loading}
              disabled={cooldownSeconds > 0}
              className="py-3.5 rounded-xl font-bold text-sm shadow-sm bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound size={17} />
              {cooldownSeconds > 0
                ? `Wait ${cooldownSeconds}s before retry`
                : 'Send reset link'}
            </Button>
          </div>

          <div className="text-center pt-3 border-t border-gray-100 mt-4">
            <Link
              to={`/auth${nextQuery}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-2 px-3 rounded-xl transition-colors min-h-[44px]"
            >
              <ArrowLeft size={18} /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
