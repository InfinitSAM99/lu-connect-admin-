import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  XIcon,
  UserIcon,
} from '../components/Icons.jsx';

const STATUS_ROWS = [
  { key: 'pending',  label: 'Pending',  color: '#eab308' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444' },
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

export default function PendingApprovals() {
  const { profile: me } = useAuth();
  const [items, setItems] = useState([]);
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
      .from('profiles')
      .select('id, full_name, username, email, avatar_url, faculty, course, year_of_study, admission_number, approval_status, is_bot, created_at')
      .eq('is_bot', false)
      .in('approval_status', ['pending', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) setErr(error.message);
    setItems(data || []);
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

  const openApplicant = (p) => {
    setActive(p);
    setDragY(0);
  };

  const approve = async () => {
    if (!active) return;
    const target = active;
    setBusy(true);

    // OPTIMISTIC: remove from list immediately
    setItems((prev) => prev.filter((x) => x.id !== target.id));
    setActive(null);

    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'approved' })
      .eq('id', target.id);

    if (error) {
      setBusy(false);
      alert('Approve failed: ' + error.message);
      load();
      return;
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'approve_student',
      target_type: 'profile',
      target_id: target.id,
      details: { email: target.email, name: target.full_name },
    });

    await supabase.from('notifications').insert({
      user_id: target.id,
      type: 'account',
      title: 'Account approved',
      body: 'Welcome to LU CONNECT! Your account is now active.',
      link: '/',
      is_read: false,
    });

    setBusy(false);
  };

  const reject = async () => {
    if (!active) return;
    const target = active;
    setBusy(true);

    // OPTIMISTIC: remove from list immediately
    setItems((prev) => prev.filter((x) => x.id !== target.id));
    setActive(null);

    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'rejected' })
      .eq('id', target.id);

    if (error) {
      setBusy(false);
      alert('Reject failed: ' + error.message);
      load();
      return;
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'reject_student',
      target_type: 'profile',
      target_id: target.id,
      details: { email: target.email, name: target.full_name },
    });

    await supabase.from('notifications').insert({
      user_id: target.id,
      type: 'account',
      title: 'Account not approved',
      body: 'Your LU CONNECT account was not approved. Contact support if you believe this is an error.',
      link: '/',
      is_read: false,
    });

    setBusy(false);
  };

  const counts = {
    pending:  items.filter((p) => p.approval_status === 'pending').length,
    rejected: items.filter((p) => p.approval_status === 'rejected').length,
  };

  const rowItems = rowOpen
    ? items.filter((p) => p.approval_status === rowOpen)
    : [];

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 28px', gap: 12,
      }}>
        <ClockIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Pending Approvals
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-3)',
          textAlign: 'center', maxWidth: 320, lineHeight: 1.5,
        }}>
          Approve new signups or review rejected accounts
        </div>
      </div>

      {err && (
        <div style={{ margin: '0 16px 12px', background: '#7f1d1d', color: '#fff', padding: 10, borderRadius: 8, fontSize: 13 }}>
          {err}
        </div>
      )}

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
                background: STATUS_ROWS.find((r) => r.key === rowOpen)?.color || '#fff',
              }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  {STATUS_ROWS.find((r) => r.key === rowOpen)?.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {rowItems.length} {rowItems.length === 1 ? 'applicant' : 'applicants'}
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
              {rowItems.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => openApplicant(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
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
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <UserIcon width={20} height={20} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.full_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {p.email || '—'} · {timeAgo(p.created_at)}
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
                  {active.avatar_url ? (
                    <img src={active.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserIcon width={32} height={32} />
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>
                  {active.full_name || 'Unknown'}
                </div>
                {active.username && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
                    @{active.username}
                  </div>
                )}
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  color: STATUS_ROWS.find((r) => r.key === active.approval_status)?.color || '#fff',
                  marginTop: 8, letterSpacing: 0.6,
                }}>
                  {active.approval_status}
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
                  Applicant details
                </div>
                <DetailRow label="Email" value={active.email || '—'} />
                {active.admission_number && <DetailRow label="Admission No." value={active.admission_number} />}
                {active.faculty && <DetailRow label="Faculty" value={active.faculty} />}
                {active.course && <DetailRow label="Course" value={active.course} />}
                {active.year_of_study && <DetailRow label="Year" value={`Year ${active.year_of_study}`} />}
                <DetailRow label="Signed up" value={timeAgo(active.created_at)} />
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {active.approval_status === 'pending' && (
                  <>
                    <button
                      onClick={approve}
                      disabled={busy}
                      style={actionBtn('transparent', '#22c55e', '1.5px solid #22c55e')}
                    >
                      <CheckCircleIcon width={20} height={20} />
                      Approve account
                    </button>
                    <button
                      onClick={reject}
                      disabled={busy}
                      style={actionBtn('var(--surface-2)', '#f97316')}
                    >
                      <XCircleIcon width={20} height={20} />
                      Reject account
                    </button>
                  </>
                )}
                {active.approval_status === 'rejected' && (
                  <button
                    onClick={approve}
                    disabled={busy}
                    style={actionBtn('transparent', '#22c55e', '1.5px solid #22c55e')}
                  >
                    <CheckCircleIcon width={20} height={20} />
                    Approve anyway
                  </button>
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
      <span style={{ fontSize: 13, color: '#fff', fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

const actionBtn = (bg, color, border) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '16px', background: bg, color,
  border: border || 'none', borderRadius: 14,
  fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
});
