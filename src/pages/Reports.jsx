import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

export default function Reports() {
  const { profile: me } = useAuth();
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('reports').select('*, reporter:reporter_id(id, full_name, avatar_url)').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const resolve = async (r, status) => {
    await supabase.from('reports').update({
      status, reviewed_by: me.id, reviewed_at: new Date().toISOString(),
    }).eq('id', r.id);

    await supabase.from('moderation_actions').insert({
      moderator_id: me.id, report_id: r.id, target_type: r.target_type, target_id: r.target_id,
      action: status,
    });

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'resolve_report', target_type: r.target_type, target_id: r.target_id,
      details: { report_id: r.id, status },
    });
    load();
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Reports & Moderation</h1>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['pending', 'reviewing', 'resolved', 'dismissed', 'all'].map((s) => (
          <button key={s} className={'btn' + (filter === s ? ' btn-primary' : '')} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div className="state">Loading…</div>}
      {!loading && reports.length === 0 && <div className="card state"><h3>No reports in this category</h3></div>}

      <div style={{ display: 'grid', gap: 10 }}>
        {reports.map((r) => (
          <div key={r.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <img className="avatar" width={36} height={36}
                src={r.reporter?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${r.reporter?.full_name}`} alt="" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>
                  <strong>{r.reporter?.full_name}</strong> reported a <span className="badge badge-gray">{r.target_type}</span>
                </div>
                <div style={{ fontSize: 14, marginTop: 6 }}><strong>Reason:</strong> {r.reason}</div>
                {r.details && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{r.details}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {r.status === 'pending' && (
                  <>
                    <button className="btn btn-primary" onClick={() => resolve(r, 'reviewing')} style={{ fontSize: 12 }}>Review</button>
                    <button className="btn" onClick={() => resolve(r, 'dismissed')} style={{ fontSize: 12 }}>Dismiss</button>
                  </>
                )}
                {r.status === 'reviewing' && (
                  <>
                    <button className="btn btn-primary" onClick={() => resolve(r, 'resolved')} style={{ fontSize: 12 }}>Resolve</button>
                    <button className="btn" onClick={() => resolve(r, 'dismissed')} style={{ fontSize: 12 }}>Dismiss</button>
                  </>
                )}
                {r.status !== 'pending' && r.status !== 'reviewing' && (
                  <span className={'badge ' + (r.status === 'resolved' ? 'badge-green' : 'badge-gray')}>{r.status}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}