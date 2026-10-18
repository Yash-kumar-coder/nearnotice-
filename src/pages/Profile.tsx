import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { sanitizeDisplayName } from '../utils/author';
import {
  ArrowLeft,
  User,
  Mail,
  ShieldCheck,
  LogOut,
  FileText,
  Bookmark,
  Pencil,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Smartphone,
  HelpCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function Profile() {
  const { user, signOut, updateDisplayName } = useAuth();
  const navigate = useNavigate();
  const { promptInstall, isInstalled } = usePWAInstall();

  const currentDisplayName =
    sanitizeDisplayName(user?.user_metadata?.display_name as string) ||
    sanitizeDisplayName(user?.user_metadata?.full_name as string) ||
    '';

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(currentDisplayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setNameInput(currentDisplayName);
    }
  }, [currentDisplayName, isEditing]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const handleStartEditing = () => {
    setNameInput(currentDisplayName);
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setNameInput(currentDisplayName);
    setError(null);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = nameInput.trim();
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

    setSaving(true);
    try {
      await updateDisplayName(clean);
      setIsEditing(false);
      setSuccessMessage('Name updated! Neighbors will now see your name on all your posts.');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj?.message || 'Failed to update name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const avatarInitial =
    currentDisplayName.trim().charAt(0).toUpperCase() || '';

  return (
    <div className="max-w-md mx-auto p-5 pb-24 space-y-6">
      {/* Top Header with Back Button */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="w-11 h-11 min-w-[44px] min-h-[44px] -ml-2 text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full flex items-center justify-center transition-colors shadow-2xs"
          aria-label="Back to feed"
        >
          <ArrowLeft size={24} className="stroke-[2.25]" />
        </Link>
      </div>

      <header className="pt-1">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Profile</h1>
        <p className="text-xs text-gray-500">Manage your notices and verified credentials</p>
      </header>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* User Information Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl border border-blue-100 shrink-0">
            {avatarInitial || <User size={24} />}
          </div>

          <div className="flex-1 min-w-0">
            {!isEditing ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold text-gray-900 text-lg truncate" title={currentDisplayName || 'Neighbor'}>
                    {currentDisplayName || (
                      <span className="text-gray-400 italic font-normal">No name set</span>
                    )}
                  </h2>
                  <button
                    type="button"
                    onClick={handleStartEditing}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors cursor-pointer shrink-0"
                    title="Edit display name"
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Verified Neighbor</span>
                </div>

                <p className="text-[11px] text-gray-400 pt-0.5">
                  Seen by neighbors on every notice and post you publish
                </p>
              </div>
            ) : (
              <form onSubmit={handleSaveName} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Your Full Name
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {nameInput.length}/50
                    </span>
                  </div>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter your name"
                    maxLength={50}
                    disabled={saving}
                    autoFocus
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none font-medium"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Neighbors will see this name on all your current and future posts.
                  </p>
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-0.5">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={saving}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs px-3.5 py-1.5"
                  >
                    <Check size={13} />
                    <span>Save</span>
                  </Button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleCancelEditing}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <X size={13} />
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Mail size={13} /> Email
            </span>
            <span className="font-mono text-gray-800">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Box */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs divide-y divide-gray-100 overflow-hidden">
        <Link
          to="/notices/manage"
          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-800"
        >
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-blue-600" />
            <span>Manage My Notices</span>
          </div>
          <span className="text-xs text-gray-400">&rarr;</span>
        </Link>

        <Link
          to="/saved"
          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-800"
        >
          <div className="flex items-center gap-3">
            <Bookmark size={18} className="text-blue-600" />
            <span>Saved Notices</span>
          </div>
          <span className="text-xs text-gray-400">&rarr;</span>
        </Link>

        {/* Install NearNotice App Action */}
        {!isInstalled ? (
          <button
            type="button"
            onClick={promptInstall}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-800 cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Smartphone size={18} className="text-blue-600" />
              <div className="flex flex-col text-left">
                <span className="font-medium text-gray-900">Install NearNotice</span>
                <span className="text-[11px] text-gray-500 font-normal">Fast, offline & add to home screen</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg">
              Install
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-between p-4 text-sm font-medium text-gray-600 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <Smartphone size={18} className="text-emerald-600" />
              <div className="flex flex-col text-left">
                <span className="font-medium text-gray-800">NearNotice App</span>
                <span className="text-[11px] text-emerald-600 font-normal">Installed on this device</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
              Installed
            </span>
          </div>
        )}

        {/* Help and Support */}
        <Link
          to="/support"
          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-800"
        >
          <div className="flex items-center gap-3">
            <HelpCircle size={18} className="text-blue-600" />
            <div className="flex flex-col text-left">
              <span className="font-medium text-gray-900">Help & Support</span>
              <span className="text-[11px] text-gray-500 font-normal">
                FAQs, Contact Form, Report Issues & Safety
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-400">&rarr;</span>
        </Link>
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <Button
          fullWidth
          variant="outline"
          onClick={handleSignOut}
          className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        >
          <LogOut size={16} /> Log Out
        </Button>
      </div>
    </div>
  );
}
