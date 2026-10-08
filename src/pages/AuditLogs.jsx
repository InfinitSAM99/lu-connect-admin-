import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('admin_audit_logs')
      .select('*, profiles:admin_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, []);

  const humanAction = (action) => {
    if (!action) return '—';
    return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const actionBadge = (action) => {
    const a = action || '';
    if (a.includes('delete') || a.includes('reject') || a.includes('suspend') || a.includes('revoke') || a.includes('ban'))
      return 'badge-red';
    if (a.includes('create') || a.includes('approve') || a.includes('verify') || a.includes('unban'))
      return 'badge-green';
    return 'badge-gray';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">Every privileged action is recorded here</p>
      </div>

      {loading && <div className="state">Loading…</div>}

      {!loading && logs.length === 0 && (
        <div className="flat-empty">
          No audit entries yet — actions will appear here as admins use the panel
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 150 }}>When</th>
                <th style={{ minWidth: 160 }}>Admin</th>
                <th style={{ minWidth: 160 }}>Action</th>
                <th style={{ width: 140 }}>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {new Date(l.created_at).toLocaleDateString()}
                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                      {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <div className="cell-user-info">
                      <div className="cell-user-name" style={{ fontSize: 13 }}>
                        {l.profiles?.full_name || l.profiles?.email || 'Unknown'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={'badge ' + actionBadge(l.action)}>
                      {humanAction(l.action)}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {l.target_type || '—'}
                    {l.target_id ? ` · ${l.target_id.slice(0, 8)}…` : ''}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 320 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.details ? JSON.stringify(l.details).slice(0, 120) : '—'}
                    </div>
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
