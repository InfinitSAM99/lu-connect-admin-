import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  XIcon,
  UserIcon,
  ClockIcon,
  MessageIcon,
} from '../components/Icons.jsx';

const STATUS_ROWS = [
  { key: 'pending',   label: 'Pending',   color: '#eab308' },
  { key: 'reviewing', label: 'Reviewing', color: '#3b82f6' },
  { key: 'resolved',  label: 'Resolved',  color: '#22c55e' },
  { key: 'dismissed', label: 'Dismissed', color: '#6d7382' },
];

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString();
}

export default function Reports() {
  const { profile: me } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rowOpen, setRowOpen] = useState(null);
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const load = async () => {
    setLoading(true);
    setErr('');
    const { data, error } = await supabase
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_id_fkey(id, full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) {
      setErr(error.message + ' — ' + (error.details || ''));
      setReports([]);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

  const openReport = (r) => {
    setActive(r);
    setDragY(0);
  };

  const resolve = async (r, status) => {
    setBusy(true);
    const { error: updateErr } = await supabase.from('reports').update({
      status,
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', r.id);

    if (updateErr) { setBusy(false); alert('Update failed: ' + updateErr.message); return; }

    await supabase.from('moderation_actions').insert({
      moderator_id: me.id,
      report_id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      action: status,
    });

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'resolve_report',
      target_type: r.target_type,
      target_id: r.target_id,
      details: { report_id: r.id, status },
    });

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

    setBusy(false);
    setActive(null);
    load();
  };

  const counts = {};
  STATUS_ROWS.forEach((r) => {
    counts[r.key] = reports.filter((x) => x.status === r.key).length;
  });

  const rowReports = rowOpen ? reports.filter((r) => r.status === rowOpen) : [];

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 28px', gap: 12,
      }}>
        <UsersIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Student Reports
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-3)',
          textAlign: 'center', maxWidth: 320, lineHeight: 1.5,
        }}>
          Reports submitted by students
        </div>
      </div>

      {err && (
        <div style={{ margin: '0 16px 12px', background: '#7f1d1d', color: '#fff', padding: 10, borderRadius: 8, fontSize: 13 }}>
          {err}
        </div>
      )}

      {/* DOT ROWS */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {STATUS_ROWS.map((r) => (
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

      {loading && <div className="state">Loading…</div>}

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
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 0 6px',
            }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
            </div>

            <div style={{
              padding: '8px 20px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{
                width: 12, height: 12, borderRadius: 6,
                background: STATUS_ROWS.find((r) => r.key === rowOpen)?.color || '#fff',
              }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  {STATUS_ROWS.find((r) => r.key === rowOpen)?.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {rowReports.length} {rowReports.length === 1 ? 'report' : 'reports'}
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
              {rowReports.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  Nothing here
                </div>
              )}
              {rowReports.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => openReport(r)}
                  style={{
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    width: '100%', padding: '14px 20px',
                    background: 'transparent', border: 'none',
                    borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: '1px solid var(--border)',
                    color: '#fff', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 22,
                    background: 'var(--surface-2)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {r.reporter?.avatar_url ? (
                      <img src={r.reporter.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <UserIcon width={20} height={20} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>
                        {r.reporter?.full_name || 'Unknown'}
                      </span>
                      <span style={{ color: 'var(--text-3)' }}> reported a </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: '#3b82f6',
                        textTransform: 'uppercase', letterSpacing: 0.6,
                      }}>{r.target_type}</span>
                    </div>
                    <div style={{
                      fontSize: 14, color: 'var(--text-2)', lineHeight: 1.4,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {r.reason}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                      {timeAgo(r.created_at)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ACTION DRAWER */}
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
              maxHeight: '92vh', background: 'var(--surface)',
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
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 20px 20px',
                borderBottom: '1px solid var(--border)',
                position: 'relative',
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 36,
                  background: 'var(--surface-2)', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active.reporter?.avatar_url ? (
                    <img src={active.reporter.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserIcon width={32} height={32} />
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>
                  {active.reporter?.full_name || 'Unknown'}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  color: STATUS_ROWS.find((r) => r.key === active.status)?.color || '#fff',
                  marginTop: 8, letterSpacing: 0.6,
                }}>
                  {active.status}
                </div>
                <button
                  onClick={() => setActive(null)}
                  style={{
                    position: 'absolute', top: 4, right: 12,
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
                  Report details
                </div>
                <DetailRow label="Reported" value={active.target_type} />
                <DetailRow label="Submitted" value={timeAgo(active.created_at)} />
              </div>

              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
                }}>
                  Reason
                </div>
                <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.55 }}>
                  {active.reason}
                </div>
                {active.details && (
                  <>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                      textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 12,
                    }}>
                      Details
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55 }}>
                      {active.details}
                    </div>
                  </>
                )}
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(active.status === 'pending' || active.status === 'reviewing') ? (
                  <>
                    {active.status === 'pending' && (
                      <button
                        onClick={() => resolve(active, 'reviewing')}
                        disabled={busy}
                        style={actionBtn('transparent', '#3b82f6', '1.5px solid #3b82f6')}
                      >
                        <ClockIcon width={20} height={20} />
                        Mark as reviewing
                      </button>
                    )}
                    <button
                      onClick={() => resolve(active, 'resolved')}
                      disabled={busy}
                      style={actionBtn('transparent', '#22c55e', '1.5px solid #22c55e')}
                    >
                      <CheckCircleIcon width={20} height={20} />
                      Resolve report
                    </button>
                    <button
                      onClick={() => resolve(active, 'dismissed')}
                      disabled={busy}
                      style={actionBtn('var(--surface-2)', '#fff')}
                    >
                      <XCircleIcon width={20} height={20} />
                      Dismiss
                    </button>
                  </>
                ) : (
                  <div style={{
                    padding: 14, background: 'var(--surface-2)',
                    borderRadius: 12, fontSize: 13,
                    color: 'var(--text-3)', textAlign: 'center',
                  }}>
                    Final status: {active.status}
                  </div>
                )}
              </div>
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
      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#fff', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

const actionBtn = (bg, color, border) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '16px', background: bg, color,
  border: border || 'none', borderRadius: 14,
  fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
});
