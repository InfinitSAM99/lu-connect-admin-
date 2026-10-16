import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime, useRefetchOnReconnect, useRealtimeStatus } from '../lib/realtime';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const tooltipStyle = {
  background: '#0a0a0a',
  border: '1px solid #1f1f1f',
  borderRadius: 8,
  fontSize: 12,
  color: '#f2f3f5',
};

const CATEGORY_COLORS = {
  nudity: '#ec4899',
  hate: '#dc2626',
  harassment: '#f97316',
  spam: '#eab308',
  self_harm: '#8b5cf6',
  violence: '#b91c1c',
  other: '#6b7280',
  none: '#6b7280',
};

const STATUS_LABEL = {
  connected: { color: '#22c55e', label: 'Live' },
  reconnecting: { color: '#f59e0b', label: 'Reconnecting' },
  disconnected: { color: '#ef4444', label: 'Offline' },
  idle: { color: '#6d7382', label: 'Idle' },
};

export default function Dashboard() {
  const [onlineNow, setOnlineNow] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [signupsData, setSignupsData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [postsData, setPostsData] = useState([]);
  const [commentsData, setCommentsData] = useState([]);
  const [activeUsersData, setActiveUsersData] = useState([]);
  const [reportsData, setReportsData] = useState([]);
  const [flagsByCategory, setFlagsByCategory] = useState([]);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const inflightRef = useRef(false);
  const debounceRef = useRef(null);
  const status = useRealtimeStatus();

  // ---------------------------------------------------------------------
  // Data loader — one big parallel fetch. Runs on mount, on realtime
  // event (debounced), and on reconnect. NOT on a timer.
  // ---------------------------------------------------------------------
  const load = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;

    try {
      const now = new Date();
      const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Headline counts come from a SECURITY DEFINER RPC — avoids the
      // silent-zero bug with `count: 'exact', head: true` under RLS.
      // Chart buckets come from direct selects (they already worked).
      const [
        countsRes,
        allSignups, allActivity,
        allPosts, allComments, allReports, allFlags,
      ] = await Promise.all([
        supabase.rpc('admin_counts'),
        supabase.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo),
        supabase.from('profiles').select('last_seen').gte('last_seen', thirtyDaysAgo),
        supabase.from('posts').select('created_at').eq('is_deleted', false).gte('created_at', thirtyDaysAgo),
        supabase.from('comments').select('created_at').eq('is_deleted', false).gte('created_at', thirtyDaysAgo),
        supabase.from('reports').select('created_at').gte('created_at', thirtyDaysAgo),
        supabase.from('moderation_flags').select('ai_category').gte('created_at', thirtyDaysAgo),
      ]);

      if (!mountedRef.current) return;

      const counts = countsRes?.data || {};
      setOnlineNow(counts.online_now || 0);
      setTotalUsers(counts.users || 0);
      setTotalPosts(counts.posts || 0);
      setTotalReports(counts.reports || 0);
      setTotalComments(counts.comments || 0);
      setActiveToday(counts.active_today || 0);

      const buildDayBuckets = (sourceData, label = 'count') => {
        const days = [];
        const map = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().slice(0, 10);
          days.push({ date: key, label: `${d.getDate()}/${d.getMonth() + 1}`, [label]: 0 });
          map[key] = days[days.length - 1];
        }
        (sourceData || []).forEach((row) => {
          const key = row.created_at?.slice(0, 10);
          if (key && map[key]) map[key][label] += 1;
        });
        return days;
      };

      setSignupsData(buildDayBuckets(allSignups.data, 'count'));
      setPostsData(buildDayBuckets(allPosts.data, 'count'));
      setCommentsData(buildDayBuckets(allComments.data, 'count'));
      setReportsData(buildDayBuckets(allReports.data, 'count'));

      const activeDays = [];
      const activeMap = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        activeDays.push({ date: key, label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 });
        activeMap[key] = activeDays[activeDays.length - 1];
      }
      (allActivity.data || []).forEach((row) => {
        if (!row.last_seen) return;
        const key = row.last_seen.slice(0, 10);
        if (activeMap[key]) activeMap[key].count += 1;
      });
      setActiveUsersData(activeDays);

      const hourBuckets = [];
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const label = `${d.getHours().toString().padStart(2, '0')}:00`;
        hourBuckets.push({ hour: d.getHours(), label, count: 0 });
      }
      (allActivity.data || []).forEach((row) => {
        if (!row.last_seen) return;
        const seen = new Date(row.last_seen);
        if (seen.getTime() < now.getTime() - 24 * 60 * 60 * 1000) return;
        const h = seen.getHours();
        const bucket = hourBuckets.find((b) => b.hour === h);
        if (bucket) bucket.count += 1;
      });
      setHourlyData(hourBuckets);

      const catMap = {};
      (allFlags.data || []).forEach((f) => {
        const cat = f.ai_category || 'other';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      const catList = Object.entries(catMap)
        .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || '#6b7280' }))
        .filter((c) => c.value > 0);
      setFlagsByCategory(catList);
    } catch (e) {
      console.warn('[dashboard] load failed:', e?.message);
    } finally {
      inflightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Debounced trigger — realtime events call this, we collapse bursts.
  const scheduleReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load();
    }, 2000);
  }, [load]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  // Refetch when realtime manager reconnects after background/network flap
  useRefetchOnReconnect(() => {
    load();
  });

  // ---------------------------------------------------------------------
  // Realtime subscriptions
  // ---------------------------------------------------------------------
  // - profiles UPDATE: catches last_seen heartbeats → online-now count
  //   (heaviest event source — 2s debounce absorbs the storm)
  // - posts INSERT / comments INSERT / reports INSERT: headline counts + charts
  // - moderation_flags INSERT: flags pie
  // ---------------------------------------------------------------------
  useRealtime('dash:profiles-upd', {
    event: 'UPDATE', schema: 'public', table: 'profiles',
  }, scheduleReload);

  useRealtime('dash:posts-ins', {
    event: 'INSERT', schema: 'public', table: 'posts',
  }, scheduleReload);

  useRealtime('dash:comments-ins', {
    event: 'INSERT', schema: 'public', table: 'comments',
  }, scheduleReload);

  useRealtime('dash:reports-ins', {
    event: 'INSERT', schema: 'public', table: 'reports',
  }, scheduleReload);

  useRealtime('dash:flags-ins', {
    event: 'INSERT', schema: 'public', table: 'moderation_flags',
  }, scheduleReload);

  if (loading) return <div className="state">Loading dashboard…</div>;

  const hasFlags = flagsByCategory.length > 0;
  const statusMeta = STATUS_LABEL[status] || STATUS_LABEL.idle;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="page-title">Dashboard</h1>
          <span
            title={`Realtime: ${statusMeta.label}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusMeta.color,
                boxShadow: `0 0 8px ${statusMeta.color}`,
              }}
            />
            {statusMeta.label}
          </span>
        </div>
        <p className="page-subtitle">Live platform statistics</p>
      </div>

      {/* Big unboxed totals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 24,
          marginBottom: 28,
          padding: '8px 4px',
        }}
      >
        <div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text)', lineHeight: 1, letterSpacing: -1 }}>
            {totalUsers}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Total Users
          </div>
        </div>
        <div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text)', lineHeight: 1, letterSpacing: -1 }}>
            {totalPosts}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Total Posts
          </div>
        </div>
        <div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text)', lineHeight: 1, letterSpacing: -1 }}>
            {totalReports}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Reports
          </div>
        </div>
        <div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text)', lineHeight: 1, letterSpacing: -1 }}>
            {totalComments}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Comments
          </div>
        </div>
      </div>

      {/* Live row */}
      <div className="card live-card">
        <div className="live-row">
          <span className="live-dot" />
          <span className="live-count">{onlineNow}</span>
          <span className="live-label">online now</span>
        </div>
        <div className="live-divider" />
        <div className="live-row">
          <span className="live-count">{activeToday}</span>
          <span className="live-label">active today</span>
        </div>
      </div>

      {/* Chart 1 — Signups */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">New Signups · Last 30 Days</div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={signupsData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }}
                interval={Math.max(0, Math.floor(signupsData.length / 5) - 1)}
                axisLine={{ stroke: '#1f1f1f' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false}
                axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#ef4444"
                strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#ef4444' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2 — Activity 24h */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">Activity · Last 24 Hours</div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hourlyData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }}
                interval={3} axisLine={{ stroke: '#1f1f1f' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false}
                axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3 — Posts */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">Posts · Last 30 Days</div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={postsData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }}
                interval={Math.max(0, Math.floor(postsData.length / 5) - 1)}
                axisLine={{ stroke: '#1f1f1f' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false}
                axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 4 — Comments */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">Comments · Last 30 Days</div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={commentsData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }}
                interval={Math.max(0, Math.floor(commentsData.length / 5) - 1)}
                axisLine={{ stroke: '#1f1f1f' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false}
                axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 5 — Active users/day */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">Active Users · Last 30 Days</div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={activeUsersData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }}
                interval={Math.max(0, Math.floor(activeUsersData.length / 5) - 1)}
                axisLine={{ stroke: '#1f1f1f' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false}
                axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#a855f7"
                strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#a855f7' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 6 — Reports */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">Reports · Last 30 Days</div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={reportsData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }}
                interval={Math.max(0, Math.floor(reportsData.length / 5) - 1)}
                axisLine={{ stroke: '#1f1f1f' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false}
                axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#f59e0b"
                strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#f59e0b' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 7 — Flags by category (pie) */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">Flags by Category · Last 30 Days</div>
        </div>
        <div className="chart-body">
          {!hasFlags && (
            <div style={{ padding: 24, textAlign: 'center', color: '#6d7382', fontSize: 13 }}>
              No flags in the last 30 days.
            </div>
          )}
          {hasFlags && (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={flagsByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  labelLine={false}
                >
                  {flagsByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
