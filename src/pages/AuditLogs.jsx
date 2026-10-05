import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('admin_audit_logs')
      .select('*, profiles:admin_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Audit Logs</h1>
      <p style={{ color: 'var(--text-2)', marginTop: -8 }}>All privileged actions are recorded here.</p>

      {loading && <div className="state">Loading…</div>}
      {!loading && logs.length === 0 && <div className="card state"><h3>No audit entries</h3></div>}

      {!loading && logs.length > 0 && (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="data">
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.profiles?.full_name || l.profiles?.email}</td>
                  <td><span className="badge badge-gray">{l.action}</span></td>
                  <td style={{ fontSize: 12 }}>{l.target_type}{l.target_id ? ` · ${l.target_id.slice(0, 8)}…` : ''}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.details ? JSON.stringify(l.details).slice(0, 100) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}