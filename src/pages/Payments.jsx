import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanIcon,
  XIcon,
  UserIcon,
} from '../components/Icons.jsx';

const STATUS_ROWS = [
  { key: 'pending',  label: 'Pending review', color: '#eab308' },
  { key: 'approved', label: 'Approved',       color: '#22c55e' },
  { key: 'rejected', label: 'Rejected',       color: '#ef4444' },
  { key: 'all',      label: 'All payments',   color: '#6d7382' },
];

const CATEGORY_LABELS = {
  likes: 'Likes',
  comments: 'Comments',
  views: 'Views',
  followers: 'Followers',
  post: 'Boost duration',
  bundle: 'Campus Famous',
};

function purposeLabel(purpose, metadata) {
  switch (purpose) {
    case 'verify': return 'Verification';
    case 'followers':
      return `Followers · +${(metadata?.followers || 0).toLocaleString()}`;
    case 'post_boost': {
      const cat = metadata?.category;
      const qty = metadata?.quantity;
      if (cat && CATEGORY_LABELS[cat]) {
        return `${CATEGORY_LABELS[cat]}${qty ? ` · ${qty.toLocaleString()}` : ''}`;
      }
      return 'Post Boost';
    }
    default: return purpose;
  }
}

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString();
}

export default function Payments() {
  const { profile: me, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [rowOpen, setRowOpen] = useState(null);
  const [active, setActive] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*, profiles:user_id(id, full_name, email, avatar_url, is_verified, displayed_follower_count)')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) setErrMsg(error.message);
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

  const openPayment = (p) => {
    setActive(p);
    setRejectReason('');
    setDragY(0);
  };

  // ---- Boost side-effects on approve ----
  const approveLinkedBoost = async (payment) => {
    if (payment.purpose !== 'post_boost' && payment.purpose !== 'followers') {
      return { ok: true };
    }
    const { data: boostRow, error: findErr } = await supabase
      .from('boosts')
      .select('id, post_id, category, delivery_days')
      .eq('payment_id', payment.id)
      .maybeSingle();
    if (findErr) return { ok: false, msg: findErr.message };
    if (!boostRow) return { ok: true };

    const now = new Date();
    const expires = new Date(now.getTime() + (boostRow.delivery_days || 5) * 86400000);

    const { error: boostErr } = await supabase
      .from('boosts')
      .update({
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', boostRow.id);
    if (boostErr) return { ok: false, msg: boostErr.message };

    if (boostRow.post_id) {
      const postUpdate = { boost_paid: true };
      if (['post', 'bundle', 'likes', 'comments', 'views'].includes(boostRow.category)) {
        postUpdate.boosted_until = expires.toISOString();
      }
      await supabase.from('posts').update(postUpdate).eq('id', boostRow.post_id);
    }
    return { ok: true };
  };

  const approve = async () => {
    if (!active) return;
    setBusy(true);

    const { error } = await supabase
      .from('payments')
      .update({ status: 'active', reviewed_by: me.id, reviewed_at: new Date().toISOString() })
      .eq('id', active.id);
    if (error) { setBusy(false); alert('Approve failed: ' + error.message); return; }

    const boostRes = await approveLinkedBoost(active);
    if (!boostRes.ok) alert('Payment approved but boost update failed: ' + boostRes.msg);

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'approve_payment', target_type: 'payment', target_id: active.id,
      details: {
        mpesa_code: active.mpesa_code,
        user: active.profiles?.email,
        amount: active.amount,
        purpose: active.purpose,
        category: active.metadata?.category,
        quantity: active.metadata?.quantity,
      },
    });

    let title = 'Payment approved';
    let body = '';
    if (active.purpose === 'verify') {
      title = 'You are now verified!';
      body = 'Your account shows the blue checkmark.';
    } else if (active.purpose === 'followers') {
      title = `+${(active.metadata?.followers || 0).toLocaleString()} followers added!`;
      body = 'Your follower boost is now delivering.';
    } else if (active.purpose === 'post_boost') {
      const cat = active.metadata?.category ? CATEGORY_LABELS[active.metadata.category] : 'Post';
      title = `${cat} boost approved!`;
      body = 'Your boost is now delivering.';
    }

    await supabase.from('notifications').insert({
      user_id: active.user_id, type: 'like', title, body,
      link: active.purpose === 'verify' ? `/profile/${active.user_id}` : '/get-boosted',
    });

    setBusy(false);
    setActive(null);
    load();
  };

  const reject = async () => {
    if (!active) return;
    setBusy(true);
    const reason = rejectReason.trim() || 'Payment could not be verified';

    const { error } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: me.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', active.id);
    if (error) { setBusy(false); alert('Reject failed: ' + error.message); return; }

    if (active.purpose === 'post_boost' || active.purpose === 'followers') {
      await supabase
        .from('boosts')
        .update({
          status: 'rejected',
          admin_note: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', active.id);
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'reject_payment', target_type: 'payment', target_id: active.id,
      details: { reason, mpesa_code: active.mpesa_code, purpose: active.purpose },
    });

    await supabase.from('notifications').insert({
      user_id: active.user_id, type: 'like', title: 'Payment rejected',
      body: reason, link: '/get-boosted',
    });

    setBusy(false);
    setActive(null);
    load();
  };

  const revoke = async () => {
    if (!active) return;
    if (!confirm("Revoke this payment's reward?")) return;
    setBusy(true);

    await supabase
      .from('payments')
      .update({ status: 'rejected', rejection_reason: 'Revoked by admin' })
      .eq('id', active.id);

    if (active.purpose === 'post_boost' || active.purpose === 'followers') {
      await supabase
        .from('boosts')
        .update({
          status: 'rejected',
          admin_note: 'Revoked by admin',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', active.id);
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'revoke_payment', target_type: 'payment', target_id: active.id,
    });

    setBusy(false);
    setActive(null);
    load();
  };

  const counts = {};
  STATUS_ROWS.forEach((r) => {
    counts[r.key] = r.key === 'all'
      ? items.length
      : items.filter((p) => p.status === r.key).length;
  });

  const rowItems = rowOpen === 'all'
    ? items
    : rowOpen
      ? items.filter((p) => p.status === rowOpen)
      : [];

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 28px', gap: 12,
      }}>
        <CreditCardIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Payments
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-3)',
          textAlign: 'center', maxWidth: 320, lineHeight: 1.5,
        }}>
          Review M-Pesa submissions · verify · followers · boosts
        </div>
      </div>

      {errMsg && (
        <div style={{ margin: '0 16px 12px', background: '#7f1d1d', color: '#fff', padding: 10, borderRadius: 8, fontSize: 13 }}>
          {errMsg}
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
                  {rowItems.length} {rowItems.length === 1 ? 'payment' : 'payments'}
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
                  onClick={() => openPayment(p)}
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
                    {p.profiles?.avatar_url ? (
                      <img src={p.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <UserIcon width={20} height={20} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.profiles?.full_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {purposeLabel(p.purpose, p.metadata)} · KSh {p.amount} · {timeAgo(p.created_at)}
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
              {/* Header */}
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
                  {active.profiles?.avatar_url ? (
                    <img src={active.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserIcon width={32} height={32} />
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>
                  {active.profiles?.full_name || 'Unknown'}
                </div>
                {active.profiles?.email && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
                    {active.profiles.email}
                  </div>
                )}
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

              {/* Details */}
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
                }}>
                  Payment details
                </div>
                <DetailRow label="Purpose" value={purposeLabel(active.purpose, active.metadata)} />
                <DetailRow label="Amount" value={`KSh ${active.amount}`} />
                <DetailRow label="M-Pesa code" value={active.mpesa_code || '—'} />
                <DetailRow label="Phone" value={active.phone || '—'} />
                <DetailRow label="Submitted" value={timeAgo(active.created_at)} />
                {active.rejection_reason && (
                  <DetailRow label="Reason" value={active.rejection_reason} />
                )}
              </div>

              {/* Reject reason input */}
              {active.status === 'pending' && (
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
                  }}>
                    Note (shown to user on rejection)
                  </div>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Optional — e.g. code not found, amount mismatch…"
                    maxLength={500}
                    style={{
                      width: '100%', minHeight: 80,
                      background: 'var(--surface-2)', border: 'none',
                      borderRadius: 14, padding: 14,
                      color: '#fff', fontSize: 14, lineHeight: 1.5,
                      outline: 'none', fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}

              {/* Actions */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {isAdmin && active.status === 'pending' && (
                  <>
                    <button
                      onClick={approve}
                      disabled={busy}
                      style={actionBtn('transparent', '#22c55e', '1.5px solid #22c55e')}
                    >
                      <CheckCircleIcon width={20} height={20} />
                      Approve
                    </button>
                    <button
                      onClick={reject}
                      disabled={busy}
                      style={actionBtn('var(--surface-2)', '#f97316')}
                    >
                      <XCircleIcon width={20} height={20} />
                      Reject
                    </button>
                  </>
                )}
                {isAdmin && active.status === 'approved' && (
                  <button
                    onClick={revoke}
                    disabled={busy}
                    style={actionBtn('transparent', 'var(--brand)', '1px solid var(--brand)')}
                  >
                    <BanIcon width={18} height={18} />
                    Revoke reward
                  </button>
                )}
                {isAdmin && active.status === 'rejected' && (
                  <button
                    onClick={approve}
                    disabled={busy}
                    style={actionBtn('transparent', '#22c55e', '1.5px solid #22c55e')}
                  >
                    <CheckCircleIcon width={20} height={20} />
                    Re-approve
                  </button>
                )}
                {active.status !== 'pending' && (
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
