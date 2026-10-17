import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  FileText,
  CheckCircle2,
  AlertOctagon,
  Eye,
  Activity,
  RefreshCw,
  Tags,
  TrendingUp,
} from 'lucide-react';
import { AuthorService } from './authorService';
import type { AuthorOverviewMetrics } from './types';

export default function AuthorOverview() {
  const [metrics, setMetrics] = useState<AuthorOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthorService.getOverview();
      setMetrics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve overview signals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="space-y-6">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Operations Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Realtime database telemetry computed via Supabase PostgreSQL · Timezone: Asia/Kolkata (IST)
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchMetrics}
            className="px-2.5 py-1 bg-red-100 hover:bg-red-200 rounded font-medium text-xs text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Visitors */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Today&apos;s Visitors</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <div className="h-7 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <span className="text-2xl font-bold text-gray-900 tracking-tight">
                {metrics?.today_visitors?.toLocaleString('en-IN') ?? 0}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
            <Eye className="w-3 h-3 text-gray-400" />
            <span>{metrics?.today_views ?? 0} pageviews today</span>
          </p>
        </div>

        {/* Total Users */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Total Community Users</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <div className="h-7 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <span className="text-2xl font-bold text-gray-900 tracking-tight">
                {metrics?.total_users?.toLocaleString('en-IN') ?? 0}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">
            +{metrics?.new_users_30d ?? 0} in past 30 days
          </p>
        </div>

        {/* Published Notices */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Published Notices</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <div className="h-7 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <span className="text-2xl font-bold text-emerald-700 tracking-tight">
                {metrics?.published_notices?.toLocaleString('en-IN') ?? 0}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Of {metrics?.total_notices ?? 0} total created
          </p>
        </div>

        {/* Active Categories */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Active Categories</span>
            <Tags className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <div className="h-7 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <span className="text-2xl font-bold text-purple-700 tracking-tight">
                {metrics?.total_categories?.toLocaleString('en-IN') ?? 0}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Dynamic database categories
          </p>
        </div>
      </div>

      {/* Main Grid: Category Distribution & 30-Day Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-900">Notices by Category</h2>
            <a href="/author/categories" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              Manage Categories →
            </a>
          </div>
          <p className="text-xs text-gray-500 mb-4">Calculated dynamically via SQL aggregations</p>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-7 bg-gray-100 animate-pulse rounded"></div>
              ))}
            </div>
          ) : !metrics?.category_distribution || Object.keys(metrics.category_distribution).length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">No categories recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(metrics.category_distribution).map(([cat, count]) => {
                const total = metrics.total_notices || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="capitalize text-gray-700">{cat}</span>
                      <span className="text-gray-900">
                        {count} <span className="text-gray-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 30-Day Growth */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-gray-900">30-Day Submissions</h2>
              <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Live Feed Velocity</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Daily notices posted over the last 30 days (IST)
            </p>

            {loading ? (
              <div className="h-44 bg-gray-100 animate-pulse rounded-lg"></div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-gray-500 text-[11px]">New Residents (30d)</p>
                    <p className="text-base font-semibold text-gray-900 mt-0.5">{metrics?.new_users_30d ?? 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-[11px]">Notice Submissions (30d)</p>
                    <p className="text-base font-semibold text-indigo-600 mt-0.5">
                      {metrics?.daily_notices_30d?.reduce((acc, curr) => acc + curr.count, 0) ?? 0}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  <p className="font-medium text-gray-700 mb-2">Recent Daily Submissions (Last 5 Days):</p>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {(metrics?.daily_notices_30d || []).slice(-5).map((d) => (
                      <div key={d.date} className="p-2 bg-gray-50 rounded border border-gray-200/60">
                        <p className="text-[10px] text-gray-400 font-mono">{d.date.slice(5)}</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{d.count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Source: Supabase RPC get_author_overview_metrics</span>
            <a href="/author/analytics" className="text-blue-600 hover:text-blue-800 font-medium">
              View Detailed Traffic Analytics →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
