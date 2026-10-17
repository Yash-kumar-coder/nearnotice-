import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckSquare, Square, User } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';
import { TextField } from '../../components/common/TextField';
import { PasswordField } from '../../components/common/PasswordField';
import { Button } from '../../components/common/Button';
import { FormError } from '../../components/common/FormError';
import { Alert } from '../../components/common/Alert';
import { authService } from '../../features/auth/authService';
import { validatePassword } from '../../features/auth/passwordPolicy';
import { PasswordRequirements } from '../../components/auth/PasswordRequirements';
import { mapAuthError } from '../../features/auth/authErrors';
import { sanitizeReturnPath } from '../../lib/safeReturnPath';

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawNext = searchParams.get('next');
  const safeNext = sanitizeReturnPath(rawNext, '/');
  const nextQuery = safeNext !== '/' ? `?next=${encodeURIComponent(safeNext)}` : '';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};

    const cleanName = fullName.trim();
    if (!cleanName) {
      errs.fullName = 'Please enter your full name';
    } else if (cleanName.length < 2) {
      errs.fullName = 'Name must be at least 2 characters long';
    } else if (cleanName.includes('@')) {
      errs.fullName = 'Please enter your actual name, not an email address';
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Please enter a valid email address';
    }

    const passResult = validatePassword(password, cleanEmail);
    if (!passResult.isValid) {
      errs.password = passResult.error || 'Password does not meet requirements';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      errs.agreeTerms = 'You must agree to the Terms of Service to continue';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate() || loading) return;

    setLoading(true);

    try {
      const cleanName = fullName.trim();
      const origin = window.location.origin;
      const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

      const data = await authService.signUp({
        email,
        password,
        displayName: cleanName,
        redirectTo: callbackUrl,
      });

      // If Supabase auto-confirmed or session is active, navigate directly to destination
      if (data?.session) {
        navigate(safeNext, { replace: true });
        return;
      }

      // Store email in sessionStorage for verify screen recovery on refresh
      try {
        sessionStorage.setItem('nearnotice:pending_verify_email', email.trim().toLowerCase());
      } catch {
        // Storage fallback
      }

      // Navigate to /verify-email with email in state
      navigate(`/verify-email${nextQuery}`, {
        state: { email: email.trim().toLowerCase() },
        replace: true,
      });
    } catch (err: unknown) {
      setFormError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Create your account"
      subheading="Join NearNotice to share community announcements and stay updated"
    >
      <div className="space-y-4">
        {/* 1-Click Google Sign Up */}
        <GoogleAuthButton
          label="Sign up with Google"
          next={safeNext}
          onError={(err) => setFormError(err)}
        />

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400 font-semibold uppercase tracking-wider">
              or with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-semibold">
            {formError}
          </div>
        )}

        <div>
          <TextField
            label="Full name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
            }}
            error={errors.fullName}
            placeholder="e.g. Rahul Sharma"
            leftIcon={<User size={18} aria-hidden="true" />}
            disabled={loading}
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Neighbors will see this name on all your notices and posts
          </p>
        </div>

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
          leftIcon={<Mail size={18} aria-hidden="true" />}
          disabled={loading}
        />

        <div className="space-y-1">
          <PasswordField
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
            }}
            error={errors.password}
            disabled={loading}
          />
          <PasswordRequirements password={password} className="mt-1 mb-2" />
        </div>

        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword)
              setErrors((prev) => ({ ...prev, confirmPassword: '' }));
          }}
          error={errors.confirmPassword}
          disabled={loading}
        />

        <div className="pt-1">
          <label className="flex items-start gap-2.5 text-xs text-gray-600 cursor-pointer select-none">
            <button
              type="button"
              role="checkbox"
              aria-checked={agreeTerms}
              onClick={() => {
                setAgreeTerms(!agreeTerms);
                if (errors.agreeTerms)
                  setErrors((prev) => ({ ...prev, agreeTerms: '' }));
              }}
              className="mt-0.5 text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded cursor-pointer"
            >
              {agreeTerms ? (
                <CheckSquare size={17} className="text-blue-600 fill-blue-50" />
              ) : (
                <Square size={17} className="text-gray-400 hover:text-gray-600" />
              )}
            </button>
            <span className="leading-tight">
              I agree to the{' '}
              <Link
                to="/terms"
                target="_blank"
                className="font-bold text-blue-600 hover:underline"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to="/privacy"
                target="_blank"
                className="font-bold text-blue-600 hover:underline"
              >
                Privacy Policy
              </Link>
            </span>
          </label>
          <FormError id="terms-error" message={errors.agreeTerms} />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={loading}
            className="py-3.5 rounded-xl font-bold text-sm shadow-sm bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Create Account</span>
            <span aria-hidden="true">&rarr;</span>
          </Button>
        </div>

        <div className="text-center pt-3 border-t border-gray-100 mt-4">
          <p className="text-xs text-gray-500">
            Already have an account?{' '}
            <Link
              to={`/auth${nextQuery}`}
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline ml-0.5"
            >
              Log in
            </Link>
          </p>
        </div>
      </form>
      </div>
    </AuthLayout>
  );
}
