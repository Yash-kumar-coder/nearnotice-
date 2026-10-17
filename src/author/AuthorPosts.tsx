import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Phone,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  X,
  Edit2,
  ExternalLink,
  Flag,
} from 'lucide-react';
import { AuthorService } from './authorService';
import type { AuthorNotice, CategoryItem } from './types';

export default function AuthorPosts() {
  const [notices, setNotices] = useState<AuthorNotice[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Selected Notice Inspection
  const [selectedNotice, setSelectedNotice] = useState<AuthorNotice | null>(null);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [revealingPhone, setRevealingPhone] = useState(false);

  // Edit Modal State
  const [editingNotice, setEditingNotice] = useState<AuthorNotice | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; hard: boolean } | null>(null);
  const [mutating, setMutating] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await AuthorService.getNotices({
        search,
        category: categoryFilter,
        status: statusFilter,
        page,
        limit,
      });
      setNotices(res.notices);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to query notices');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, page]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  useEffect(() => {
    AuthorService.getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleOpenDetail = (notice: AuthorNotice) => {
    setSelectedNotice(notice);
    setRevealedPhone(null);
  };

  const handleDismissReports = async (noticeId: string) => {
    try {
      await AuthorService.dismissNoticeReports(noticeId);
      showToast('success', 'Reports dismissed successfully.');
      fetchNotices();
      if (selectedNotice && selectedNotice.id === noticeId) {
        setSelectedNotice({
          ...selectedNotice,
          reports_count: 0,
          reports: [],
        });
      }
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to dismiss reports');
    }
  };

  const handleRevealPhone = async () => {
    if (!selectedNotice) return;
    setRevealingPhone(true);
    try {
      const phone = await AuthorService.revealContact(selectedNotice.id);
      setRevealedPhone(phone || 'No phone registered');
      showToast('success', 'Resident phone unmasked and logged in audit trail.');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Reveal failed');
    } finally {
      setRevealingPhone(false);
    }
  };

  const handleToggleStatus = async (noticeId: string, currentStatus: string) => {
    setMutating(true);
    const newAction = currentStatus === 'published' ? 'unpublish' : 'publish';
    try {
      await AuthorService.mutateNotice(noticeId, newAction);
      showToast('success', `Notice status updated to ${newAction === 'publish' ? 'published' : 'draft'}.`);
      fetchNotices();
      if (selectedNotice?.id === noticeId) {
        setSelectedNotice({
          ...selectedNotice,
          status: newAction === 'publish' ? 'published' : 'draft',
        });
      }
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setMutating(false);
    }
  };

  const handleStartEdit = (notice: AuthorNotice) => {
    setEditingNotice(notice);
    setEditTitle(notice.title);
    setEditBody(notice.content);
    setEditCategory(notice.category);
  };

  const handleSaveEdit = async () => {
    if (!editingNotice) return;
    setMutating(true);
    try {
      await AuthorService.mutateNotice(editingNotice.id, 'edit', {
        title: editTitle.trim(),
        body: editBody.trim(),
        category: editCategory.trim(),
      });
      showToast('success', 'Notice updated and recorded in audit log.');
      setEditingNotice(null);
      fetchNotices();
      if (selectedNotice?.id === editingNotice.id) {
        setSelectedNotice({
          ...selectedNotice,
          title: editTitle.trim(),
          content: editBody.trim(),
          category: editCategory.trim(),
        });
      }
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setMutating(true);
    const action = deleteTarget.hard ? 'hard_delete' : 'soft_delete';
    try {
      await AuthorService.mutateNotice(deleteTarget.id, action);
      showToast(
        'success',
        deleteTarget.hard ? 'Notice row permanently purged.' : 'Notice soft-deleted (status: removed).'
      );
      setDeleteTarget(null);
      if (selectedNotice?.id === deleteTarget.id) {
        setSelectedNotice(null);
      }
      fetchNotices();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Deletion failed');
    } finally {
      setMutating(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium border flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Posts Moderation</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Full control to edit, delete, or moderate notices · {total} total listings
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by notice title..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="w-full md:w-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="reported">⚠️ Reported (With Issues)</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="removed">Removed (Soft-deleted)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setStatusFilter((prev) => (prev === 'reported' ? 'all' : 'reported'));
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
              statusFilter === 'reported'
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Reported Posts</span>
          </button>
        </div>
      </div>

      {/* Notices Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="text-xs text-gray-400">Loading notices...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-600 space-y-2">
            <p>{error}</p>
            <button
              type="button"
              onClick={fetchNotices}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium"
            >
              Retry
            </button>
          </div>
        ) : notices.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            {statusFilter === 'reported' ? '🎉 No reported posts found! All notices are in clean standing.' : 'No notices match the filter criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Notice Title</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-center">Views</th>
                  <th scope="col" className="px-4 py-3">Date (IST)</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {notices.map((notice) => (
                  <tr
                    key={notice.id}
                    className={
                      notice.reports_count && notice.reports_count > 0
                        ? 'bg-red-50/40 hover:bg-red-50/70 transition-colors'
                        : 'hover:bg-gray-50/80 transition-colors'
                    }
                  >
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-gray-900 truncate">{notice.title}</span>
                        {Boolean(notice.reports_count && notice.reports_count > 0) && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 shrink-0"
                            title={`${notice.reports_count} resident complaint(s)`}
                          >
                            <Flag className="w-2.5 h-2.5 fill-red-600 text-red-600" />
                            <span>{notice.reports_count} {notice.reports_count === 1 ? 'Report' : 'Reports'}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 block truncate">{notice.content}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="capitalize px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200">
                        {notice.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          notice.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : notice.status === 'removed'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {notice.status === 'published' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : notice.status === 'removed' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        <span className="capitalize">{notice.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center font-mono text-[11px] text-gray-700">
                      {notice.views_count ?? 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                      {new Date(notice.created_at).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(notice)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded transition-colors"
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(notice)}
                        className="p-1 text-gray-500 hover:text-blue-600 rounded transition-colors"
                        title="Edit Notice"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(notice.id, notice.status)}
                        disabled={mutating}
                        className="px-2 py-1 text-[11px] font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      >
                        {notice.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: notice.id, hard: false })}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title="Soft Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
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

      {/* Notice Inspection Drawer */}
      {selectedNotice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end"
        >
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col font-sans text-xs animate-in slide-in-from-right duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Notice Inspection</h3>
                <p className="text-[11px] text-gray-400 font-mono">ID: {selectedNotice.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <span className="text-gray-400 text-[11px] block">Title</span>
                <h4 className="text-base font-bold text-gray-900 mt-0.5">{selectedNotice.title}</h4>
              </div>

              <div>
                <span className="text-gray-400 text-[11px] block">Content / Description</span>
                <div className="mt-1 p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {selectedNotice.content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-[11px] block">Category</span>
                  <span className="font-semibold text-gray-800 capitalize">{selectedNotice.category}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Status</span>
                  <span className="font-semibold capitalize text-gray-800">{selectedNotice.status}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Area / District</span>
                  <span className="font-medium text-gray-700">{selectedNotice.area_label || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Price</span>
                  <span className="font-medium text-gray-700">
                    {selectedNotice.price ? `₹${selectedNotice.price}` : 'Free / Not listed'}
                  </span>
                </div>
              </div>

              {/* Reported Issues Section */}
              {selectedNotice.reports && selectedNotice.reports.length > 0 ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-900 flex items-center gap-1.5 text-xs">
                      <Flag className="w-4 h-4 text-red-600 fill-red-600" />
                      <span>Flagged Reports ({selectedNotice.reports.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDismissReports(selectedNotice.id)}
                      className="px-2.5 py-1 bg-white border border-red-300 hover:bg-red-100 text-red-800 text-[11px] font-semibold rounded shadow-xs transition-colors"
                    >
                      Dismiss Reports
                    </button>
                  </div>
                  <p className="text-[11px] text-red-700 leading-normal">
                    This post has received resident complaints. Inspect reasons and details below:
                  </p>
                  <div className="space-y-2">
                    {selectedNotice.reports.map((report) => (
                      <div key={report.id} className="p-3 bg-white border border-red-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 capitalize flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            {report.reason.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(report.created_at).toLocaleDateString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        {report.details && (
                          <p className="text-gray-600 text-[11px] bg-gray-50 p-2 rounded border border-gray-100 italic">
                            &ldquo;{report.details}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>No safety reports filed for this post (clean standing).</span>
                </div>
              )}

              {/* Masked Contact & Unmask Button */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-600" />
                    <span>Resident Contact Number</span>
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Masked for privacy. Clicking reveal unmasks the phone number and logs an audit trail.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-xs font-bold text-gray-900">
                    {revealedPhone ? revealedPhone : selectedNotice.author_phone_masked || '••••••••'}
                  </span>
                  {!revealedPhone && (
                    <button
                      type="button"
                      onClick={handleRevealPhone}
                      disabled={revealingPhone}
                      className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-medium rounded text-[11px] flex items-center gap-1 shadow-xs"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{revealingPhone ? 'Revealing...' : 'Reveal & Audit'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <a
                href={`/notice/${selectedNotice.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View on Public Noticeboard</span>
              </a>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEdit(selectedNotice)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-xs shadow-xs"
                >
                  Edit Notice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Notice Modal */}
      {editingNotice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-w-lg w-full p-6 text-xs text-gray-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Edit Notice</h3>
              <button
                type="button"
                onClick={() => setEditingNotice(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-500 capitalize"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Description / Content</label>
              <textarea
                rows={5}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingNotice(null)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={mutating}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-xs"
              >
                {mutating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-sm w-full p-5 text-xs text-gray-700 space-y-4">
            <div className="flex items-center gap-3 text-red-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Confirm {deleteTarget.hard ? 'Permanent Purge' : 'Soft Deletion'}</span>
            </div>
            <p className="leading-relaxed">
              {deleteTarget.hard
                ? 'Warning: Hard purge deletes this notice row permanently. This action is irreversible.'
                : 'This will set the notice status to "removed". The notice will disappear from public noticeboards but remains in the database audit log.'}
            </p>
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget({ ...deleteTarget, hard: !deleteTarget.hard })}
                className="text-xs text-blue-600 underline"
              >
                Switch to {deleteTarget.hard ? 'Soft Delete' : 'Permanent Purge'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={mutating}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-medium shadow-xs"
                >
                  {mutating ? 'Executing...' : 'Proceed'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
