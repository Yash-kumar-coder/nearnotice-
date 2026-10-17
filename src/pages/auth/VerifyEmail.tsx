import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { MailCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/common/Button';
import { authService } from '../../features/auth/authService';
import {
  getCooldownStatus,
  triggerCooldown,
} from '../../features/auth/cooldown';
import { mapAuthError } from '../../features/auth/authErrors';
import { sanitizeReturnPath } from '../../lib/safeReturnPath';
import { useAuth } from '../../contexts/AuthContext';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status } = useAuth();

  const rawNext = searchParams.get('next');
  const safeNext = sanitizeReturnPath(rawNext, '/');

  // Recover email from location state or sessionStorage
  const [email] = useState<string>(() => {
    const fromState = (location.state as { email?: string })?.email;
    if (fromState) return fromState;
    try {
      return sessionStorage.getItem('nearnotice:pending_verify_email') || '';
    } catch {
      return '';
    }
  });

  const [inputEmail, setInputEmail] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [attemptsExhausted, setAttemptsExhausted] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  // Auto-redirect if user confirmed in another tab
  useEffect(() => {
    if (status === 'authenticated') {
      try {
        sessionStorage.removeItem('nearnotice:pending_verify_email');
      } catch {
        // no-op
      }
      navigate(safeNext, { replace: true });
    }
  }, [status, safeNext, navigate]);

  // Cooldown countdown interval
  useEffect(() => {
    const updateCooldown = () => {
      const current = getCooldownStatus('signup');
      setCooldownSeconds(current.remainingSeconds);
      setAttemptsExhausted(current.attemptsExhausted);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const effectiveEmail = (email || inputEmail).trim();

  const handleResend = async () => {
    if (!effectiveEmail || cooldownSeconds > 0 || attemptsExhausted || resendLoading) return;

    setResendLoading(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const origin = window.location.origin;
      const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

      await authService.resendVerification({
        email: effectiveEmail,
        redirectTo: callbackUrl,
      });

      triggerCooldown('signup', 60);
      setResendSuccess(true);
    } catch (err: unknown) {
      console.error('[NearNotice] Resend verification failed:', err);
      setResendError(mapAuthError(err));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Check your email"
      subheading="We sent a confirmation link to your email."
      showBackToFeed={false}
    >
      <div className="text-center space-y-5">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-blue-100">
          <MailCheck size={32} aria-hidden="true" />
        </div>

        {email ? (
          <div className="bg-gray-100 rounded-xl px-4 py-2 inline-block text-xs font-semibold text-gray-800 break-all">
            {email}
          </div>
        ) : (
          <div className="max-w-xs mx-auto text-left">
            <input
              type="email"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 focus:bg-white transition-all font-medium"
            />
          </div>
        )}

        <p className="text-sm text-gray-600 max-w-xs mx-auto">
          Click the link in your email to activate your account.
        </p>

        {resendSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium">
            Link resent! Please check your inbox.
          </div>
        )}

        {resendError && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
            {resendError}
          </div>
        )}

        <div className="pt-2 space-y-3">
          <Button
            fullWidth
            variant="primary"
            onClick={handleResend}
            disabled={cooldownSeconds > 0 || attemptsExhausted || !effectiveEmail}
            isLoading={resendLoading}
            className="py-3.5 rounded-xl font-bold text-sm shadow-sm bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw size={15} className={resendLoading ? 'animate-spin' : ''} />
            {cooldownSeconds > 0
              ? `Resend in ${cooldownSeconds}s`
              : attemptsExhausted
              ? 'Maximum resends reached'
              : 'Resend email'}
          </Button>

          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2.5 rounded-xl transition-colors w-full cursor-pointer min-h-[44px]"
          >
            <ArrowLeft size={18} /> Back to Sign In
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
