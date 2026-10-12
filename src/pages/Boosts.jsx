import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  RocketIcon,
  CheckCircleIcon,
  XCircleIcon,
  XIcon,
  UserIcon,
  ImageIcon,
} from '../components/Icons.jsx';

const STATUS_ROWS = [
  { key: 'pending',     label: 'Pending review',  color: '#eab308' },
  { key: 'active',      label: 'Delivering',      color: '#3b82f6' },
  { key: 'completed',   label: 'Completed',       color: '#22c55e' },
  { key: 'rejected',    label: 'Rejected',        color: '#ef4444' },
];

const CATEGORY_LABELS = {
  likes:     'Likes',
  comments:  'Comments',
  views:     'Views',
  followers: 'Followers',
  post:      'Boost duration',
  bundle:    'Campus Famous',
};

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString();
}

export default function Boosts() {
  const { profile: me } = useAuth();
  const [boosts, setBoosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rowOpen, setRowOpen] = useState(null);
  const [active, setActive] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [postPreviews, setPostPreviews] = useState({});
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('boosts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) { setErr(error.message); setLoading(false); return; }

    const userIds = [...new Set((data || []).map((b) => b.user_id).filter(Boolean))];
    const postIds = [...new Set((data || []).map((b) => b.post_id).filter(Boolean))];

    let profileMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, email')
        .in('id', userIds);
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });
    }

    let postMap = {};
    if (postIds.length > 0) {
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content, created_at, post_media(media_url)')
        .in('id', postIds);
      (posts || []).forEach((p) => { postMap[p.id] = p; });
    }

    setPostPreviews(postMap);
    setBoosts((data || []).map((b) => ({
      ...b,
      profile: profileMap[b.user_id],
      post: postMap[b.post_id],
    })));
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

  const openBoost = (b) => {
    setActive(b);
    setAdminNote(b.admin_note || '');
    setDragY(0);
  };

  const approve = async () => {
    if (!active) return;
    setBusy(true);
    const now = new Date();
    const expires = new Date(now.getTime() + (active.delivery_days || 5) * 86400000);

    const { error } = await supabase
      .from('boosts')
      .update({
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
        admin_note: adminNote || null,
        updated_at: now.toISOString(),
      })
      .eq('id', active.id);

    if (error) { setBusy(false); alert(error.message); return; }

    // For post-category boosts, sync posts.boosted_until + boost_paid
    if (active.post_id) {
      const postUpdate = { boost_paid: true };
      if (['post', 'bundle', 'likes', 'comments', 'views'].includes(active.category)) {
        postUpdate.boosted_until = expires.toISOString();
      }
      await supabase.from('posts').update(postUpdate).eq('id', active.post_id);
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'approve_boost',
      target_type: 'boost',
      target_id: active.id,
      details: {
        user: active.profile?.email,
        category: active.category,
        quantity: active.quantity,
        amount: active.amount_ksh,
        mpesa_code: active.mpesa_code,
      },
    });

    await supabase.from('notifications').insert({
      user_id: active.user_id,
      type: 'like',
      title: 'Boost approved',
      body: `Your ${CATEGORY_LABELS[active.category] || active.category} boost is now delivering.`,
      link: '/get-boosted',
    });

    setBusy(false);
    setActive(null);
    load();
  };

  const reject = async () => {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase
      .from('boosts')
      .update({
        status: 'rejected',
        admin_note: adminNote || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', active.id);
    if (error) { setBusy(false); alert(error.message); return; }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'reject_boost',
      target_type: 'boost',
      target_id: active.id,
      details: { note: adminNote, mpesa_code: active.mpesa_code },
    });

    await supabase.from('notifications').insert({
      user_id: active.user_id,
      type: 'like',
      title: 'Boost rejected',
      body: adminNote || 'Your boost could not be verified.',
      link: '/get-boosted',
    });

    setBusy(false);
    setActive(null);
    load();
  };

  const counts = {};
  STATUS_ROWS.forEach((r) => { counts[r.key] = boosts.filter((b) => b.status === r.key).length; });

  const rowBoosts = rowOpen ? boosts.filter((b) => b.status === rowOpen) : [];

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 28px', gap: 12,
      }}>
        <RocketIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Boosts
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-3)',
          textAlign: 'center', maxWidth: 320, lineHeight: 1.5,
        }}>
          Approve and track boost deliveries
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
                  {rowBoosts.length} {rowBoosts.length === 1 ? 'boost' : 'boosts'}
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
              {rowBoosts.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  Nothing here
                </div>
              )}
              {rowBoosts.map((b, i) => {
                const pct = b.quantity ? Math.min(100, Math.round((b.delivered / b.quantity) * 100)) : 0;
                return (
                  <button
                    key={b.id}
                    onClick={() => openBoost(b)}
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
                      {b.profile?.avatar_url ? (
                        <img src={b.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <UserIcon width={20} height={20} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.profile?.full_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        {CATEGORY_LABELS[b.category] || b.category}
                        {b.status === 'active' && ` · ${b.delivered}/${b.quantity}`}
                        {b.status === 'pending' && ` · KSh ${b.amount_ksh}`}
                        {b.status === 'completed' && ` · done`}
                      </div>
                    </div>
                    {b.status === 'active' && (
                      <div style={{
                        width: 34, height: 34, borderRadius: 17,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700,
                        color: '#3b82f6', border: '2px solid #3b82f6',
                      }}>
                        {pct}%
                      </div>
                    )}
                  </button>
                );
              })}
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
                  {active.profile?.avatar_url ? (
                    <img src={active.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserIcon width={32} height={32} />
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>
                  {active.profile?.full_name || 'Unknown'}
                </div>
                {active.profile?.username && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
                    @{active.profile.username}
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

              {/* Package details */}
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
                }}>
                  Package
                </div>
                <DetailRow label="Category" value={CATEGORY_LABELS[active.category] || active.category} />
                <DetailRow label="Quantity" value={active.quantity?.toLocaleString() || '—'} />
                <DetailRow label="Duration" value={`${active.delivery_days || 5} days`} />
                <DetailRow label="Amount" value={`KSh ${active.amount_ksh || 0}`} />
                <DetailRow label="M-Pesa" value={active.mpesa_code || '—'} />
                <DetailRow label="Phone" value={active.phone || '—'} />
                {active.status !== 'pending' && (
                  <DetailRow
                    label="Delivered"
                    value={`${active.delivered || 0} / ${active.quantity || 0}`}
                  />
                )}
              </div>

              {/* Post preview */}
              {active.post_id && active.post && (
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
                  }}>
                    Target post
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {active.post.post_media?.[0]?.media_url ? (
                      <img
                        src={active.post.post_media[0].media_url}
                        alt=""
                        style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: 56, height: 56, borderRadius: 10,
                        background: 'var(--surface-2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, color: 'var(--text-3)',
                      }}>
                        <ImageIcon width={22} height={22} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, color: '#fff', lineHeight: 1.4,
                        display: '-webkit-box', WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {active.post.content || '(media only)'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                        {new Date(active.post.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress (if delivering) */}
              {active.status === 'active' && (
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
                  }}>
                    Delivery progress
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#fff', marginBottom: 8 }}>
                    <span>{active.delivered || 0} delivered</span>
                    <span style={{ color: 'var(--text-3)' }}>{active.quantity} total</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, ((active.delivered || 0) / (active.quantity || 1)) * 100)}%`,
                      background: '#3b82f6',
                      transition: 'width 300ms',
                    }} />
                  </div>
                  {active.expires_at && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
                      Expires {new Date(active.expires_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}

              {/* Admin note */}
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
                }}>
                  Admin note (visible to user)
                </div>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a note explaining your decision…"
                  maxLength={500}
                  style={{
                    width: '100%', minHeight: 90,
                    background: 'var(--surface-2)', border: 'none',
                    borderRadius: 14, padding: 14,
                    color: '#fff', fontSize: 14, lineHeight: 1.5,
                    outline: 'none', fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {active.status === 'pending' && (
                  <>
                    <button
                      onClick={approve}
                      disabled={busy}
                      style={actionBtn('transparent', '#22c55e', '1.5px solid #22c55e')}
                    >
                      <CheckCircleIcon width={20} height={20} />
                      Approve & start delivery
                    </button>
                    <button
                      onClick={reject}
                      disabled={busy}
                      style={actionBtn('var(--surface-2)', '#f97316')}
                    >
                      <XCircleIcon width={20} height={20} />
                      Reject boost
                    </button>
                  </>
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
