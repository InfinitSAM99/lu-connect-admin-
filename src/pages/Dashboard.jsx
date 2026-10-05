import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [students, posts, comments, connections, groups, events, reports, announcements, pending] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
        supabase.from('connections').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
        supabase.from('groups').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
      ]);
      setStats({
        students: students.count || 0, posts: posts.count || 0, comments: comments.count || 0,
        connections: connections.count || 0, groups: groups.count || 0, events: events.count || 0,
        reports: reports.count || 0, announcements: announcements.count || 0, suspended: pending.count || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="state">Loading dashboard…</div>;

  const cards = [
    { label: 'Students', value: stats.students, color: 'var(--brand)' },
    { label: 'Posts', value: stats.posts },
    { label: 'Comments', value: stats.comments },
    { label: 'Connections', value: stats.connections },
    { label: 'Groups', value: stats.groups },
    { label: 'Events', value: stats.events },
    { label: 'Pending Reports', value: stats.reports, color: 'var(--danger)' },
    { label: 'Announcements', value: stats.announcements },
    { label: 'Suspended Accounts', value: stats.suspended, color: 'var(--warning)' },
  ];

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard Overview</h1>
      <p style={{ color: 'var(--text-2)', marginTop: -8 }}>Live platform statistics</p>

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="card stat-card">
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ color: c.color || 'var(--text)' }}>{c.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}