import { useLiveQuery } from '../lib/useLiveQuery';
import { supabase } from '../lib/supabase';
import { ShieldCheckIcon, AlertTriangleIcon } from '../components/Icons.jsx';

export default function SecurityThreats() {
  const { data: logs, loading } = useLiveQuery(
    'security_logs_feed',
    async () => {
      return await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
    },
    { table: 'security_logs', event: 'INSERT' },
    { initialData: [] }
  );

  if (loading) return <div className="state">Loading security logs...</div>;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '20px 0 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <ShieldCheckIcon width={64} height={64} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Security Threats</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Failed login attempts and suspicious activity</p>
      </div>

      {/* List Feed */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {logs?.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No security threats detected.</div>
        )}

        {logs?.map(log => (
          <div 
            key={log.id} 
            style={{ 
              padding: '16px 0',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: 12
            }}
          >
            <div style={{ 
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--brand)'
            }}>
              <AlertTriangleIcon width={18} height={18} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{log.email}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
                IP: <span style={{ fontFamily: 'monospace' }}>{log.ip || 'Unknown'}</span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Reason: <span style={{ color: 'var(--brand)' }}>{log.reason?.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
