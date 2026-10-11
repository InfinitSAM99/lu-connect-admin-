import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanIcon,
  TrashIcon,
  ClockIcon,
  XIcon,
  UserIcon,
} from '../components/Icons.jsx';

const CATEGORY_ROWS = [
  { key: 'identity', label: 'Identity pending', stages: ['identity_pending', 'identity_rejected', 'appeal_open'], color: '#eab308' },
  { key: 'appeal', label: 'Appeal submitted', stages: ['appeal_submitted'], color: '#3b82f6' },
  { key: 'approved', label: 'Approved', stages: ['unbanned'], color: '#22c55e' },
  { key: 'rejected', label: 'Rejected / Banned', stages: ['rejected_appeal', 'high_ban'], color: '#ef4444' },
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

export default function Appeals() {
  const { profile: me } = useAuth();
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rowOpen, setRowOpen] = useState(null);
  const [activeAppeal, setActiveAppeal] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});
  const [adminNote, setAdminNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ban_appeals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) { setErr(error.message); setLoading(false); return; }

    const userIds = [...new Set((data || []).map((a) => a.user_id).filter(Boolean))];
    let profileMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, email')
        .in('id', userIds);
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });
    }

    setAppeals((data || []).map((a) => ({ ...a, profile: profileMap[a.user_id] })));
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
    if (dragY > 100) setActiveAppeal(null);
    setDragY(0);
    activeRef.current = false;
  };

  const openAppeal = async (a) => {
    setActiveAppeal(a);
    setAdminNote(a.admin_note || '');
    setDragY(0);

    // Sign URLs for identity photos
    const urls = {};
    for (const path of a.identity_photos || []) {
      const { data } = await supabase.storage
        .from('appeals')
        .createSignedUrl(path, 3600);
      if (data?.signedUrl) urls[path] = data.signedUrl;
    }
    setSignedUrls(urls);
  };

  const updateStage = async (stage, note = null) => {
    if (!activeAppeal) return;
    setBusy(true);
    const updates = { stage, updated_at: new Date().toISOString() };
    if (note !== null) updates.admin_note = note;
    if (stage === 'unbanned' || stage === 'rejected_appeal' || stage === 'high_ban') {
      updates.reviewed_by = me?.id;
      updates.reviewed_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('ban_appeals')
      .update(updates)
      .eq('id', activeAppeal.id);
    setBusy(false);
    if (error) { alert(error.message); return; }
    setActiveAppeal(null);
    load();
  };

  const unbanUser = async () => {
    if (!activeAppeal?.profile?.id) return;
    setBusy(true);
    // Set profile to approved + stage to unbanned
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ approval_status: 'approved' })
      .eq('id', activeAppeal.profile.id);
    if (pErr) { setBusy(false); alert(pErr.message); return; }
    await updateStage('unbanned', adminNote);
    setBusy(false);
  };

  const highBan = async () => {
    if (!activeAppeal?.profile?.id) return;
    setBusy(true);
    await supabase
      .from('profiles')
      .update({ approval_status: 'high_ban' })
      .eq('id', activeAppeal.profile.id);
    await updateStage('high_ban', adminNote);
    setBusy(false);
  };

  const rejectAppeal = async () => {
    await updateStage('rejected_appeal', adminNote);
  };

  const approveIdentity = async () => {
    await updateStage('appeal_open', adminNote);
  };

  const rejectIdentity = async () => {
    await updateStage('identity_rejected', adminNote);
  };

  const deleteAppeal = async () => {
    if (!activeAppeal) return;
    if (!confirm('Delete this appeal permanently? All selfies will be wiped.')) return;
    setBusy(true);
    // Remove files from storage
    for (const path of activeAppeal.identity_photos || []) {
      await supabase.storage.from('appeals').remove([path]);
    }
    const { error } = await supabase
      .from('ban_appeals')
      .delete()
      .eq('id', activeAppeal.id);
    setBusy(false);
    if (error) { alert(error.message); return; }
    setActiveAppeal(null);
    load();
  };

  const counts = {};
  CATEGORY_ROWS.forEach((r) => {
    counts[r.key] = appeals.filter((a) => r.stages.includes(a.stage)).length;
  });

  const rowAppeals = rowOpen
    ? appeals.filter((a) => CATEGORY_ROWS.find((r) => r.key === rowOpen)?.stages.includes(a.stage))
    : [];

  return (
    <div style={{ paddingBottom: 100 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 24px 28px',
          gap: 12,
        }}
      >
        <ShieldCheckIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Appeals
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-3)',
            textAlign: 'center',
            maxWidth: 320,
            lineHeight: 1.5,
          }}
        >
          Review identity verifications and ban appeals
        </div>
      </div>

      {err && (
        <div style={{ margin: '0 16px 12px', background: '#7f1d1d', color: '#fff', padding: 10, borderRadius: 8, fontSize: 13 }}>
          {err}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)' }}>
        {CATEGORY_ROWS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRowOpen(r.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              width: '100%',
              padding: '20px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              color: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: r.color,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>{r.label}</span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: counts[r.key] > 0 ? '#fff' : 'var(--text-3)',
              }}
            >
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
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: '85vh',
              background: 'var(--surface)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              zIndex: 210,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'drawer-slide-up 250ms ease-out',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 0 6px',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.35)',
                }}
              />
            </div>

            <div
              style={{
                padding: '8px 20px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  background: CATEGORY_ROWS.find((r) => r.key === rowOpen)?.color || '#fff',
                }}
              />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  {CATEGORY_ROWS.find((r) => r.key === rowOpen)?.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {rowAppeals.length} {rowAppeals.length === 1 ? 'appeal' : 'appeals'}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setRowOpen(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  padding: 8,
                  cursor: 'pointer',
                }}
              >
                <XIcon width={22} height={22} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              {rowAppeals.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  Nothing here
                </div>
              )}
              {rowAppeals.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => openAppeal(a)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    width: '100%',
                    padding: '14px 20px',
                    background: 'transparent',
                    border: 'none',
                    borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: '1px solid var(--border)',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      background: 'var(--surface-2)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {a.profile?.avatar_url ? (
                      <img src={a.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <UserIcon width={20} height={20} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {a.profile?.full_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {a.stage} · {timeAgo(a.submitted_at || a.created_at)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ACTION DRAWER */}
      {activeAppeal && (
        <>
          <div
            onClick={() => setActiveAppeal(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: '92vh',
              background: 'var(--surface)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              zIndex: 310,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'drawer-slide-up 250ms ease-out',
              transform: `translateY(${dragY}px)`,
              transition: dragY === 0 ? 'transform 200ms ease-out' : 'none',
            }}
          >
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 0 6px',
                flexShrink: 0,
                touchAction: 'none',
                cursor: 'grab',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.35)',
                }}
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 28 }}>
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 20px 20px',
                  borderBottom: '1px solid var(--border)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    background: 'var(--surface-2)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {activeAppeal.profile?.avatar_url ? (
                    <img
                      src={activeAppeal.profile.avatar_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <UserIcon width={32} height={32} />
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>
                  {activeAppeal.profile?.full_name || 'Unknown'}
                </div>
                {activeAppeal.profile?.username && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
                    @{activeAppeal.profile.username}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#eab308',
                    marginTop: 8,
                    letterSpacing: 0.6,
                  }}
                >
                  {activeAppeal.stage.replace(/_/g, ' ')}
                </div>
                <button
                  onClick={() => setActiveAppeal(null)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 12,
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    padding: 8,
                    cursor: 'pointer',
                  }}
                >
                  <XIcon width={22} height={22} />
                </button>
              </div>

              {/* Identity selfies */}
              {(activeAppeal.identity_photos || []).length > 0 && (
                <div style={{ padding: '20px' }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-3)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      marginBottom: 12,
                    }}
                  >
                    Identity selfies
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {activeAppeal.identity_photos.map((path) => (
                      <a
                        key={path}
                        href={signedUrls[path] || '#'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          aspectRatio: '1 / 1',
                          borderRadius: 14,
                          background: 'var(--surface-2)',
                          overflow: 'hidden',
                          display: 'block',
                        }}
                      >
                        {signedUrls[path] ? (
                          <img
                            src={signedUrls[path]}
                            alt="selfie"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-3)',
                              fontSize: 12,
                            }}
                          >
                            Loading…
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
                    Tap a photo to open full size and compare with their profile picture.
                  </div>
                </div>
              )}

              {/* Appeal text */}
              {activeAppeal.appeal_text && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-3)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      marginBottom: 12,
                      marginTop: 20,
                    }}
                  >
                    Appeal from user
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: '#fff',
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {activeAppeal.appeal_text}
                  </div>
                </div>
              )}

              {/* Admin note */}
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 12,
                    marginTop: 20,
                  }}
                >
                  Admin note (visible to user)
                </div>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a note explaining your decision…"
                  maxLength={500}
                  style={{
                    width: '100%',
                    minHeight: 90,
                    background: 'var(--surface-2)',
                    border: 'none',
                    borderRadius: 14,
                    padding: 14,
                    color: '#fff',
                    fontSize: 14,
                    lineHeight: 1.5,
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* IDENTITY PENDING */}
                {(activeAppeal.stage === 'identity_pending') && (
                  <>
                    <button
                      onClick={approveIdentity}
                      disabled={busy}
                      style={actionBtn('transparent', '#22c55e', '1.5px solid #22c55e')}
                    >
                      <CheckCircleIcon width={20} height={20} />
                      Approve identity
                    </button>
                    <button
                      onClick={rejectIdentity}
                      disabled={busy}
                      style={actionBtn('var(--surface-2)', '#f97316')}
                    >
                      <XCircleIcon width={20} height={20} />
                      Reject identity — user can retry
                    </button>
                  </>
                )}

                {/* IDENTITY REJECTED */}
                {activeAppeal.stage === 'identity_rejected' && (
                  <div
                    style={{
                      padding: 14,
                      background: 'var(--surface-2)',
                      borderRadius: 12,
                      fontSize: 13,
                      color: 'var(--text-3)',
                      textAlign: 'center',
                    }}
                  >
                    Waiting on user to resubmit selfies
                  </div>
                )}

                {/* APPEAL OPEN (user writing) */}
                {activeAppeal.stage === 'appeal_open' && (
                  <div
                    style={{
                      padding: 14,
                      background: 'var(--surface-2)',
                      borderRadius: 12,
                      fontSize: 13,
                      color: 'var(--text-3)',
                      textAlign: 'center',
                    }}
                  >
                    Waiting on user to submit their appeal
                  </div>
                )}

                {/* APPEAL SUBMITTED */}
                {activeAppeal.stage === 'appeal_submitted' && (
                  <>
                    <button
                      onClick={unbanUser}
                      disabled={busy}
                      style={actionBtn('transparent', '#22c55e', '1.5px solid #22c55e')}
                    >
                      <CheckCircleIcon width={20} height={20} />
                      Unban — send terms to user
                    </button>
                    <button
                      onClick={rejectAppeal}
                      disabled={busy}
                      style={actionBtn('var(--surface-2)', '#f97316')}
                    >
                      <XCircleIcon width={20} height={20} />
                      Reject appeal
                    </button>
                    <button
                      onClick={highBan}
                      disabled={busy}
                      style={actionBtn('var(--brand)', '#fff')}
                    >
                      <BanIcon width={20} height={20} />
                      High ban — permanent
                    </button>
                  </>
                )}

                {/* FINAL STATES */}
                {(activeAppeal.stage === 'unbanned' ||
                  activeAppeal.stage === 'rejected_appeal' ||
                  activeAppeal.stage === 'high_ban') && (
                  <div
                    style={{
                      padding: 14,
                      background: 'var(--surface-2)',
                      borderRadius: 12,
                      fontSize: 13,
                      color: 'var(--text-3)',
                      textAlign: 'center',
                    }}
                  >
                    Final stage: {activeAppeal.stage.replace(/_/g, ' ')}
                  </div>
                )}

                {/* DELETE — always available */}
                <button
                  onClick={deleteAppeal}
                  disabled={busy}
                  style={actionBtn('transparent', 'var(--brand)', '1px solid var(--brand)')}
                >
                  <TrashIcon width={18} height={18} />
                  Delete appeal permanently
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const actionBtn = (bg, color, border) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '16px',
  background: bg,
  color,
  border: border || 'none',
  borderRadius: 14,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
});
