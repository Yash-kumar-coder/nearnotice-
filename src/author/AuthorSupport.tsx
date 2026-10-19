import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  Flag,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  ExternalLink,
  ChevronRight,
  User,
  Mail,
  Phone,
  Calendar,
  X,
  ShieldAlert,
  Send,
  Eye,
} from 'lucide-react';
import { SupportService, SupportTicket, SupportTicketStatus, SupportTicketType } from '../services/supportService';

export default function AuthorSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected ticket for inspection modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SupportService.fetchAdminTickets();
      setTickets(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleOpenDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.admin_notes || '');
  };

  const handleUpdateStatus = async (newStatus: SupportTicketStatus) => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      await SupportService.updateTicketStatus(selectedTicket.id, newStatus, adminNotes);
      showToast('success', `Ticket marked as ${newStatus}`);
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus, admin_notes: adminNotes } : null));
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus, admin_notes: adminNotes } : t))
      );
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await SupportService.deleteTicket(id);
      showToast('success', 'Ticket deleted');
      if (selectedTicket?.id === id) {
        setSelectedTicket(null);
      }
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.name?.toLowerCase().includes(q);
        const matchEmail = t.email?.toLowerCase().includes(q);
        const matchPhone = t.phone?.toLowerCase().includes(q);
        const matchSubject = t.subject?.toLowerCase().includes(q);
        const matchMsg = t.message?.toLowerCase().includes(q);
        const matchTarget = t.target_id?.toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchSubject || matchMsg || matchTarget;
      }
      return true;
    });
  }, [tickets, typeFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter((t) => t.status === 'pending').length;
    const reports = tickets.filter((t) => t.type === 'report_notice' || t.type === 'report_user').length;
    const resolved = tickets.filter((t) => t.status === 'resolved').length;
    return { total, pending, reports, resolved };
  }, [tickets]);

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
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Support Inquiries & Abuse Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage contact form inquiries, safety violations, and notice/user reports submitted by neighbors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchTickets}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Submissions</span>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Pending Action</span>
          <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Abuse Reports</span>
          <div className="text-2xl font-bold text-rose-700">{stats.reports}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Resolved</span>
          <div className="text-2xl font-bold text-emerald-700">{stats.resolved}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, subject, or message..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 font-medium outline-none focus:border-blue-600"
          >
            <option value="all">All Types</option>
            <option value="contact_support">Contact Support Form</option>
            <option value="report_notice">Notice Reports</option>
            <option value="report_user">User Reports</option>
            <option value="safety_inquiry">Safety Inquiries</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 font-medium outline-none focus:border-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Tickets List / Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading submissions...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No support inquiries or reports found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Type</th>
                  <th scope="col" className="px-4 py-3">Subject / Issue</th>
                  <th scope="col" className="px-4 py-3">Submitted By</th>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3 text-center">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTickets.map((ticket) => {
                  const isReport = ticket.type === 'report_notice' || ticket.type === 'report_user';
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            isReport
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : ticket.type === 'contact_support'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {isReport ? <Flag size={10} /> : <MessageSquare size={10} />}
                          <span>{ticket.type.replace('_', ' ')}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3 max-w-xs truncate">
                        <div className="font-semibold text-gray-900 truncate">
                          {ticket.subject || ticket.reason || 'Support Request'}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate mt-0.5">
                          {ticket.message}
                        </div>
                        {ticket.target_id && (
                          <div className="text-[10px] text-rose-600 font-mono mt-0.5 truncate">
                            Target: {ticket.target_id}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {ticket.name || 'Anonymous Neighbor'}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {ticket.email || ticket.phone || 'No contact provided'}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-[11px]">
                        {new Date(ticket.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            ticket.status === 'resolved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : ticket.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : ticket.status === 'dismissed'
                              ? 'bg-gray-100 text-gray-600 border-gray-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {ticket.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(ticket)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Delete ticket"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail / Inspection Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  {selectedTicket.type.replace('_', ' ')}
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  {selectedTicket.subject || selectedTicket.reason || 'Support Request'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Reporter Information */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Contact & Reporter Info
              </span>
              <div className="flex items-center gap-2 text-gray-800">
                <User size={13} className="text-gray-400" />
                <span className="font-semibold">{selectedTicket.name || 'Anonymous Neighbor'}</span>
              </div>
              {selectedTicket.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={13} className="text-gray-400" />
                  <a href={`mailto:${selectedTicket.email}`} className="text-blue-600 hover:underline">
                    {selectedTicket.email}
                  </a>
                </div>
              )}
              {selectedTicket.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={13} className="text-gray-400" />
                  <a href={`tel:${selectedTicket.phone}`} className="text-blue-600 hover:underline">
                    {selectedTicket.phone}
                  </a>
                </div>
              )}
              {selectedTicket.target_id && (
                <div className="flex items-center gap-2 text-rose-700 font-mono pt-1">
                  <Flag size={13} className="text-rose-600" />
                  <span>Reported Target: {selectedTicket.target_id}</span>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Full Message / Details
              </span>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                {selectedTicket.message}
              </div>
            </div>

            {/* Admin Notes */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Admin Notes / Action Taken
              </label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes about this issue..."
                className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-600"
              />
            </div>

            {/* Status Change Buttons */}
            <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('resolved')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Mark Resolved
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('in_progress')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  In Progress
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('dismissed')}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                >
                  Dismiss
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteTicket(selectedTicket.id)}
                className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                title="Delete ticket"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
