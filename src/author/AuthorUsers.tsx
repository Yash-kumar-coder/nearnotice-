import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import { AuthorService } from './authorService';
import type { AuthorUser, AuthorNotice } from './types';
import { supabase } from '../lib/supabase';

export default function AuthorUsers() {
  const [users, setUsers] = useState<AuthorUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Selected User Modal / Notice list
  const [selectedUser, setSelectedUser] = useState<AuthorUser | null>(null);
  const [userNotices, setUserNotices] = useState<AuthorNotice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await AuthorService.getUsers({
        search,
        page,
        limit,
      });
      setUsers(res.users);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to query users directory');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInspectUser = async (user: AuthorUser) => {
    setSelectedUser(user);
    setLoadingNotices(true);
    try {
      const { data, error: qErr } = await supabase
        .from('notices')
        .select('id, title, body, category, status, created_at, owner_id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (qErr) throw qErr;

      const formatted: AuthorNotice[] = (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        content: row.body || '',
        category: row.category,
        status: row.status as 'published' | 'draft' | 'removed',
        created_at: row.created_at,
        owner_id: row.owner_id,
      }));

      setUserNotices(formatted);
    } catch (err) {
      console.error('Failed to query user notices:', err);
    } finally {
      setLoadingNotices(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Community Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Registered resident accounts & aggregated notice statistics · {total} registered residents
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs flex items-center justify-between gap-4">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by resident name or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="text-xs text-gray-400">Loading residents from database...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-600 space-y-2">
            <p>{error}</p>
            <button
              type="button"
              onClick={fetchUsers}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium"
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No residents match the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Resident</th>
                  <th scope="col" className="px-4 py-3">Registration Date (IST)</th>
                  <th scope="col" className="px-4 py-3 text-center">Total Notices</th>
                  <th scope="col" className="px-4 py-3 text-center">Published</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                          {u.display_name ? u.display_name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{u.display_name || 'Anonymous Resident'}</p>
                          <p className="text-[11px] text-gray-400">{u.email || 'No email registered'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                      {new Date(u.created_at).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center font-bold text-gray-800">
                      {u.notices_count}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                        {u.published_notices_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => handleInspectUser(u)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded transition-colors"
                      >
                        Inspect Notices
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
          <div>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} residents
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="p-1.5 border border-gray-300 rounded hover:bg-white disabled:opacity-40"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 py-1 font-mono text-[11px]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="p-1.5 border border-gray-300 rounded hover:bg-white disabled:opacity-40"
              aria-label="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* User Notices Inspector Modal */}
      {selectedUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col font-sans text-xs animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {selectedUser.display_name?.charAt(0) || 'R'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {selectedUser.display_name || 'Anonymous Resident'}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
                <span className="font-medium text-gray-800">
                  Notices Authored ({userNotices.length})
                </span>
                <span className="text-[11px]">Joined: {new Date(selectedUser.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>

              {loadingNotices ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-gray-400">Loading notices...</span>
                </div>
              ) : userNotices.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  This resident has not submitted any notices yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {userNotices.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 max-w-md">
                        <h4 className="font-semibold text-gray-900 text-xs">{n.title}</h4>
                        <p className="text-[11px] text-gray-500 line-clamp-2">{n.content}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-1">
                          <span className="capitalize px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-mono">
                            {n.category}
                          </span>
                          <span>{new Date(n.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium ${
                            n.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {n.status}
                        </span>
                        <a
                          href={`/notice/${n.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                        >
                          <span>View</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
