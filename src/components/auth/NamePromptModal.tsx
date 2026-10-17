import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserCheck, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { sanitizeDisplayName } from '../../utils/author';

export function NamePromptModal() {
  const { user, status, updateDisplayName } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !user) {
      setIsOpen(false);
      return;
    }

    const dismissed = sessionStorage.getItem('nearnotice:name_prompt_dismissed');
    if (dismissed === 'true') {
      setIsOpen(false);
      return;
    }

    const explicitTrigger = sessionStorage.getItem('nearnotice:show_name_prompt') === 'true';
    const rawName =
      (user.user_metadata?.display_name as string) ||
      (user.user_metadata?.full_name as string) ||
      '';
    const validName = sanitizeDisplayName(rawName);

    // If explicit trigger or the user has no real display name set (or their name is an email)
    if (explicitTrigger || !validName) {
      setName(validName || '');
      setIsOpen(true);
    }
  }, [user, status]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('nearnotice:name_prompt_dismissed', 'true');
    sessionStorage.removeItem('nearnotice:show_name_prompt');
    setIsOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = name.trim();
    if (!clean) {
      setError('Please enter your name');
      return;
    }

    if (clean.includes('@')) {
      setError('Please enter your actual name, not an email address');
      return;
    }

    if (clean.length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }

    if (clean.length > 50) {
      setError('Name cannot exceed 50 characters');
      return;
    }

    setLoading(true);

    try {
      await updateDisplayName(clean);
      setSuccess(true);
      sessionStorage.removeItem('nearnotice:show_name_prompt');
      sessionStorage.setItem('nearnotice:name_prompt_dismissed', 'true');
      setTimeout(() => {
        setIsOpen(false);
      }, 700);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj?.message || 'Failed to update name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center relative animate-in zoom-in-95 duration-200">
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-2xs">
          {success ? (
            <CheckCircle2 size={30} className="text-emerald-600 animate-in zoom-in-50 duration-200" />
          ) : (
            <UserCheck size={28} />
          )}
        </div>

        {success ? (
          <div className="py-2 space-y-2">
            <h3 className="font-extrabold text-gray-900 text-lg">Name Saved!</h3>
            <p className="text-xs text-emerald-700 font-medium">
              Neighbors will now see your name on all your notices.
            </p>
          </div>
        ) : (
          <>
            <h3 id="name-prompt-title" className="font-extrabold text-gray-900 text-xl mb-1.5 tracking-tight">
              Add Your Name
            </h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed px-1">
              Your name will be visible to neighbors on every notice and post you publish in your community.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-semibold flex items-center gap-1.5 text-left">
                <AlertCircle size={15} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Rahul Sharma"
                  maxLength={50}
                  autoFocus
                  disabled={loading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none font-medium"
                />
                <span className="block text-[11px] text-gray-400 text-right mt-1 font-medium">
                  {name.length}/50 characters
                </span>
              </div>

              <div className="pt-1 space-y-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={loading}
                  className="py-3.5 rounded-xl font-bold text-sm shadow-sm bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles size={16} />
                  <span>Save Name & Continue</span>
                </Button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={loading}
                  className="w-full py-2.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  I'll do this later
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
