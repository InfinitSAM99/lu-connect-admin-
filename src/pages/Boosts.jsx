import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  RocketIcon, CheckCircleIcon, XCircleIcon, XIcon, UserIcon, ImageIcon,
} from '../components/Icons.jsx';

const STATUS_ROWS = [
  { key: 'active',    label: 'Delivering', color: '#3b82f6' },
  { key: 'completed', label: 'Completed',  color: '#22c55e' },
  { key: 'rejected',  label: 'Rejected',   color: '#ef4444' },
];

const CATEGORY_LABELS = {
  likes:     'Likes',
  comments:  'Comments',
  views:     'Views',
  followers: 'Followers',
  post:      'Boost duration',
  bundle:    'Campus Famous',
};

export default function Boosts() {
  const { profile: me } = useAuth();
  const [boosts, setBoosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  
  const [rowOpen, setRowOpen] = useState(null);
  const [active, setActive] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [busy, setBusy] = useState(false);

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
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, username, avatar_url, email').in('id', userIds);
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });
    }

    let postMap = {};
    if (postIds.length > 0) {
      const { data: posts } = await supabase.from('posts').select('id, content, created_at, post_media(media_url)').in('id', postIds);
      (posts || []).forEach((p) => { postMap[p.id] = p; });
    }

    setBoosts((data || []).map((b) => ({
      ...b,
      profile: profileMap[b.user_id],
      post: postMap[b.post_id],
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openBoost = (b) => {
    setActive(b);
    setAdminNote(b.admin_note || '');
  };

  const approve = async () => {
    if (!active) return;
    setBusy(true);
    const now = new Date();
    const expires = new Date(now.getTime() + (active.delivery_days || 5) * 86400000);

    const { error } = await supabase.from('boosts').update({
      status: 'active', started_at: now.toISOString(), expires_at: expires.toISOString(),
      admin_note: adminNote || null, updated_at: now.toISOString(),
    }).eq('id', active.id);

    if (error) { setBusy(false); alert(error.message); return; }

    if (active.post_id) {
      const postUpdate = { boost_paid: true };
      if (['post', 'bundle', 'likes', 'comments', 'views'].includes(active.category)) {
        postUpdate.boosted_until = expires.toISOString();
      }
      await supabase.from('posts').update(postUpdate).eq('id', active.post_id);
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'approve_boost', target_type: 'boost', target_id: active.id,
      details: { user: active.profile?.email, category: active.category, quantity: active.quantity, amount: active.amount_ksh, mpesa_code: active.mpesa_code },
    });

    await supabase.from('notifications').insert({
      user_id: active.user_id, type: 'like', title: 'Boost approved',
      body: `Your ${CATEGORY_LABELS[active.category] || active.category} boost is now delivering.`, link: '/get-boosted',
    });

    setBusy(false); setActive(null); load();
  };

  const reject = async () => {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase.from('boosts').update({
      status: 'rejected', admin_note: adminNote || null, updated_at: new Date().toISOString(),
    }).eq('id', active.id);
    if (error) { setBusy(false); alert(error.message); return; }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'reject_boost', target_type: 'boost', target_id: active.id,
      details: { note: adminNote, mpesa_code: active.mpesa_code },
    });

    await supabase.from('notifications').insert({
      user_id: active.user_id, type: 'like', title: 'Boost rejected',
      body: adminNote || 'Your boost could not be verified.', link: '/get-boosted',
    });

    setBusy(false); setActive(null); load();
  };

  const counts = {};
  STATUS_ROWS.forEach((r) => { counts[r.key] = boosts.filter((b) => b.status === r.key).length; });
  const rowBoosts = rowOpen ? boosts.filter((b) => b.status === rowOpen) : [];

  // --- SINGLE BOOST VIEW (VERTICAL STEPPER) ---
  if (active) {
    const pct = active.quantity ? Math.min(100, Math.round((active.delivered / active.quantity) * 100)) : 0;
    const isCompleted = active.status === 'completed' || pct >= 100;
    const isRejected = active.status === 'rejected';

    const steps = [
      { label: 'Payment Received', desc: active.mpesa_code ? `Code: ${active.mpesa_code} · KSh ${active.amount_ksh}` : `KSh ${active.amount_ksh}`, state: 'done' },
      { label: 'Admin Approved', desc: `Approved by ${me?.full_name || 'Admin'}`, state: 'done' },
      { 
        label: active.category === 'followers' ? 'Followers Delivering' : 'Boost Delivering', 
        desc: `${active.delivered || 0} / ${active.quantity || 0} (${pct}%)`, 
        state: isCompleted ? 'done' : isRejected ? 'rejected' : 'current' 
      },
      { label: 'Delivery Complete', desc: isCompleted ? 'Package fully delivered' : 'Pending', state: isCompleted ? 'done' : 'pending' },
    ];

    return (
      <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#000', padding: '16px 20px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setActive(null)} style={{ background: 'transparent', border: 'none', color: '#fff', padding: 4, cursor: 'pointer' }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>Boost Delivery Flow</div>
            <div style={{ color: '#6d7382', fontSize: 12, marginTop: 2 }}>{CATEGORY_LABELS[active.category]} · {active.quantity?.toLocaleString()} units</div>
          </div>
        </div>

        {/* User Card */}
        <div style={{ padding: 20, borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
              {active.profile?.avatar_url ? (
                <img src={active.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserIcon width={24} height={24} color="#6d7382" /></div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{active.profile?.full_name || 'Unknown'}</div>
              <div style={{ color: '#6d7382', fontSize: 12, marginTop: 2 }}>@{active.profile?.username || 'user'}</div>
            </div>
            <div style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: STATUS_ROWS.find(r => r.key === active.status)?.color || '#fff', background: `${STATUS_ROWS.find(r => r.key === active.status)?.color || '#6d7382'}15` }}>
              {active.status}
            </div>
          </div>
        </div>

        {/* Vertical Stepper */}
        <div style={{ padding: '20px 24px' }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: step.state === 'done' ? '#22c55e' : step.state === 'current' ? '#3b82f6' : step.state === 'rejected' ? '#ef4444' : '#1f1f1f' }}>
                  {step.state === 'done' ? <CheckCircleIcon width={16} height={16} color="#000" /> : step.state === 'current' ? <div style={{ width: 8, height: 8, borderRadius: 4, background: '#000', animation: 'pulse 1.5s infinite' }} /> : step.state === 'rejected' ? <XCircleIcon width={16} height={16} color="#000" /> : <div style={{ width: 8, height: 8, borderRadius: 4, background: '#6d7382' }} />}
                </div>
                {i < steps.length - 1 && <div style={{ width: 2, height: 50, background: step.state === 'done' ? '#22c55e' : '#1f1f1f', marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: 30 }}>
                <div style={{ color: step.state === 'pending' ? '#6d7382' : '#fff', fontSize: 15, fontWeight: 700 }}>{step.label}</div>
                <div style={{ color: '#6d7382', fontSize: 13, marginTop: 4 }}>{step.desc}</div>
                {step.state === 'current' && (
                  <div style={{ marginTop: 10, height: 6, background: '#1f1f1f', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', transition: 'width 0.5s' }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- MAIN LIST VIEW ---
  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 28px', gap: 12 }}>
        <RocketIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>Boosts</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>Approve and track boost deliveries</div>
      </div>

      {err && <div style={{ margin: '0 16px 12px', background: '#7f1d1d', color: '#fff', padding: 10, borderRadius: 8, fontSize: 13 }}>{err}</div>}

      <div style={{ borderTop: '1px solid var(--border)' }}>
        {STATUS_ROWS.map((r) => (
          <button key={r.key} onClick={() => setRowOpen(r.key)} style={{ display: 'flex', alignItems: 'center', gap: 18, width: '100%', padding: '20px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: r.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>{r.label}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: counts[r.key] > 0 ? '#fff' : 'var(--text-3)' }}>{counts[r.key]}</span>
            <span style={{ display: 'inline-flex', color: 'var(--text-3)', opacity: 0.5 }}><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></span>
          </button>
        ))}
      </div>

      {loading && <div className="state">Loading…</div>}

      {/* LIST OF BOOSTS FOR SELECTED CATEGORY */}
      {rowOpen && (
        <>
          <div onClick={() => setRowOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 }} />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: '80vh', background: '#0a0a0a', borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 210, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}><div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} /></div>
            <div style={{ padding: '8px 20px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: STATUS_ROWS.find((r) => r.key === rowOpen)?.color || '#fff' }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{STATUS_ROWS.find((r) => r.key === rowOpen)?.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{rowBoosts.length} boosts</div>
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setRowOpen(null)} style={{ background: 'transparent', border: 'none', color: '#fff', padding: 8, cursor: 'pointer' }}><XIcon width={22} height={22} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {rowBoosts.map((b) => (
                <button key={b.id} onClick={() => { openBoost(b); setRowOpen(null); }} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                    {b.profile?.avatar_url ? <img src={b.profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon width={20} height={20} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{b.profile?.full_name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{CATEGORY_LABELS[b.category]}</div>
                  </div>
                  <div style={{ color: '#3b82f6', fontWeight: 700 }}>{Math.round((b.delivered / b.quantity) * 100)}%</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

<style>
  {`@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }`}
</style>
