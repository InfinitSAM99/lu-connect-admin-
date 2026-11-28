import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import VerticalStepper from '../components/VerticalStepper';
import {
  CreditCardIcon, CheckCircleIcon, UserIcon,
  ChevronRightIcon,
} from '../components/Icons.jsx';

const STATUS_TABS = [
  { key: 'pending',  label: 'Pending',  color: '#f59e0b' },
  { key: 'approved', label: 'Approved', color: '#22c55e' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444' },
  { key: 'all',      label: 'All',      color: '#6d7382' },
];

const PURPOSE_LABELS = {
  verify:     'Verification',
  post_boost: 'Post Boost',
  followers:  'Follower Package',
};

const CATEGORY_LABELS = {
  likes: 'Likes', comments: 'Comments', views: 'Views',
  followers: 'Followers', post: 'Duration', bundle: 'Campus Famous',
};

function purposeLabel(purpose, metadata) {
  if (purpose === 'followers') return `Followers · +${(metadata?.followers || 0).toLocaleString()}`;
  if (purpose === 'post_boost') {
    const cat = metadata?.category;
    const qty = metadata?.quantity;
    if (cat && CATEGORY_LABELS[cat]) return `Boost · ${CATEGORY_LABELS[cat]}${qty ? ` · ${qty.toLocaleString()}` : ''}`;
    return 'Post Boost';
  }
  return PURPOSE_LABELS[purpose] || purpose;
}

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString();
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Payments() {
  const { profile: me } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [active, setActive] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);

  // 0 = nothing checked. 1 = payment checked. 2 = user request checked. 3 = admin review.
  const [reviewProgress, setReviewProgress] = useState(0);
  
  // 🔥 NEW: Real-time boost state
  const [liveBoost, setLiveBoost] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*, profiles:user_id(id, full_name, email, avatar_url, is_verified)')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) setErrMsg(error.message);
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // 🔥 NEW: Fetch and subscribe to the linked boost
  useEffect(() => {
    if (!active) return;

    const fetchLiveBoost = async () => {
      const { data } = await supabase.from('boosts').select('*').eq('payment_id', active.id).maybeSingle();
      setLiveBoost(data);
    };
    fetchLiveBoost();

    const channel = supabase.channel(`payment-boost-${active.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'boosts', filter: `payment_id=eq.${active.id}` }, (payload) => {
        setLiveBoost(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [active]);

  const openPayment = (p) => {
    setActive(p);
    setRejectReason('');
    setShowRejectInput(false);
    setLiveBoost(null);
    // If already approved/rejected, we show all steps done.
    // If pending, we start at 0 (nothing checked).
    setReviewProgress(p.status === 'pending' ? 0 : 3);
  };

  const closeDetail = () => {
    setActive(null);
    setRejectReason('');
    setShowRejectInput(false);
    setLiveBoost(null);
  };

  const approveLinkedBoost = async (payment) => {
    if (payment.purpose !== 'post_boost' && payment.purpose !== 'followers') return { ok: true };
    const { data: found } = await supabase.from('boosts').select('id, post_id, category, duration_days, delivery_days').eq('payment_id', payment.id).maybeSingle();

    if (!found) {
      const meta = payment.metadata || {};
      const postId = meta.post_id;
      const category = meta.category || 'followers';
      const quantity = Number(meta.quantity || 0);
      const durationDays = Number(meta.duration_days || 5);
      const packageId = meta.package_id || `${category}_${quantity}`;
      if (!postId && category !== 'followers') return { ok: false, msg: 'Missing post_id' };
      const { error: createErr } = await supabase.from('boosts').insert({
        user_id: payment.user_id, payment_id: payment.id, post_id: postId || null,
        category, quantity, package_id: packageId, amount_ksh: payment.amount || 0,
        duration_days: durationDays, delivery_days: durationDays, delivered: 0, status: 'pending',
      });
      if (createErr) return { ok: false, msg: createErr.message };
      if (postId) await supabase.from('posts').update({ boost_paid: true }).eq('id', postId);
      return { ok: true };
    }

    const now = new Date();
    const days = found.duration_days || found.delivery_days || 5;
    const expires = new Date(now.getTime() + days * 86400000);
    const { error: boostErr } = await supabase.from('boosts').update({
      status: 'active', started_at: now.toISOString(),
      expires_at: expires.toISOString(), updated_at: now.toISOString(),
    }).eq('id', found.id);
    if (boostErr) return { ok: false, msg: boostErr.message };
    if (found.post_id) {
      const upd = { boost_paid: true };
      if (['post', 'bundle', 'likes', 'comments', 'views'].includes(found.category)) {
        upd.boosted_until = expires.toISOString();
      }
      await supabase.from('posts').update(upd).eq('id', found.post_id);
    }
    return { ok: true };
  };

  const approve = async () => {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase.from('payments').update({
      status: 'approved', reviewed_by: me.id, reviewed_at: new Date().toISOString(),
    }).eq('id', active.id);
    if (error) { setBusy(false); alert('Approve failed: ' + error.message); return; }

    const boostRes = await approveLinkedBoost(active);
    if (!boostRes.ok) alert('Approved but boost update failed: ' + boostRes.msg);

    if (active.purpose === 'verify') {
      await supabase.from('profiles').update({ is_verified: true, verified_at: new Date().toISOString() }).eq('id', active.user_id);
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'approve_payment', target_type: 'payment', target_id: active.id,
      details: { mpesa_code: active.mpesa_code, amount: active.amount, purpose: active.purpose, user_email: active.profiles?.email },
    });

    let title = 'Payment approved';
    let body = 'Your payment was reviewed and approved.';
    if (active.purpose === 'verify') { title = 'You are now verified!'; body = 'Your account shows the blue checkmark.'; }
    else if (active.purpose === 'followers') { title = `+${(active.metadata?.followers || 0).toLocaleString()} followers added!`; body = 'Your follower boost is now delivering.'; }
    else if (active.purpose === 'post_boost') { title = 'Boost approved!'; body = 'Your post boost is now delivering.'; }
    await supabase.from('notifications').insert({ user_id: active.user_id, type: 'like', title, body, link: active.purpose === 'verify' ? `/profile/${active.user_id}` : '/get-boosted' });

    setBusy(false);
    setReviewProgress(3);
    // Update the active payment object in state so the UI immediately shows APPROVED
    setActive({ ...active, status: 'approved', reviewed_at: new Date().toISOString() });
    load();
  };

  const reject = async () => {
    if (!active) return;
    setBusy(true);
    const reason = rejectReason.trim() || 'Payment could not be verified';
    const { error } = await supabase.from('payments').update({
      status: 'rejected', rejection_reason: reason, reviewed_by: me.id, reviewed_at: new Date().toISOString(),
    }).eq('id', active.id);
    if (error) { setBusy(false); alert('Reject failed: ' + error.message); return; }

    if (active.purpose === 'post_boost' || active.purpose === 'followers') {
      await supabase.from('boosts').update({ status: 'rejected', admin_note: reason, updated_at: new Date().toISOString() }).eq('payment_id', active.id);
    }
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'reject_payment', target_type: 'payment', target_id: active.id,
      details: { reason, mpesa_code: active.mpesa_code, purpose: active.purpose },
    });
    await supabase.from('notifications').insert({ user_id: active.user_id, type: 'like', title: 'Payment rejected', body: reason, link: '/get-boosted' });

    setBusy(false);
    closeDetail();
    load();
  };

  const filtered = activeTab === 'all' ? items : items.filter(p => p.status === activeTab);
  const counts = {
    pending: items.filter(p => p.status === 'pending').length,
    approved: items.filter(p => p.status === 'approved').length,
    rejected: items.filter(p => p.status === 'rejected').length,
    all: items.length,
  };

  if (active) {
    const isApproved = active.status === 'approved';
    const isRejected = active.status === 'rejected';
    const isPending = active.status === 'pending';

    const steps = [];

    // Step 1: Payment Received
    steps.push({
      label: 'Payment Received',
      description: 'M-Pesa transaction confirmed',
      detail: active.mpesa_code ? `Code: ${active.mpesa_code} · KSh ${active.amount}` : `KSh ${active.amount}`,
      state: reviewProgress >= 1 || isApproved || isRejected ? 'done' : 'current',
      onAction: reviewProgress === 0 ? () => setReviewProgress(1) : undefined,
    });

    // Step 2: User Requested
    steps.push({
      label: 'User Requested',
      description: `Requested ${purposeLabel(active.purpose, active.metadata)}`,
      detail: active.created_at ? formatDate(active.created_at) : '',
      state: reviewProgress >= 2 || isApproved || isRejected ? 'done' : reviewProgress === 1 ? 'current' : 'pending',
      onAction: reviewProgress === 1 ? () => setReviewProgress(2) : undefined,
    });

    // Step 3: Admin Review
    steps.push({
      label: 'Admin Review',
      description: isApproved
        ? `Approved by admin${active.reviewed_at ? ` · ${formatDate(active.reviewed_at)}` : ''}`
        : isRejected
          ? `Rejected${active.rejection_reason ? ` · ${active.rejection_reason}` : ''}`
          : 'Waiting for your approval',
      state: isApproved || isRejected ? 'done' : reviewProgress === 2 ? 'current' : 'pending',
    });

    // 🔥 NEW: Dynamic Live Tracking
    if (active.purpose === 'verify') {
      steps.push({
        label: 'Identity Verified',
        description: isApproved ? 'Blue checkmark applied to profile' : 'Blue checkmark will be applied',
        state: isApproved ? 'done' : 'pending',
      });
    } else if (active.purpose === 'post_boost' || active.purpose === 'followers') {
      const delivered = liveBoost?.delivered || 0;
      const total = liveBoost?.quantity || 0;
      const pct = total > 0 ? Math.min(100, Math.round((delivered / total) * 100)) : 0;
      
      const label = active.purpose === 'post_boost' ? 'Boost Activated' : 'Followers Delivering';
      
      steps.push({
        label: label,
        description: isApproved 
          ? `Delivering... ${delivered} / ${total} (${pct}%)` 
          : 'Will begin after approval',
        state: isApproved ? (pct >= 100 ? 'done' : 'current') : 'pending',
      });
      
      steps.push({
        label: 'Delivery Complete',
        description: pct >= 100 ? 'Package fully delivered' : 'Pending',
        state: pct >= 100 ? 'done' : 'pending',
      });
    }

    // Step 5: Notified
    steps.push({
      label: 'User Notified',
      description: isApproved ? 'Notification sent to student' : isRejected ? 'Rejection notice sent' : 'Notification will be sent',
      state: isApproved || isRejected ? 'done' : 'pending',
    });

    return (
      <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 10, background: '#000',
          padding: '16px 20px', borderBottom: '1px solid #1f1f1f',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button onClick={closeDetail} style={{ background: 'transparent', border: 'none', color: '#fff', padding: 4, cursor: 'pointer' }}>
            <ChevronRightIcon width={24} height={24} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>Payment Flow</div>
            <div style={{ color: '#6d7382', fontSize: 12, marginTop: 2 }}>
              {active.profiles?.full_name || 'Unknown'} · {purposeLabel(active.purpose, active.metadata)}
            </div>
          </div>
        </div>

        <div style={{ padding: 20, borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
              {active.profiles?.avatar_url ? (
                <img src={active.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserIcon width={24} height={24} color="#6d7382" />
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {active.profiles?.full_name || 'Unknown'}
              </div>
              <div style={{ color: '#6d7382', fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {active.profiles?.email}
              </div>
            </div>
            <div style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
              color: STATUS_TABS.find(t => t.key === active.status)?.color || '#fff',
              background: `${STATUS_TABS.find(t => t.key === active.status)?.color || '#6d7382'}15`,
            }}>
              {active.status}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid #1f1f1f' }}>
            <div>
              <div style={{ color: '#6d7382', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Amount</div>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginTop: 4 }}>KSh {active.amount}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#6d7382', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Purpose</div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{purposeLabel(active.purpose, active.metadata)}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <VerticalStepper
            steps={steps}
            action={
              isPending && reviewProgress === 2 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={approve}
                    disabled={busy}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      background: '#22c55e', color: '#fff', border: 'none',
                      padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 800,
                      cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <CheckCircleIcon width={20} height={20} />
                    {busy ? 'Approving…' : 'Approve Payment'}
                  </button>

                  {!showRejectInput ? (
                    <button
                      onClick={() => setShowRejectInput(true)}
                      style={{
                        background: 'transparent', color: '#ef4444',
                        border: '1px solid #333', padding: '14px',
                        borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      Reject Payment
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 12 }}>
                      <div style={{ color: '#6d7382', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Reason for rejection
                      </div>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. M-Pesa code not found, invalid amount…"
                        maxLength={300}
                        style={{
                          width: '100%', minHeight: 80, background: '#111',
                          border: '1px solid #333', borderRadius: 10, padding: 12,
                          color: '#fff', fontSize: 14, outline: 'none',
                          resize: 'vertical', fontFamily: 'inherit',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setShowRejectInput(false)}
                          style={{ flex: 1, padding: 12, borderRadius: 10, background: 'transparent', border: '1px solid #333', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={reject}
                          disabled={busy}
                          style={{ flex: 1, padding: 12, borderRadius: 10, background: '#ef4444', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
                        >
                          {busy ? 'Rejecting…' : 'Confirm Reject'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : isRejected ? (
                <button
                  onClick={approve}
                  disabled={busy}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: '#22c55e', color: '#fff', border: 'none',
                    padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 800,
                    cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
                  }}
                >
                  <CheckCircleIcon width={18} height={18} />
                  Re-approve Payment
                </button>
              ) : null
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CreditCardIcon width={28} height={28} color="#22c55e" />
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0 }}>Payments</h1>
        </div>
        <p style={{ color: '#6d7382', fontSize: 13, marginTop: 6, marginBottom: 0 }}>
          Review M-Pesa payments and step through each request
        </p>
      </div>

      {errMsg && (
        <div style={{ margin: '0 20px 12px', background: '#7f1d1d', color: '#fff', padding: 12, borderRadius: 10, fontSize: 13 }}>
          {errMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px', overflowX: 'auto' }}>
        {STATUS_TABS.map(tab => {
          const activeTabState = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flexShrink: 0,
                background: activeTabState ? tab.color : '#0f0f0f',
                border: activeTabState ? `1px solid ${tab.color}` : '1px solid #1f1f1f',
                color: activeTabState ? '#000' : '#fff',
                fontSize: 13, fontWeight: 800, padding: '10px 18px',
                borderRadius: 20, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {tab.label}
              <span style={{
                background: activeTabState ? 'rgba(0,0,0,0.2)' : '#1a1a1a',
                color: activeTabState ? '#000' : (counts[tab.key] > 0 ? '#fff' : '#6d7382'),
                fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 10,
              }}>
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #1f1f1f', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: '#0f0f0f', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <CreditCardIcon width={24} height={24} color="#333" />
          </div>
          <div style={{ color: '#6d7382', fontSize: 14, fontWeight: 600 }}>
            No {activeTab === 'all' ? 'payments' : activeTab + ' payments'} yet
          </div>
        </div>
      ) : (
        <div>
          {filtered.map(p => {
            const statusMeta = STATUS_TABS.find(t => t.key === p.status);
            return (
              <button
                key={p.id}
                onClick={() => openPayment(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  width: '100%', padding: '14px 20px',
                  background: 'transparent', border: 'none',
                  borderTop: '1px solid #0f0f0f',
                  color: '#fff', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                  {p.profiles?.avatar_url ? (
                    <img src={p.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserIcon width={20} height={20} color="#6d7382" />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.profiles?.full_name || 'Unknown'}
                  </div>
                  <div style={{ color: '#6d7382', fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {purposeLabel(p.purpose, p.metadata)} · KSh {p.amount}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: statusMeta?.color || '#6d7382', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: statusMeta?.color || '#6d7382' }} />
                    {statusMeta?.label || p.status}
                  </div>
                  <div style={{ color: '#6d7382', fontSize: 11 }}>{timeAgo(p.created_at)}</div>
                </div>
                <ChevronRightIcon width={16} height={16} color="#333" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
