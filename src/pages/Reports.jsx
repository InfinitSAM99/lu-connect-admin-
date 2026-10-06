import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

export default function Reports() {
  const { profile: me } = useAuth();
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    let q = supabase
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_id_fkey(id, full_name, avatar_url)')
      .order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q;
    if (error) {
      setErr(error.message + ' — ' + (error.details || ''));
      setReports([]);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const resolve = async (r, status) => {
    // 1. Update report status
    const { error: updateErr } = await supabase.from('reports').update({
      status,
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', r.id);
    if (updateErr) return alert('Update failed: ' + updateErr.message);

    // 2. Log to moderation_actions (best-effort — don't block if it fails)
    await supabase.from('moderation_actions').insert({
      moderator_id: me.id,
      report_id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      action: status,
    });

    // 3. Audit log
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'resolve_report',
      target_type: r.target_type,
      target_id: r.target_id,
      details: { report_id: r.id, status },
    });

    // 4. Notify the reporter on FINAL status only
    if ((status === 'resolved' || status === 'dismissed') && r.reporter_id) {
      const body = status === 'resolved'
        ? 'Your report has been reviewed and resolved. Thank you for flagging it.'
        : 'After review, we were unable to take action on your report.';
      await supabase.from('notifications').insert({
        user_id: r.reporter_id,
        type: 'report_update',
        title: status === 'resolved' ? 'Report resolved' : 'Report reviewed',
        body,
        link: '/notifications',
        is_read: false,
      });
    }

    load();
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Reports & Moderation</h1>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['pending', 'reviewing', 'resolved', 'dismissed', 'all'].map((s) => (
          <button key={s} className={'btn' + (filter === s ? ' btn-primary' : '')} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <button className="btn btn-ghost" onClick={load}>Refresh</button>
      </div>

      {err && (
        <div className="card" style={{ padding: 12, marginBottom: 12, color: 'var(--danger)' }}>
          <strong>Query error:</strong> {err}
        </div>
      )}

      {loading && <div className="state">Loading…</div>}
      {!loading && !err && reports.length === 0 && (
        <div className="card state"><h3>No reports in this category</h3></div>
      )}

      {!loading && reports.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {reports.map((r) => (
            <div key={r.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <img className="avatar" width={36} height={36}
                  src={r.reporter?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${r.reporter?.full_name || 'U'}`} alt="" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>
                    <strong>{r.reporter?.full_name || 'Unknown'}</strong> reported a <span className="badge badge-gray">{r.target_type}</span>
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
      )}
    </div>
  );
}
