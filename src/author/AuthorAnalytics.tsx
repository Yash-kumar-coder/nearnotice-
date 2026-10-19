import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Users,
  Eye,
  RefreshCw,
  Loader2,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { AuthorService } from './authorService';
import type { TrafficAnalytics } from './types';

type PresetRange = 'today' | 'yesterday' | '7days' | '30days' | 'custom';

export default function AuthorAnalytics() {
  const [preset, setPreset] = useState<PresetRange>('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [analytics, setAnalytics] = useState<TrafficAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to format Date to YYYY-MM-DD in local/IST
  const formatDate = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  const applyPreset = useCallback((p: PresetRange) => {
    setPreset(p);
    const now = new Date();
    if (p === 'today') {
      const todayStr = formatDate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (p === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDate(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (p === '7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setStartDate(formatDate(past));
      setEndDate(formatDate(now));
    } else if (p === '30days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      setStartDate(formatDate(past));
      setEndDate(formatDate(now));
    }
  }, []);

  useEffect(() => {
    applyPreset('7days');
  }, [applyPreset]);

  const fetchTraffic = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await AuthorService.getTrafficAnalytics(startDate, endDate);
      setAnalytics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve traffic analytics');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchTraffic();
    }
  }, [startDate, endDate, fetchTraffic]);

  const maxViews = Math.max(...(analytics?.daily_trend?.map((d) => d.views) || [1]), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Site Traffic & Visitor Analytics</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Native Supabase visitor tracking · Timezone: Asia/Kolkata (IST)
          </p>
        </div>

        {/* Date Filter Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                preset === 'today' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset('yesterday')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                preset === 'yesterday' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => applyPreset('7days')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                preset === '7days' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset('30days')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                preset === '30days' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setPreset('custom')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                preset === 'custom' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Custom
            </button>
          </div>

          <button
            type="button"
            onClick={fetchTraffic}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Custom Date Pickers when preset is 'custom' */}
      {preset === 'custom' && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center gap-3 text-xs">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-gray-700">Custom Date Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1 text-xs"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1 text-xs"
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchTraffic}
            className="px-2.5 py-1 bg-red-100 hover:bg-red-200 rounded font-medium text-xs text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Unique Visitors</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <div className="h-7 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <span className="text-2xl font-bold text-gray-900 tracking-tight">
                {analytics?.total_visitors?.toLocaleString('en-IN') ?? 0}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            For selected period ({startDate} to {endDate})
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Total Pageviews</span>
            <Eye className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <div className="h-7 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <span className="text-2xl font-bold text-blue-700 tracking-tight">
                {analytics?.total_views?.toLocaleString('en-IN') ?? 0}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Screen and notice views
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Pages / Visitor Ratio</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <div className="h-7 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <span className="text-2xl font-bold text-purple-700 tracking-tight">
                {analytics?.total_visitors
                  ? (analytics.total_views / analytics.total_visitors).toFixed(1)
                  : '1.0'}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Engagement depth per session
          </p>
        </div>
      </div>

      {/* Main Breakdown: Daily Trend & Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Velocity Table & Bars */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Daily Traffic Velocity</h2>
          <p className="text-xs text-gray-500 mb-4">Daily breakdown of unique visitors and pageviews</p>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-gray-100 animate-pulse rounded"></div>
              ))}
            </div>
          ) : !analytics?.daily_trend || analytics.daily_trend.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">No traffic recorded for this period.</div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {analytics.daily_trend.map((day) => {
                const barWidth = Math.max(Math.round((day.views / maxViews) * 100), 4);
                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-gray-800">{day.date}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-700 font-bold">{day.visitors} visitors</span>
                        <span className="text-gray-500">{day.views} views</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Visited Public Pages */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Top Visited Pages</h2>
          <p className="text-xs text-gray-500 mb-4">Ranked by total page views (excluding /author console)</p>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-gray-100 animate-pulse rounded"></div>
              ))}
            </div>
          ) : !analytics?.top_pages || analytics.top_pages.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">No page view data recorded yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {analytics.top_pages.map((p, idx) => (
                <div key={p.path} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 max-w-xs truncate">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-mono text-[10px] shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-mono text-gray-800 truncate">{p.path}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-gray-900">{p.views.toLocaleString('en-IN')} views</span>
                    <span className="text-[11px] text-gray-400 block font-mono">({p.visitors} visitors)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
