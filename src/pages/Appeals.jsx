import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  ShieldCheckIcon, CheckCircleIcon, XCircleIcon, BanIcon, TrashIcon, XIcon, UserIcon,
} from '../components/Icons.jsx';

const CATEGORY_ROWS = [
  { key: 'process',  label: 'In Process', stages: ['identity_pending', 'identity_rejected', 'appeal_open', 'appeal_submitted'], color: '#3b82f6' },
  { key: 'approved', label: 'Approved',   stages: ['unbanned'], color: '#22c55e' },
  { key: 'rejected', label: 'Rejected',   stages: ['rejected_appeal', 'high_ban'], color: '#ef4444' },
];

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
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
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, username, avatar_url, email').in('id', userIds);
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });
    }

    setAppeals((data || []).map((a) => ({ ...a, profile: profileMap[a.user_id] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAppeal = async (a) => {
    setActiveAppeal(a);
    setAdminNote(a.admin_note || '');

    const urls = {};
    for (const path of a.identity_photos || []) {
      const { data } = await supabase.storage.from('appeals').createSignedUrl(path, 3600);
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

    const { error } = await supabase.from('ban_appeals').update(updates).eq('id', activeAppeal.id);
    
    setBusy(false);
    if (error) { alert(error.message); return; }

    // 🔥 UPDATE LOCAL STATE INSTANTLY
    setActiveAppeal(prev => ({ ...prev, ...updates }));
    
    // Update local list so if you go back, it's already correct
    setAppeals(prev => prev.map(a => a.id === activeAppeal.id ? { ...a, ...updates } : a));
    
    // Refresh in background
    load();
  };

  const unbanUser = async () => {
    if (!activeAppeal?.profile?.id) return;
    setBusy(true);
    await supabase.from('profiles').update({ approval_status: 'approved' }).eq('id', activeAppeal.profile.id);
    await updateStage('unbanned', adminNote);
    setBusy(false);
  };

  const highBan = async () => {
    if (!activeAppeal?.profile?.id) return;
    setBusy(true);
    await supabase.from('profiles').update({ approval_status: 'high_ban' }).eq('id', activeAppeal.profile.id);
    await updateStage('high_ban', adminNote);
    setBusy(false);
  };

  const rejectAppeal = async () => { await updateStage('rejected_appeal', adminNote); };
  const approveIdentity = async () => { await updateStage('appeal_open', adminNote); };
  const rejectIdentity = async () => { await updateStage('identity_rejected', adminNote); };

  const deleteAppeal = async () => {
    if (!activeAppeal) return;
    if (!confirm('Delete this appeal permanently? All selfies will be wiped.')) return;
    setBusy(true);
    for (const path of activeAppeal.identity_photos || []) {
      await supabase.storage.from('appeals').remove([path]);
    }
    const { error } = await supabase.from('ban_appeals').delete().eq('id', activeAppeal.id);
    setBusy(false);
    if (error) { alert(error.message); return; }
    setActiveAppeal(null);
    load();
  };

  const counts = {};
  CATEGORY_ROWS.forEach((r) => { counts[r.key] = appeals.filter((a) => r.stages.includes(a.stage)).length; });
  const rowAppeals = rowOpen ? appeals.filter((a) => CATEGORY_ROWS.find((r) => r.key === rowOpen)?.stages.includes(a.stage)) : [];

  // --- DETAILED VIEW ---
  if (activeAppeal) {
    const s = activeAppeal.stage;
    const isIdentityDone = s !== 'identity_pending' && s !== 'identity_rejected';
    const isIdentityRejected = s === 'identity_rejected';
    const isAppealDone = s === 'unbanned' || s === 'rejected_appeal' || s === 'high_ban';
    const isAppealRejected = s === 'rejected_appeal' || s === 'high_ban';
    const isAppealSubmitted = s === 'appeal_submitted' || isAppealDone;

    return (
      <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
        {/* 🔥 STICKY TOP BAR WITH LOADER */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#000', padding: '16px 20px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', gap: 12 }}>
          {busy && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#1f1f1f', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '50%', background: '#ef4444', animation: 'slide 1s infinite linear' }} />
            </div>
          )}
          
          <button onClick={() => setActiveAppeal(null)} style={{ background: 'transparent', border: 'none', color: '#fff', padding: 4, cursor: 'pointer' }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>Appeal Details</div>
            <div style={{ color: '#6d7382', fontSize: 12, marginTop: 2 }}>{activeAppeal.stage.replace(/_/g, ' ')}</div>
          </div>
        </div>

        {/* User Card */}
        <div style={{ padding: 20, borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
              {activeAppeal.profile?.avatar_url ? <img src={activeAppeal.profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon width={24} height={24} color="#6d7382" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{activeAppeal.profile?.full_name || 'Unknown'}</div>
              <div style={{ color: '#6d7382', fontSize: 12, marginTop: 2 }}>@{activeAppeal.profile?.username || 'user'}</div>
            </div>
          </div>
        </div>

        {/* VERTICAL STEPPER */}
        <div style={{ padding: '20px 24px' }}>
          
          {/* Step 1 */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#22c55e' }}>
                <CheckCircleIcon width={16} height={16} color="#000" />
              </div>
              <div style={{ width: 2, height: 40, background: '#22c55e', marginTop: 4 }} />
            </div>
            <div style={{ flex: 1, paddingBottom: 20 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Identity Submitted</div>
              <div style={{ color: '#6d7382', fontSize: 13, marginTop: 4 }}>User uploaded selfies for verification</div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isIdentityRejected ? '#ef4444' : isIdentityDone ? '#22c55e' : '#3b82f6' }}>
                {isIdentityRejected ? <XCircleIcon width={16} height={16} color="#000" /> : isIdentityDone ? <CheckCircleIcon width={16} height={16} color="#000" /> : <div style={{ width: 8, height: 8, borderRadius: 4, background: '#000' }} />}
              </div>
              <div style={{ width: 2, height: 40, background: isIdentityDone ? '#22c55e' : '#1f1f1f', marginTop: 4 }} />
            </div>
            <div style={{ flex: 1, paddingBottom: 20 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Identity Verified</div>
              <div style={{ color: '#6d7382', fontSize: 13, marginTop: 4, marginBottom: 12 }}>
                {isIdentityRejected ? 'Rejected — waiting for retry' : isIdentityDone ? 'Selfies approved by admin' : 'Pending review'}
              </div>

              {(activeAppeal.identity_photos || []).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {activeAppeal.identity_photos.map((path) => (
                    <a key={path} href={signedUrls[path] || '#'} target="_blank" rel="noreferrer" style={{ aspectRatio: '1 / 1', borderRadius: 14, background: '#1a1a1a', overflow: 'hidden', display: 'block' }}>
                      {signedUrls[path] ? <img src={signedUrls[path]} alt="selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d7382', fontSize: 12 }}>Loading…</div>}
                    </a>
                  ))}
                </div>
              )}

              {s === 'identity_pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <button onClick={approveIdentity} disabled={busy} style={smallBtn('transparent', '#22c55e', '1px solid #22c55e')}><CheckCircleIcon width={16} height={16} /> Approve identity</button>
                  <button onClick={rejectIdentity} disabled={busy} style={smallBtn('#111', '#f97316')}><XCircleIcon width={16} height={16} /> Reject — user can retry</button>
                </div>
              )}
              {s === 'identity_rejected' && <div style={stateBox}>Waiting on user to resubmit selfies</div>}
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isAppealSubmitted ? '#22c55e' : '#1f1f1f' }}>
                {isAppealSubmitted ? <CheckCircleIcon width={16} height={16} color="#000" /> : <div style={{ width: 8, height: 8, borderRadius: 4, background: '#6d7382' }} />}
              </div>
              <div style={{ width: 2, height: 40, background: isAppealSubmitted ? '#22c55e' : '#1f1f1f', marginTop: 4 }} />
            </div>
            <div style={{ flex: 1, paddingBottom: 20 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Appeal Submitted</div>
              <div style={{ color: '#6d7382', fontSize: 13, marginTop: 4, marginBottom: 12 }}>
                {isAppealSubmitted ? 'User has written their appeal' : 'Waiting for user to submit'}
              </div>

              {isAppealSubmitted && activeAppeal.appeal_text && (
                <div style={{ background: '#111', borderRadius: 12, padding: 14, fontSize: 14, color: '#fff', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 }}>
                  {activeAppeal.appeal_text}
                </div>
              )}

              {s === 'appeal_submitted' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <button onClick={unbanUser} disabled={busy} style={smallBtn('transparent', '#22c55e', '1px solid #22c55e')}><CheckCircleIcon width={16} height={16} /> Unban — send terms</button>
                  <button onClick={rejectAppeal} disabled={busy} style={smallBtn('#111', '#f97316')}><XCircleIcon width={16} height={16} /> Reject appeal</button>
                  <button onClick={highBan} disabled={busy} style={smallBtn('#ef4444', '#fff')}><BanIcon width={16} height={16} /> High ban — permanent</button>
                </div>
              )}
              {s === 'appeal_open' && <div style={stateBox}>Waiting on user to submit their appeal</div>}
            </div>
          </div>

          {/* Step 4 */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isAppealRejected ? '#ef4444' : s === 'unbanned' ? '#22c55e' : '#1f1f1f' }}>
                {isAppealRejected ? <XCircleIcon width={16} height={16} color="#000" /> : s === 'unbanned' ? <CheckCircleIcon width={16} height={16} color="#000" /> : <div style={{ width: 8, height: 8, borderRadius: 4, background: '#6d7382' }} />}
              </div>
            </div>
            <div style={{ flex: 1, paddingBottom: 20 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Final Decision</div>
              <div style={{ color: '#6d7382', fontSize: 13, marginTop: 4 }}>
                {s === 'unbanned' ? 'Approved & unbanned' : isAppealRejected ? 'Rejected / Permanently banned' : 'Pending review'}
              </div>
            </div>
          </div>

        </div>

        {/* Admin note */}
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6d7382', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginTop: 20 }}>Admin note (visible to user)</div>
          <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Add a note explaining your decision…" maxLength={500} style={{ width: '100%', minHeight: 90, background: '#111', border: '1px solid #333', borderRadius: 14, padding: 14, color: '#fff', fontSize: 14, lineHeight: 1.5, outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
        </div>

        {/* Delete */}
        <div style={{ padding: '0 20px' }}>
          <button onClick={deleteAppeal} disabled={busy} style={actionBtn('transparent', '#ef4444', '1px solid #ef4444')}><TrashIcon width={18} height={18} />Delete appeal permanently</button>
        </div>

        {/* Styles for loader animation */}
        <style>{`
          @keyframes slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  // --- MAIN LIST VIEW ---
  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 28px', gap: 12 }}>
        <ShieldCheckIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>Appeals</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>Review identity verifications and ban appeals</div>
      </div>

      {err && <div style={{ margin: '0 16px 12px', background: '#7f1d1d', color: '#fff', padding: 10, borderRadius: 8, fontSize: 13 }}>{err}</div>}

      <div style={{ borderTop: '1px solid var(--border)' }}>
        {CATEGORY_ROWS.map((r) => (
          <button key={r.key} onClick={() => setRowOpen(r.key)} style={{ display: 'flex', alignItems: 'center', gap: 18, width: '100%', padding: '20px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: r.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>{r.label}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: counts[r.key] > 0 ? '#fff' : 'var(--text-3)' }}>{counts[r.key]}</span>
            <span style={{ display: 'inline-flex', color: 'var(--text-3)', opacity: 0.5 }}><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></span>
          </button>
        ))}
      </div>

      {loading && <div className="state">Loading…</div>}

      {rowOpen && (
        <>
          <div onClick={() => setRowOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 }} />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: '80vh', background: '#0a0a0a', borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 210, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}><div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} /></div>
            <div style={{ padding: '8px 20px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: CATEGORY_ROWS.find((r) => r.key === rowOpen)?.color || '#fff' }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{CATEGORY_ROWS.find((r) => r.key === rowOpen)?.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{rowAppeals.length} appeals</div>
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setRowOpen(null)} style={{ background: 'transparent', border: 'none', color: '#fff', padding: 8, cursor: 'pointer' }}><XIcon width={22} height={22} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {rowAppeals.length === 0 && <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Nothing here</div>}
              {rowAppeals.map((a, i) => (
                <button key={a.id} onClick={() => { openAppeal(a); setRowOpen(null); }} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 20px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                    {a.profile?.avatar_url ? <img src={a.profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon width={20} height={20} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{a.profile?.full_name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{a.stage.replace(/_/g, ' ')} · {timeAgo(a.submitted_at || a.created_at)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const actionBtn = (bg, color, border) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '16px', background: bg, color, border: border || 'none', borderRadius: 14,
  fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
});

const smallBtn = (bg, color, border) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '10px 14px', background: bg, color, border: border || 'none', borderRadius: 10,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%',
});

const stateBox = {
  padding: 14, background: '#111', borderRadius: 12, fontSize: 13, color: '#6d7382', textAlign: 'center'
};
