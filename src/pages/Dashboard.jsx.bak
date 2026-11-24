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
  borderRadius: 12,
  fontSize: 12,
  color: '#fff',
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
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
  connected: { color: '#22c55e', label: 'LIVE' },
  reconnecting: { color: '#f59e0b', label: 'RECONNECTING' },
  disconnected: { color: '#ef4444', label: 'OFFLINE' },
  idle: { color: '#6d7382', label: 'IDLE' },
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

  // NEW: Time Range Filter
  const [timeRange, setTimeRange] = useState(30); 

  const mountedRef = useRef(true);
  const inflightRef = useRef(false);
  const debounceRef = useRef(null);
  const status = useRealtimeStatus();

  const load = useCallback(async (range) => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLoading(true);

    try {
      const now = new Date();
      const daysAgo = new Date(now.getTime() - range * 24 * 60 * 60 * 1000).toISOString();
      const hoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); 

      const [
        countsRes,
        allSignups, allActivity,
        allPosts, allComments, allReports, allFlags,
      ] = await Promise.all([
        supabase.rpc('admin_counts'),
        supabase.from('profiles').select('created_at').gte('created_at', daysAgo),
        supabase.from('profiles').select('last_seen').gte('last_seen', daysAgo),
        supabase.from('posts').select('created_at').eq('is_deleted', false).gte('created_at', daysAgo),
        supabase.from('comments').select('created_at').eq('is_deleted', false).gte('created_at', daysAgo),
        supabase.from('reports').select('created_at').gte('created_at', daysAgo),
        supabase.from('moderation_flags').select('ai_category').gte('created_at', daysAgo),
      ]);

      if (!mountedRef.current) return;

      const counts = countsRes?.data || {};
      setOnlineNow(counts.online_now || 0);
      setTotalUsers(counts.users || 0);
      setTotalPosts(counts.posts || 0);
      setTotalReports(counts.reports || 0);
      setTotalComments(counts.comments || 0);
      setActiveToday(counts.active_today || 0);

      // Dynamically build day buckets based on selected range
      const buildDayBuckets = (sourceData) => {
        const days = [];
        const map = {};
        for (let i = range - 1; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().slice(0, 10);
          days.push({ date: key, label: range > 14 ? `${d.getDate()}/${d.getMonth() + 1}` : `${d.getDate()}/${d.getMonth() + 1}`, count: 0 });
          map[key] = days[days.length - 1];
        }
        (sourceData || []).forEach((row) => {
          const key = row.created_at?.slice(0, 10);
          if (key && map[key]) map[key].count += 1;
        });
        return days;
      };

      setSignupsData(buildDayBuckets(allSignups.data));
      setPostsData(buildDayBuckets(allPosts.data));
      setCommentsData(buildDayBuckets(allComments.data));
      setReportsData(buildDayBuckets(allReports.data));

      const activeDays = [];
      const activeMap = {};
      for (let i = range - 1; i >= 0; i--) {
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

      // 24h is always 24 hours
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
  }, []); // <-- Removed range from deps, we pass it manually

  // Trigger load when timeRange changes
  useEffect(() => {
    mountedRef.current = true;
    load(timeRange);
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load, timeRange]);

  const scheduleReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(timeRange), 2000);
  }, [load, timeRange]);

  useRefetchOnReconnect(() => load(timeRange));

  useRealtime('dash:profiles-upd', { event: 'UPDATE', schema: 'public', table: 'profiles' }, scheduleReload);
  useRealtime('dash:posts-ins', { event: 'INSERT', schema: 'public', table: 'posts' }, scheduleReload);
  useRealtime('dash:comments-ins', { event: 'INSERT', schema: 'public', table: 'comments' }, scheduleReload);
  useRealtime('dash:reports-ins', { event: 'INSERT', schema: 'public', table: 'reports' }, scheduleReload);
  useRealtime('dash:flags-ins', { event: 'INSERT', schema: 'public', table: 'moderation_flags' }, scheduleReload);

  if (loading && signupsData.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #1f1f1f', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const statusMeta = STATUS_LABEL[status] || STATUS_LABEL.idle;

  const ChartTitle = ({ children, subtitle }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
      <div style={{ color: '#6d7382', fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
        {children}
      </div>
      {subtitle && <div style={{ color: '#1f1f1f', fontSize: 10, fontWeight: 600 }}>{subtitle}</div>}
    </div>
  );

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100%', maxWidth: 800, margin: '0 auto', padding: '0 16px', paddingBottom: 100 }}>
      
      {/* HEADER */}
      <div style={{ paddingTop: 24, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: 0 }}>Dashboard</h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: statusMeta.color, letterSpacing: 1.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusMeta.color, boxShadow: `0 0 8px ${statusMeta.color}` }} />
            {statusMeta.label}
          </span>
        </div>
        <p style={{ color: '#6d7382', fontSize: 13, marginTop: 6, margin: 0 }}>Live platform statistics</p>
      </div>

      {/* BIG TOTALS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Users', value: totalUsers },
          { label: 'Total Posts', value: totalPosts },
          { label: 'Reports', value: totalReports },
          { label: 'Comments', value: totalComments },
        ].map(s => (
          <div key={s.label}>
            <div style={{ color: '#fff', fontSize: 38, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5 }}>{s.value}</div>
            <div style={{ color: '#6d7382', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 1, backgroundColor: '#1f1f1f', marginBottom: 24 }} />

      {/* LIVE ROW */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontSize: 32, fontWeight: 900 }}>{onlineNow}</div>
          <div style={{ color: '#6d7382', fontSize: 12, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>online now</div>
        </div>
        <div style={{ width: 1, height: 48, backgroundColor: '#1f1f1f' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontSize: 32, fontWeight: 900 }}>{activeToday}</div>
          <div style={{ color: '#6d7382', fontSize: 12, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>active today</div>
        </div>
      </div>

      <div style={{ height: 1, backgroundColor: '#1f1f1f', marginBottom: 24 }} />

      {/* TIME FILTER TABS */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 32, borderBottom: '1px solid #1f1f1f', paddingBottom: 12 }}>
        {[
          { label: 'Last 7 Days', value: 7 },
          { label: 'Last 30 Days', value: 30 },
          { label: 'Last 90 Days', value: 90 },
        ].map(opt => {
          const active = timeRange === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTimeRange(opt.value)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid #FFD700' : '2px solid transparent',
                color: active ? '#FFD700' : '#6d7382',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 1.5,
                padding: '8px 0',
                cursor: 'pointer',
                textTransform: 'uppercase',
                marginBottom: -13, // Pulls the active underline down to sit on the border
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* CHARTS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        
        {/* Signups */}
        <div>
          <ChartTitle subtitle={`${timeRange} days`}>New Signups</ChartTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={signupsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }} interval={Math.max(0, Math.floor(signupsData.length / 5) - 1)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#333' }} />
              <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#ef4444', stroke: '#000', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Activity 24h - Fixed to 24h despite filter */}
        <div>
          <ChartTitle subtitle="24 hours">Activity</ChartTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hourlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }} interval={3} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Posts */}
        <div>
          <ChartTitle subtitle={`${timeRange} days`}>Posts</ChartTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={postsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }} interval={Math.max(0, Math.floor(postsData.length / 5) - 1)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Comments */}
        <div>
          <ChartTitle subtitle={`${timeRange} days`}>Comments</ChartTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={commentsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }} interval={Math.max(0, Math.floor(commentsData.length / 5) - 1)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Active Users */}
        <div>
          <ChartTitle subtitle={`${timeRange} days`}>Active Users</ChartTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={activeUsersData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }} interval={Math.max(0, Math.floor(activeUsersData.length / 5) - 1)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#333' }} />
              <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#a855f7', stroke: '#000', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Reports */}
        <div>
          <ChartTitle subtitle={`${timeRange} days`}>Reports</ChartTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={reportsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6d7382' }} interval={Math.max(0, Math.floor(reportsData.length / 5) - 1)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6d7382' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#333' }} />
              <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f59e0b', stroke: '#000', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Flags by Category */}
        <div>
          <ChartTitle subtitle={`${timeRange} days`}>Flags by Category</ChartTitle>
          {flagsByCategory.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#6d7382', fontSize: 13 }}>
              No flags in the last {timeRange} days.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={flagsByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={5}
                  stroke="none"
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
