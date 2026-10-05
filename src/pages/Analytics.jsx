import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase.from('profiles').select('created_at, faculty');
      const { data: posts } = await supabase.from('posts').select('created_at').eq('is_deleted', false);
      setData({ profiles: profiles || [], posts: posts || [] });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="state">Loading analytics…</div>;

  // Aggregate by day for last 14 days
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  const signupsByDay = days.map((d) => {
    const next = new Date(d); next.setDate(next.getDate() + 1);
    return data.profiles.filter((p) => new Date(p.created_at) >= d && new Date(p.created_at) < next).length;
  });
  const postsByDay = days.map((d) => {
    const next = new Date(d); next.setDate(next.getDate() + 1);
    return data.posts.filter((p) => new Date(p.created_at) >= d && new Date(p.created_at) < next).length;
  });

  const facultyCounts = {};
  data.profiles.forEach((p) => { if (p.faculty) facultyCounts[p.faculty] = (facultyCounts[p.faculty] || 0) + 1; });
  const topFaculties = Object.entries(facultyCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxF = Math.max(1, ...topFaculties.map((x) => x[1]));
  const maxSignup = Math.max(1, ...signupsByDay);
  const maxPosts = Math.max(1, ...postsByDay);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Analytics</h1>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>New signups (14 days)</h3>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
          {signupsByDay.map((v, i) => (
            <div key={i} style={{
              flex: 1, height: `${(v / maxSignup) * 100}%`, background: 'var(--brand)',
              borderRadius: 4, minHeight: 3, position: 'relative'
            }} title={`${v} signups on ${days[i].toLocaleDateString()}`} />
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>Posts created (14 days)</h3>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
          {postsByDay.map((v, i) => (
            <div key={i} style={{
              flex: 1, height: `${(v / maxPosts) * 100}%`, background: 'var(--info)',
              borderRadius: 4, minHeight: 3
            }} title={`${v} posts on ${days[i].toLocaleDateString()}`} />
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Students by faculty</h3>
        {topFaculties.length === 0 && <div className="state">No faculty data yet</div>}
        {topFaculties.map(([f, n]) => (
          <div key={f} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>{f}</span><span>{n}</span>
            </div>
            <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(n / maxF) * 100}%`, height: '100%', background: 'var(--brand)', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}