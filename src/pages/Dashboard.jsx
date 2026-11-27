import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRealtime, useRefetchOnReconnect, useRealtimeStatus } from '../lib/realtime';
import { useAuth } from '../context/AuthContext.jsx';
import {
  StatCard, AreaChartCard, BarChartCard,
  DonutChartCard, HeatmapCard, LeaderboardCard,
} from '../components/Charts';
import {
  UsersIcon, FileTextIcon, AlertTriangleIcon, MessageIcon,
  ClockIcon,
} from '../components/Icons.jsx';

const CATEGORY_COLORS = {
  nudity: '#ec4899', hate: '#dc2626', harassment: '#f97316',
  spam: '#eab308', self_harm: '#8b5cf6', violence: '#b91c1c',
  other: '#6b7280', none: '#6b7280',
};

const STATUS_LABEL = {
  connected: { color: '#22c55e', label: 'LIVE' },
  reconnecting: { color: '#f59e0b', label: 'RECONNECTING' },
  disconnected: { color: '#ef4444', label: 'OFFLINE' },
  idle: { color: '#6d7382', label: 'IDLE' },
};

function formatTimeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();

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
  const [reportsData, setReportsData] = useState([]);
  const [flagsByCategory, setFlagsByCategory] = useState([]);
  const [heatmapMatrix, setHeatmapMatrix] = useState({});
  const [topCreators, setTopCreators] = useState([]);

  const [userTrend, setUserTrend] = useState(0);
  const [postTrend, setPostTrend] = useState(0);
  const [reportTrend, setReportTrend] = useState(0);
  const [commentTrend, setCommentTrend] = useState(0);

  const [pendingReports, setPendingReports] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [activityFeed, setActivityFeed] = useState([]);

  const [loading, setLoading] = useState(true);
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
      const prevDaysAgo = new Date(now.getTime() - 2 * range * 24 * 60 * 60 * 1000).toISOString();

      const [
        countsRes, allSignups, allActivity,
        allPosts, allComments, allReports, allFlags,
        prevSignups, prevPosts, prevComments, prevReports,
        pendingRepsRes, pendingApprRes,
        recentActivity, recentSignups,
        topCreatorsRes,
      ] = await Promise.all([
        supabase.rpc('admin_counts'),
        supabase.from('profiles').select('created_at').gte('created_at', daysAgo),
        supabase.from('profiles').select('last_seen').gte('last_seen', daysAgo),
        supabase.from('posts').select('created_at').eq('is_deleted', false).gte('created_at', daysAgo),
        supabase.from('comments').select('created_at').eq('is_deleted', false).gte('created_at', daysAgo),
        supabase.from('reports').select('created_at').gte('created_at', daysAgo),
        supabase.from('moderation_flags').select('ai_category').gte('created_at', daysAgo),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', prevDaysAgo).lt('created_at', daysAgo),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_deleted', false).gte('created_at', prevDaysAgo).lt('created_at', daysAgo),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('is_deleted', false).gte('created_at', prevDaysAgo).lt('created_at', daysAgo),
        supabase.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', prevDaysAgo).lt('created_at', daysAgo),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('admin_audit_logs').select('id, admin_id, action, created_at').order('created_at', { ascending: false }).limit(8),
        supabase.from('profiles').select('id, full_name, avatar_url, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('posts').select('author_id').eq('is_deleted', false).gte('created_at', daysAgo).limit(500),
      ]);

      if (!mountedRef.current) return;

      const counts = countsRes?.data || {};
      setOnlineNow(counts.online_now || 0);
      setTotalUsers(counts.users || 0);
      setTotalPosts(counts.posts || 0);
      setTotalReports(counts.reports || 0);
      setTotalComments(counts.comments || 0);
      setActiveToday(counts.active_today || 0);

      const calcTrend = (current, prev) => {
        if (!prev || prev === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - prev) / prev) * 100);
      };
      setUserTrend(calcTrend(allSignups.data?.length || 0, prevSignups.count || 0));
      setPostTrend(calcTrend(allPosts.data?.length || 0, prevPosts.count || 0));
      setCommentTrend(calcTrend(allComments.data?.length || 0, prevComments.count || 0));
      setReportTrend(calcTrend(allReports.data?.length || 0, prevReports.count || 0));

      setPendingReports(pendingRepsRes.count || 0);
      setPendingApprovals(pendingApprRes.count || 0);

      // Activity feed
      const feed = [];
      (recentActivity.data || []).forEach(a => {
        feed.push({ id: `log-${a.id}`, type: 'log', action: a.action, created_at: a.created_at });
      });
      (recentSignups.data || []).forEach(u => {
        feed.push({ id: `signup-${u.id}`, type: 'signup', user: u.full_name || 'A user', avatar_url: u.avatar_url, created_at: u.created_at });
      });
      feed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setActivityFeed(feed.slice(0, 6));

      // Top creators
      const authorCounts = {};
      (topCreatorsRes.data || []).forEach(p => {
        if (p.author_id) authorCounts[p.author_id] = (authorCounts[p.author_id] || 0) + 1;
      });
      const topAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (topAuthors.length > 0) {
        const ids = topAuthors.map(a => a[0]);
        const { data: authors } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids);
        const authorMap = {};
        (authors || []).forEach(a => authorMap[a.id] = a);
        setTopCreators(topAuthors.map(([id, count]) => ({
          id, name: authorMap[id]?.full_name || 'Unknown', image: authorMap[id]?.avatar_url,
          meta: 'posts', value: `${count}`,
        })));
      }

      // Day buckets
      const buildDayBuckets = (sourceData) => {
        const days = [];
        const map = {};
        for (let i = range - 1; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().slice(0, 10);
          days.push({ date: key, label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 });
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

      // Hourly
      const hourBuckets = [];
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        hourBuckets.push({ hour: d.getHours(), label: `${d.getHours().toString().padStart(2, '0')}:00`, count: 0 });
      }
      (allActivity.data || []).forEach((row) => {
        if (!row.last_seen) return;
        const seen = new Date(row.last_seen);
        if (seen.getTime() < now.getTime() - 24 * 60 * 60 * 1000) return;
        const bucket = hourBuckets.find((b) => b.hour === seen.getHours());
        if (bucket) bucket.count += 1;
      });
      setHourlyData(hourBuckets);

      // Heatmap
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const heat = { Mon: Array(24).fill(0), Tue: Array(24).fill(0), Wed: Array(24).fill(0), Thu: Array(24).fill(0), Fri: Array(24).fill(0), Sat: Array(24).fill(0), Sun: Array(24).fill(0) };
      (allActivity.data || []).forEach(row => {
        if (!row.last_seen) return;
        const d = new Date(row.last_seen);
        heat[dayNames[d.getDay()]][d.getHours()] += 1;
      });
      setHeatmapMatrix(heat);

      // Flags by category
      const catMap = {};
      (allFlags.data || []).forEach((f) => {
        const cat = f.ai_category || 'other';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      setFlagsByCategory(
        Object.entries(catMap)
          .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || '#6b7280' }))
          .filter((c) => c.value > 0)
      );
    } catch (e) {
      console.warn('[dashboard] load failed:', e?.message);
    } finally {
      inflightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, []);

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
  useRealtime('dash:audit-ins', { event: 'INSERT', schema: 'public', table: 'admin_audit_logs' }, scheduleReload);

  if (loading && signupsData.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #1f1f1f', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const statusMeta = STATUS_LABEL[status] || STATUS_LABEL.idle;

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100%', maxWidth: 800, margin: '0 auto', padding: '0 16px', paddingBottom: 100 }}>

      {/* HEADER */}
      <div style={{ paddingTop: 24, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 900, margin: 0, letterSpacing: -1 }}>Dashboard</h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: statusMeta.color, letterSpacing: 1.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusMeta.color, boxShadow: `0 0 8px ${statusMeta.color}` }} />
            {statusMeta.label}
          </span>
        </div>
        <p style={{ color: '#6d7382', fontSize: 13, marginTop: 6, margin: 0 }}>Live platform statistics</p>
      </div>

      {/* TIME PILLS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[{ label: '7D', value: 7 }, { label: '30D', value: 30 }, { label: '90D', value: 90 }].map(opt => {
          const active = timeRange === opt.value;
          return (
            <button key={opt.value} onClick={() => setTimeRange(opt.value)} style={{
              background: active ? '#ef4444' : '#0f0f0f',
              border: active ? '1px solid #ef4444' : '1px solid #1f1f1f',
              color: '#fff', fontSize: 13, fontWeight: 800, padding: '10px 20px',
              borderRadius: 24, cursor: 'pointer', letterSpacing: 1,
            }}>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard icon={UsersIcon} label="Users" value={totalUsers} trend={userTrend} color="#3b82f6" />
        <StatCard icon={FileTextIcon} label="Posts" value={totalPosts} trend={postTrend} color="#22c55e" />
        <StatCard icon={AlertTriangleIcon} label="Reports" value={totalReports} trend={reportTrend} color="#f59e0b" />
        <StatCard icon={MessageIcon} label="Comments" value={totalComments} trend={commentTrend} color="#a855f7" />
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        <button onClick={() => navigate('/reports')} style={{ flexShrink: 0, background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: '#fff' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangleIcon width={18} height={18} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{pendingReports}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6d7382', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Reports</div>
          </div>
        </button>
        <button onClick={() => navigate('/pending-approvals')} style={{ flexShrink: 0, background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: '#fff' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClockIcon width={18} height={18} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{pendingApprovals}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6d7382', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Approvals</div>
          </div>
        </button>
      </div>

      {/* LIVE COUNTERS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(135deg, #0a0a0a, #050505)', border: '1px solid #1f1f1f', borderRadius: 16, padding: 20, textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 36, fontWeight: 900 }}>{onlineNow}</div>
          <div style={{ color: '#22c55e', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 6 }}>● Online Now</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #0a0a0a, #050505)', border: '1px solid #1f1f1f', borderRadius: 16, padding: 20, textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 36, fontWeight: 900 }}>{activeToday}</div>
          <div style={{ color: '#6d7382', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 6 }}>Active Today</div>
        </div>
      </div>

      {/* CHARTS — big and premium */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <AreaChartCard
          title="New Signups"
          subtitle={`Last ${timeRange} days`}
          data={signupsData}
          color="#ef4444"
          height={240}
        />

        <BarChartCard
          title="Activity"
          subtitle="Last 24 hours"
          data={hourlyData}
          color="#3b82f6"
          height={220}
          interval={3}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <AreaChartCard title="Posts" subtitle={`${timeRange}d`} data={postsData} color="#22c55e" height={170} />
          <AreaChartCard title="Comments" subtitle={`${timeRange}d`} data={commentsData} color="#a855f7" height={170} />
        </div>

        <AreaChartCard
          title="Reports"
          subtitle={`Last ${timeRange} days`}
          data={reportsData}
          color="#f59e0b"
          height={220}
        />

        <DonutChartCard
          title="Flags by Category"
          subtitle={`Last ${timeRange} days`}
          data={flagsByCategory}
          totalLabel="Flags"
          height={240}
        />

        <HeatmapCard
          title="Activity Heatmap"
          subtitle="Day × Hour"
          matrix={heatmapMatrix}
        />

        <LeaderboardCard
          title="Top Creators"
          subtitle={`Last ${timeRange} days`}
          items={topCreators}
        />

      </div>
    </div>
  );
}
