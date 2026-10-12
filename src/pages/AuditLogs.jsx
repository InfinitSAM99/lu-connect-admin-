import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  ClipboardIcon,
  XIcon,
} from '../components/Icons.jsx';

const CATEGORY_ROWS = [
  { key: 'all',      label: 'All actions',    color: '#6d7382', match: () => true },
  { key: 'delete',   label: 'Deletions',      color: '#ef4444', match: (a) => /delete|reject|suspend|revoke|ban/i.test(a) },
  { key: 'approve',  label: 'Approvals',      color: '#22c55e', match: (a) => /approve|verify|unban/i.test(a) },
  { key: 'create',   label: 'Creations',      color: '#3b82f6', match: (a) => /create/i.test(a) },
  { key: 'other',    label: 'Other',          color: '#eab308', match: (a) => !/delete|reject|suspend|revoke|ban|approve|verify|unban|create/i.test(a) },
];

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fullDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString() + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function humanAction(action) {
  if (!action) return '—';
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function badgeColor(action) {
  const a = action || '';
  if (/delete|reject|suspend|revoke|ban/i.test(a)) return '#ef4444';
  if (/approve|verify|unban/i.test(a)) return '#22c55e';
  if (/create/i.test(a)) return '#3b82f6';
  return '#6d7382';
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowOpen, setRowOpen] = useState(null);
  const [active, setActive] = useState(null);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

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

  const onTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
    activeRef.current = true;
  };
  const onTouchMove = (e) => {
    if (!activeRef.current) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 100) setActive(null);
    setDragY(0);
    activeRef.current = false;
  };

  const openLog = (l) => {
    setActive(l);
    setDragY(0);
  };

  const counts = {};
  CATEGORY_ROWS.forEach((r) => {
    counts[r.key] = logs.filter((l) => r.match(l.action || '')).length;
  });

  const rowItems = rowOpen
    ? logs.filter((l) => CATEGORY_ROWS.find((r) => r.key === rowOpen)?.match(l.action || ''))
    : [];

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 28px', gap: 12,
      }}>
        <ClipboardIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Audit Logs
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-3)',
          textAlign: 'center', maxWidth: 320, lineHeight: 1.5,
        }}>
          Every privileged action is recorded here
        </div>
      </div>

      {loading && <div className="state">Loading…</div>}

      {/* CATEGORY ROWS */}
      {!loading && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {CATEGORY_ROWS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRowOpen(r.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 18,
                width: '100%', padding: '20px 16px',
                background: 'transparent', border: 'none',
                borderBottom: '1px solid var(--border)',
                color: '#fff', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 5, background: r.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>{r.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: counts[r.key] > 0 ? '#fff' : 'var(--text-3)' }}>
                {counts[r.key]}
              </span>
              <span style={{ display: 'inline-flex', color: 'var(--text-3)', opacity: 0.5 }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ROW DRAWER */}
      {rowOpen && (
        <>
          <div
            onClick={() => setRowOpen(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              maxHeight: '85vh', background: 'var(--surface)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 210, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', animation: 'drawer-slide-up 250ms ease-out',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 6px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
            </div>

            <div style={{
              padding: '8px 20px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{
                width: 12, height: 12, borderRadius: 6,
                background: CATEGORY_ROWS.find((r) => r.key === rowOpen)?.color || '#fff',
              }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  {CATEGORY_ROWS.find((r) => r.key === rowOpen)?.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {rowItems.length} {rowItems.length === 1 ? 'entry' : 'entries'}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setRowOpen(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', padding: 8, cursor: 'pointer' }}
              >
                <XIcon width={22} height={22} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              {rowItems.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  Nothing here
                </div>
              )}
              {rowItems.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => openLog(l)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    width: '100%', padding: '14px 20px',
                    background: 'transparent', border: 'none',
                    borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: '1px solid var(--border)',
                    color: '#fff', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 500, color: badgeColor(l.action),
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {humanAction(l.action)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {l.profiles?.full_name || l.profiles?.email || 'Unknown'} · {timeAgo(l.created_at)}
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', color: 'var(--text-3)', opacity: 0.4 }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* DETAIL DRAWER */}
      {active && (
        <>
          <div
            onClick={() => setActive(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              maxHeight: '90vh', background: 'var(--surface)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 310, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', animation: 'drawer-slide-up 250ms ease-out',
              transform: `translateY(${dragY}px)`,
              transition: dragY === 0 ? 'transform 200ms ease-out' : 'none',
            }}
          >
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 0 6px', flexShrink: 0, touchAction: 'none', cursor: 'grab',
              }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 28 }}>
              <div style={{
                padding: '8px 20px 20px',
                borderBottom: '1px solid var(--border)',
                position: 'relative',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: badgeColor(active.action),
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
                }}>
                  {active.action || 'Unknown'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                  {humanAction(active.action)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>
                  {fullDate(active.created_at)}
                </div>
                <button
                  onClick={() => setActive(null)}
                  style={{
                    position: 'absolute', top: 8, right: 12,
                    background: 'transparent', border: 'none',
                    color: '#fff', padding: 8, cursor: 'pointer',
                  }}
                >
                  <XIcon width={22} height={22} />
                </button>
              </div>

              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
                }}>
                  Context
                </div>
                <DetailRow label="Admin" value={active.profiles?.full_name || active.profiles?.email || 'Unknown'} />
                <DetailRow label="Target type" value={active.target_type || '—'} />
                <DetailRow label="Target ID" value={active.target_id || '—'} />
              </div>

              {active.details && Object.keys(active.details).length > 0 && (
                <div style={{ padding: '20px' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
                  }}>
                    Details
                  </div>
                  {Object.entries(active.details).map(([k, v]) => (
                    <DetailRow
                      key={k}
                      label={k.replace(/_/g, ' ')}
                      value={typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', gap: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--text-3)', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 13, color: '#fff', fontWeight: 500,
        textAlign: 'right', maxWidth: '65%', wordBreak: 'break-all',
      }}>{value}</span>
    </div>
  );
}
