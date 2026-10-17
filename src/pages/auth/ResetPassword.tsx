import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { PasswordField } from '../../components/common/PasswordField';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { authService } from '../../features/auth/authService';
import { validatePassword } from '../../features/auth/passwordPolicy';
import { PasswordRequirements } from '../../components/auth/PasswordRequirements';
import { mapAuthError } from '../../features/auth/authErrors';

export default function ResetPassword() {
  const navigate = useNavigate();

  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyRecoverySession = async () => {
      try {
        const session = await authService.getSession();
        if (session) {
          setHasRecoverySession(true);
        } else {
          setHasRecoverySession(false);
        }
      } catch {
        setHasRecoverySession(false);
      }
    };

    verifyRecoverySession();
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};

    const passResult = validatePassword(password);
    if (!passResult.isValid) {
      errs.password = passResult.error || 'Password does not meet requirements';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
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
      await authService.updatePassword(password);

      // Invalidate existing sessions across all tabs and devices for security
      await authService.signOut('global');

      setSuccess(true);
    } catch (err: unknown) {
      setFormError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (hasRecoverySession === null) {
    return (
      <AuthLayout heading="Reset your password" showBackToFeed={false}>
        <div className="text-center py-6">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Checking recovery credentials...</p>
        </div>
      </AuthLayout>
    );
  }

  if (hasRecoverySession === false && !success) {
    return (
      <AuthLayout heading="Invalid or Expired Link" showBackToFeed={false}>
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-red-100">
            <AlertCircle size={28} />
          </div>

          <h3 className="font-bold text-gray-900 text-base">Password Reset Link Expired</h3>

          <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
            This password reset link is invalid or has expired. For your security,
            reset links are only valid for a single use within a limited time.
          </p>

          <div className="pt-2">
            <Button
              fullWidth
              variant="primary"
              onClick={() => navigate('/forgot-password', { replace: true })}
            >
              Request a New Reset Link
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading="Create new password"
      subheading="Please choose a strong new password for your account"
      showBackToFeed={false}
    >
      {success ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
            <CheckCircle2 size={32} />
          </div>

          <h3 className="font-bold text-gray-900 text-lg">Password Updated!</h3>

          <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
            Your password has been changed successfully. You can now log in with your new password.
          </p>

          <div className="pt-4">
            <Button
              fullWidth
              variant="primary"
              size="lg"
              onClick={() => navigate('/auth', { replace: true })}
              className="py-3.5 rounded-xl font-bold text-sm shadow-sm bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Sign In With New Password <ArrowRight size={17} />
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <PasswordField
              label="New password"
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
            label="Confirm new password"
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

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={loading}
              className="py-3.5 rounded-xl font-bold text-sm shadow-sm bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound size={17} />
              Update Password
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
