import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  UsersIcon, FileTextIcon, MessageIcon, BuildingIcon,
  CalendarIcon, AlertTriangleIcon, MegaphoneIcon, ShieldIcon,
  ChevronRightIcon,
} from '../components/Icons.jsx';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text)',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [activity, setActivity] = useState([]);
  const [signupsData, setSignupsData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [postsData, setPostsData] = useState([]);
  const [onlineNow, setOnlineNow] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        students, posts, comments, connections, groups, events,
        reports, announcements, suspended,
        online, activeT,
        recentSignups, recentPosts, recentReports,
        allSignups, allActivity, allPosts,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
        supabase.from('connections').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
        supabase.from('groups').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', twoMinAgo),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', todayStart),
        supabase.from('profiles').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('posts').select('id, content, created_at, profiles:author_id(full_name)').eq('is_deleted', false).order('created_at', { ascending: false }).limit(3),
        supabase.from('reports').select('id, reason, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(3),
        supabase.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo),
        supabase.from('profiles').select('last_seen').gte('last_seen', dayAgo),
        supabase.from('posts').select('created_at').eq('is_deleted', false).gte('created_at', thirtyDaysAgo),
      ]);

      setStats({
        students: students.count || 0,
        posts: posts.count || 0,
        comments: comments.count || 0,
        connections: connections.count || 0,
        groups: groups.count || 0,
        events: events.count || 0,
        reports: reports.count || 0,
        announcements: announcements.count || 0,
        suspended: suspended.count || 0,
      });

      setOnlineNow(online.count || 0);
      setActiveToday(activeT.count || 0);

      // Signups chart
      const days = [];
      const signupMap = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: key, label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 });
        signupMap[key] = days[days.length - 1];
      }
      (allSignups.data || []).forEach((row) => {
        const key = row.created_at?.slice(0, 10);
        if (key && signupMap[key]) signupMap[key].count += 1;
      });
      setSignupsData(days);

      // Posts chart
      const postDays = [];
      const postMap = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        postDays.push({ date: key, label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 });
        postMap[key] = postDays[postDays.length - 1];
      }
      (allPosts.data || []).forEach((row) => {
        const key = row.created_at?.slice(0, 10);
        if (key && postMap[key]) postMap[key].count += 1;
      });
      setPostsData(postDays);

      // Hourly activity
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

      // Activity feed
      const items = [];
      (recentSignups.data || []).forEach((s) => {
        items.push({
          id: `s-${s.id}`,
          type: 'signup',
          at: s.created_at,
          text: `${s.full_name || 'A student'} signed up`,
        });
      });
      (recentPosts.data || []).forEach((p) => {
        items.push({
          id: `p-${p.id}`,
          type: 'post',
          at: p.created_at,
          text: `${p.profiles?.full_name || 'Someone'} posted "${(p.content || '').slice(0, 40) || '(media)'}"`,
        });
      });
      (recentReports.data || []).forEach((r) => {
        items.push({
          id: `r-${r.id}`,
          type: 'report',
          at: r.created_at,
          text: `New report: "${(r.reason || '').slice(0, 40)}"`,
        });
      });
      items.sort((a, b) => new Date(b.at) - new Date(a.at));
      setActivity(items.slice(0, 6));

      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="state">Loading dashboard…</div>;

  const summaryStats = [
    { icon: UsersIcon, label: 'Total Users', value: stats.students, accent: 'brand' },
    { icon: FileTextIcon, label: 'Total Posts', value: stats.posts, accent: 'info' },
    { icon: AlertTriangleIcon, label: 'Reports', value: stats.reports, accent: 'warning' },
  ];

  const secondaryStats = [
    { icon: MessageIcon, label: 'Comments', value: stats.comments },
    { icon: UsersIcon, label: 'Connections', value: stats.connections },
    { icon: BuildingIcon, label: 'Groups', value: stats.groups },
    { icon: CalendarIcon, label: 'Events', value: stats.events },
    { icon: MegaphoneIcon, label: 'Announcements', value: stats.announcements },
    { icon: ShieldIcon, label: 'Suspended', value: stats.suspended },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">Live platform statistics</p>
      </div>

      {/* Live status card */}
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

      {/* 3 top stats — one card, internal dividers */}
      <div className="card big-stats-card">
        {summaryStats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={'big-stat' + (i < summaryStats.length - 1 ? ' with-divider' : '')}>
              <div className={'big-stat-icon accent-' + s.accent}>
                <Icon width={20} height={20} />
              </div>
              <div className="big-stat-value">{s.value.toLocaleString()}</div>
              <div className="big-stat-label">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Chart 1 — Signups */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">New Signups · Last 30 Days</div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={signupsData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                interval={Math.max(0, Math.floor(signupsData.length / 5) - 1)}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--text-2)' }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--brand)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: 'var(--brand)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2 — Activity by hour */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">Activity · Last 24 Hours</div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hourlyData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                interval={3}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--text-2)' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3 — Posts per day */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">Posts · Last 30 Days</div>
        </div>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={postsData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                interval={Math.max(0, Math.floor(postsData.length / 5) - 1)}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--text-2)' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Platform totals — all secondary stats in one card */}
      <div className="card platform-totals">
        <div className="chart-head">
          <div className="chart-title">Platform Totals</div>
        </div>
        <div className="totals-body">
          {secondaryStats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="totals-row">
                <div className="totals-icon"><Icon width={16} height={16} /></div>
                <div className="totals-label">{s.label}</div>
                <div className="totals-value">{s.value.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">Recent Activity</div>
        </div>
        <div className="activity-body">
          {activity.length === 0 && (
            <div className="activity-empty">Nothing yet.</div>
          )}
          {activity.map((a) => (
            <div key={a.id} className="activity-item">
              <span
                className={
                  'activity-dot' +
                  (a.type === 'signup' ? ' dot-brand' : a.type === 'report' ? ' dot-warning' : ' dot-info')
                }
              />
              <span className="activity-text">{a.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card chart-card">
        <div className="chart-head">
          <div className="chart-title">Quick Actions</div>
        </div>
        <div className="actions-body">
          <button className="quick-action" onClick={() => navigate('/pending-approvals')}>
            <UsersIcon width={16} height={16} />
            <span style={{ flex: 1 }}>Pending approvals</span>
            <ChevronRightIcon width={16} height={16} />
          </button>
          <button className="quick-action" onClick={() => navigate('/reports')}>
            <AlertTriangleIcon width={16} height={16} />
            <span style={{ flex: 1 }}>Review reports</span>
            <ChevronRightIcon width={16} height={16} />
          </button>
          <button className="quick-action" onClick={() => navigate('/announcements')}>
            <MegaphoneIcon width={16} height={16} />
            <span style={{ flex: 1 }}>Send announcement</span>
            <ChevronRightIcon width={16} height={16} />
          </button>
          <button className="quick-action" onClick={() => navigate('/students')}>
            <UsersIcon width={16} height={16} />
            <span style={{ flex: 1 }}>Manage students</span>
            <ChevronRightIcon width={16} height={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
