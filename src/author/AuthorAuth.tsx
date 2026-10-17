import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, AlertCircle, ArrowRight, Lock } from 'lucide-react';

interface AuthorAuthProps {
  onSuccess: () => void;
}

export default function AuthorAuth({ onSuccess }: AuthorAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg('Invalid author credentials or unauthorized account.');
      } else {
        onSuccess();
      }
    } catch {
      setErrorMsg('Authentication service temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Shield className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-gray-900">
          Author Console
        </h2>
        <p className="mt-1 text-center text-xs text-gray-500">
          Restricted access. NearNotice author & operations clearance only.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-gray-200 rounded-xl shadow-xs">
          {errorMsg && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="author-email"
                className="block text-xs font-medium text-gray-700"
              >
                Author Email
              </label>
              <div className="mt-1">
                <input
                  id="author-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="author@nearnotice.app"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="author-password"
                className="block text-xs font-medium text-gray-700"
              >
                Passkey
              </label>
              <div className="mt-1">
                <input
                  id="author-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors shadow-xs"
              >
                {loading ? (
                  <span>Verifying clearance...</span>
                ) : (
                  <>
                    <span>Sign In to Author Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <Lock className="w-3.5 h-3.5" />
            <span>Postgres Row-Level Security Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
