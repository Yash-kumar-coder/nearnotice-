import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, PlusCircle, AlertCircle, Eye, Edit3 } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Notice } from '../types/database.types';

export default function ManageNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserNotices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('notices')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setNotices((data as Notice[]) || []);
    } catch (e: unknown) {
      console.error('[NearNotice] Failed to fetch user notices:', e);
      setError('Unable to load your notices. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserNotices();
  }, [fetchUserNotices]);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteTargetId || !user) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const { error: delErr } = await supabase
        .from('notices')
        .delete()
        .eq('id', deleteTargetId)
        .eq('owner_id', user.id);

      if (delErr) throw delErr;
      setNotices((prev) => prev.filter((n) => n.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (e: unknown) {
      console.error('[NearNotice] Failed to delete notice:', e);
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete notice.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-5 pb-24 space-y-6">
      <header className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Notices</h1>
          <p className="text-xs text-gray-500">View and manage notices you've published</p>
        </div>
        <Link
          to="/profile"
          className="text-xs font-semibold text-primary hover:text-blue-700 hover:bg-blue-50 py-1.5 px-2.5 rounded-lg transition-colors flex items-center gap-1.5 min-h-[44px]"
        >
          <ArrowLeft size={18} /> Profile
        </Link>
      </header>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Loading your notices...</p>
        </div>
      ) : notices.length > 0 ? (
        <div className="space-y-3">
          {notices.map((n) => (
            <div
              key={n.id}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex justify-between items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-primary px-2 py-0.5 rounded">
                    {n.category}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      n.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {n.status}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-gray-900 truncate">
                  {n.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{n.area_label}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Link
                  to={`/notice/${n.id}`}
                  aria-label="View notice"
                  className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Eye size={16} />
                </Link>

                <Link
                  to={`/notices/${n.id}/edit`}
                  aria-label="Edit notice"
                  className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Edit3 size={16} />
                </Link>

                <button
                  type="button"
                  onClick={() => setDeleteTargetId(n.id)}
                  aria-label="Delete notice"
                  className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs text-center space-y-3">
          <h3 className="font-bold text-gray-900 text-base">You haven't posted any notices</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Share announcements, garage sales, community meetings, or services with neighbors.
          </p>
          <div className="pt-2">
            <Link to="/notices/new">
              <Button size="sm" variant="primary" className="gap-1.5">
                <PlusCircle size={15} /> Create First Notice
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center relative animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>

            <h3 className="font-bold text-gray-900 text-lg mb-2">
              Remove This Notice?
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Are you sure you want to permanently delete this notice? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs text-left">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteTargetId(null);
                  setDeleteError(null);
                }}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
