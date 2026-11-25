import { useState, useMemo } from 'react';
import { useLiveQuery } from '../lib/useLiveQuery';
import { supabase } from '../lib/supabase';
import { UsersIcon, ChartIcon, ShieldCheckIcon } from '../components/Icons.jsx';

export default function Visitors() {
  const [selectedVisit, setSelectedVisit] = useState(null);

  const { data: visits, loading, error } = useLiveQuery(
    'admin_visits_feed',
    async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      return await supabase
        .from('visits')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000);
    },
    { table: 'visits', event: 'INSERT' },
    { initialData: [] }
  );

  const { activeNow, filtered } = useMemo(() => {
    if (!visits) return { activeNow: 0, filtered: [] };
    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    const activeSessions = new Set(visits.filter(v => new Date(v.created_at).getTime() > fiveMinsAgo).map(v => v.session_id));
    return { activeNow: activeSessions.size, filtered: visits };
  }, [visits]);

  if (error) return <div className="state">Error loading visits: {error.message}</div>;

  return (
    <div style={{ paddingBottom: 40 }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '20px 0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <ChartIcon width={64} height={64} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Visitor Logs</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Raw IP intelligence & device data</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Now</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand)' }}>{activeNow}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total (24h)</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{filtered.length}</div>
        </div>
      </div>

      {/* List Feed */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {loading && !visits?.length && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>Loading logs...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No visits found.</div>
        )}

        {filtered.map(v => {
          const isLive = new Date(v.created_at).getTime() > Date.now() - 5 * 60 * 1000;
          const isAnon = v.is_vpn || v.is_hosting;

          return (
            <div 
              key={v.id} 
              onClick={() => setSelectedVisit(v)}
              style={{ 
                padding: '16px 0', borderBottom: '1px solid var(--border)',
                display: 'flex', gap: 12, cursor: 'pointer'
              }}
            >
              <div style={{ 
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: isAnon ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isAnon ? 'var(--brand)' : 'var(--text-3)'
              }}>
                {v.user_id ? <UsersIcon width={18} height={18} /> : <ChartIcon width={18} height={18} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#fff', fontFamily: 'monospace' }}>{v.ip || 'Unknown IP'}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>{new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.city ? `${v.city}, ${v.country}` : (v.country || 'Unknown Location')} 
                  {v.isp && ` • ${v.isp}`}
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
                  {v.model || v.device} / {v.browser} {v.screen && `• ${v.screen}`}
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {v.is_vpn && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 600 }}>VPN / PROXY</span>}
                  {v.is_hosting && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(249, 115, 22, 0.2)', color: '#f97316', fontWeight: 600 }}>DATACENTER</span>}
                  {v.user_id && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontWeight: 600 }}>LOGGED IN</span>}
                  {!v.is_vpn && !v.is_hosting && !v.user_id && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-3)', fontWeight: 600 }}>CLEAN</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3/4 Bottom Drawer */}
      {selectedVisit && (
        <>
          <div 
            onClick={() => setSelectedVisit(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 250 }}
          />
          <div 
            style={{ 
              position: 'fixed', left: 0, right: 0, bottom: 0, height: '75vh',
              background: 'var(--surface)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 260, display: 'flex', flexDirection: 'column',
              animation: 'drawer-slide-up 250ms ease-out'
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--text-3)', margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Visitor Details</h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Session: {selectedVisit.session_id.slice(0, 8)}...</p>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              
              {/* IP & Network */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Network & IP</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Row label="IP Address" value={selectedVisit.ip} />
                  <Row label="Network / ISP" value={selectedVisit.isp || 'Unknown'} />
                  <Row label="Location" value={`${selectedVisit.city || 'Unknown'}, ${selectedVisit.country || 'Unknown'}`} />
                  {selectedVisit.is_vpn && <Row label="VPN / Proxy" value="Detected" danger />}
                  {selectedVisit.is_hosting && <Row label="Connection Type" value="Datacenter (Likely Bot/VPN)" danger />}
                </div>
              </div>

              {/* Device Details */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Device Hardware</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Row label="Device Model" value={selectedVisit.model || selectedVisit.device} />
                  <Row label="Operating System" value={selectedVisit.os} />
                  <Row label="Browser" value={selectedVisit.browser} />
                  <Row label="Screen Size" value={selectedVisit.screen || 'Unknown'} />
                  <Row label="User Agent" value={selectedVisit.user_agent} small />
                </div>
              </div>

              {/* Page Context */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Page Context</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Row label="Page Visited" value={selectedVisit.path} />
                  <Row label="Referrer" value={selectedVisit.referrer || 'Direct Entry'} />
                  <Row label="Timestamp" value={new Date(selectedVisit.created_at).toLocaleString()} />
                </div>
              </div>

            </div>
          </div>
        </>
      )}

    </div>
  );
}

function Row({ label, value, danger, small }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{label}</span>
      <span style={{ 
        fontSize: small ? 11 : 14, 
        fontWeight: 500, 
        color: danger ? 'var(--brand)' : '#fff', 
        textAlign: 'right', 
        maxWidth: '60%',
        wordBreak: 'break-all'
      }}>
        {value || '—'}
      </span>
    </div>
  );
}
