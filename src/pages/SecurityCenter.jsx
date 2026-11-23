import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  AlertTriangleIcon,
  AlertCircleIcon,
  LockIcon,
  ShieldCheckIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../components/Icons.jsx';

const EVENT_COLORS = {
  failed_login: '#f97316',
  rls_violation: '#ef4444',
  rate_limit: '#eab308',
  suspicious_activity: '#a855f7',
};

const EVENT_LABELS = {
  failed_login: 'Failed Login',
  rls_violation: 'RLS Violation',
  rate_limit: 'Rate Limit Hit',
  suspicious_activity: 'Suspicious Activity',
};

function EventIcon({ type, size = 24, color }) {
  const common = { width: size, height: size, style: { color } };
  if (type === 'rls_violation') return <AlertTriangleIcon {...common} />;
  if (type === 'failed_login') return <LockIcon {...common} />;
  return <AlertCircleIcon {...common} />;
}

export default function SecurityCenter() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeLog, setActiveLog] = useState(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error) setLogs(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100%', maxWidth: 600, margin: '0 auto' }}>
      {/* HERO HEADER */}
      <div style={{ padding: '0 16px 20px', backgroundColor: '#000' }}>
        <button
          onClick={() => window.history.back()}
          style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#fff', padding: 0, marginBottom: 10,
          }}
          aria-label="Back"
        >
          <ChevronLeftIcon width={24} height={24} style={{ color: '#fff' }} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: 70, height: 70, borderRadius: 20,
            border: '3px solid #ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#000', marginBottom: 10,
          }}>
            <span style={{ color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>LU</span>
          </div>
          <span style={{ color: '#ef4444', fontSize: 14, fontWeight: 800, letterSpacing: 3 }}>SECURITY CENTER</span>
        </div>
      </div>

      <div style={{ height: 1, backgroundColor: '#1f1f1f', margin: '0 16px' }} />

      <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: 0.5, marginBottom: 6 }}>Threat Monitor</div>
          <div style={{ color: '#6d7382', fontSize: 13 }}>Real-time view of failed logins, RLS violations, and suspicious activity.</div>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          style={{
            background: 'transparent', border: '1px solid #1f1f1f',
            color: refreshing ? '#6d7382' : '#fff', borderRadius: 8,
            padding: '6px 10px', fontSize: 12, fontWeight: 700,
            cursor: refreshing ? 'default' : 'pointer', marginLeft: 12, flexShrink: 0,
          }}
        >
          {refreshing ? '...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid #1f1f1f',
            borderTopColor: '#ef4444',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ color: '#6d7382', textAlign: 'center', marginTop: 40 }}>No security events logged yet.</div>
      ) : (
        <div style={{ paddingBottom: 100 }}>
          {logs.map(log => {
            const color = EVENT_COLORS[log.event_type] || '#6d7382';
            return (
              <div
                key={log.id}
                onClick={() => setActiveLog(log)}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '18px 16px', gap: 16,
                  borderBottom: '1px solid #1f1f1f',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: `${color}15`, flexShrink: 0,
                }}>
                  <EventIcon type={log.event_type} size={24} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
                    {EVENT_LABELS[log.event_type] || log.event_type}
                  </div>
                  <div style={{ color: '#aab0bd', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.email || 'Unknown user'}
                  </div>
                  <div style={{ color: '#6d7382', fontSize: 11, marginTop: 4 }}>
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
                <ChevronRightIcon width={20} height={20} style={{ color: '#1f1f1f', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* PREMIUM BOTTOM SHEET */}
      {activeLog && (
        <div
          onClick={() => setActiveLog(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#000',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              width: '100%', maxHeight: '90vh', overflowY: 'auto',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* Drawer handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 16 }}>
              <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
            </div>

            {/* Close button (top-right) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px' }}>
              <button
                onClick={() => setActiveLog(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, display: 'flex' }}
                aria-label="Close"
              >
                <XIcon width={24} height={24} style={{ color: '#fff' }} />
              </button>
            </div>

            {/* Icon + title */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 24 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${EVENT_COLORS[activeLog.event_type] || '#6d7382'}15`,
              }}>
                <EventIcon type={activeLog.event_type} size={40} color={EVENT_COLORS[activeLog.event_type] || '#6d7382'} />
              </div>
              <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginTop: 16 }}>
                {EVENT_LABELS[activeLog.event_type]}
              </div>
              <div style={{ color: '#6d7382', fontSize: 11, marginTop: 4 }}>
                {new Date(activeLog.created_at).toLocaleString()}
              </div>
            </div>

            {/* Details */}
            <div style={{ padding: 20, borderTop: '1px solid #1f1f1f' }}>
              <div style={{ color: '#6d7382', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 12 }}>EVENT DETAILS</div>
              <div style={{ color: '#fff', fontSize: 14, marginBottom: 8, lineHeight: '20px' }}>
                <span style={{ fontWeight: 700 }}>Email:</span> {activeLog.email || 'N/A'}
              </div>
              <div style={{ color: '#fff', fontSize: 14, marginBottom: 8, lineHeight: '20px' }}>
                <span style={{ fontWeight: 700 }}>IP Address:</span> {activeLog.ip_address || 'Not captured'}
              </div>
              <div style={{ color: '#fff', fontSize: 14, marginBottom: 8, lineHeight: '20px' }}>
                <span style={{ fontWeight: 700 }}>User Agent:</span> {activeLog.user_agent || 'Not captured'}
              </div>
            </div>

            {/* Raw data */}
            {activeLog.details && (
              <div style={{ padding: 20, borderTop: '1px solid #1f1f1f', paddingBottom: 40 }}>
                <div style={{ color: '#6d7382', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 12 }}>RAW DATA</div>
                <pre style={{ color: '#6d7382', fontFamily: 'monospace', fontSize: 12, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{JSON.stringify(activeLog.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
