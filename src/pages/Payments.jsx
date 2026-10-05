import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

function purposeLabel(purpose, metadata) {
  switch (purpose) {
    case 'verify':
      return '✅ Verify';
    case 'followers':
      return `👥 Followers (+${metadata?.followers || 0})`;
    case 'post_boost':
      return `🔝 Post Boost (${metadata?.hours || 0}h)`;
    default:
      return purpose;
  }
}

export default function Payments() {
  const { profile: me, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [errMsg, setErrMsg] = useState('');

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('payments')
      .select('*, profiles:user_id(id, full_name, email, avatar_url, is_verified, displayed_follower_count)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filter !== 'all') q = q.eq('status', filter);

    const { data, error } = await q;
    if (error) setErrMsg(error.message);
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const approve = async (p) => {
    if (!confirm(`Approve ${p.mpesa_code} from ${p.profiles?.full_name}?`)) return;

    const { error } = await supabase
      .from('payments')
      .update({
        status: 'approved',
        reviewed_by: me.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', p.id);

    if (error) {
      alert('Approve failed: ' + error.message);
      return;
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'approve_payment',
      target_type: 'payment',
      target_id: p.id,
      details: { mpesa_code: p.mpesa_code, user: p.profiles?.email, amount: p.amount, purpose: p.purpose },
    });

    // Notification message depends on purpose
    let title = '✅ Payment approved';
    let body = '';
    if (p.purpose === 'verify') {
      title = '✅ You are now verified!';
      body = 'Your account shows the blue checkmark.';
    } else if (p.purpose === 'followers') {
      title = `✅ +${p.metadata?.followers || 0} followers added!`;
      body = 'Your displayed follower count has been updated.';
    } else if (p.purpose === 'post_boost') {
      title = `✅ Post boosted for ${p.metadata?.hours || 0} hours!`;
      body = 'Your post will now appear at the top of feeds.';
    }

    await supabase.from('notifications').insert({
      user_id: p.user_id,
      type: 'like',
      title,
      body,
      link: p.purpose === 'verify' ? `/profile/${p.user_id}` : '/get-boosted',
    });

    load();
  };

  const reject = async (p) => {
    const reason = prompt('Reason for rejection (shown to user):');
    if (reason === null) return;

    const { error } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        rejection_reason: reason || 'Payment could not be verified',
        reviewed_by: me.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', p.id);

    if (error) {
      alert('Reject failed: ' + error.message);
      return;
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'reject_payment',
      target_type: 'payment',
      target_id: p.id,
      details: { reason, mpesa_code: p.mpesa_code, purpose: p.purpose },
    });

    await supabase.from('notifications').insert({
      user_id: p.user_id,
      type: 'like',
      title: '❌ Payment rejected',
      body: reason || 'Payment could not be verified.',
      link: '/get-boosted',
    });

    load();
  };

  const revoke = async (p) => {
    if (!confirm('Revoke this payment\'s reward?')) return;

    await supabase
      .from('payments')
      .update({ status: 'rejected', rejection_reason: 'Revoked by admin' })
      .eq('id', p.id);

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'revoke_payment',
      target_type: 'payment',
      target_id: p.id,
    });

    load();
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Payments</h1>
      <p style={{ color: 'var(--text-2)', marginTop: -8 }}>
        Review M-Pesa submissions: verify, followers, post boosts.
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            className={'btn' + (filter === s ? ' btn-primary' : '')}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {errMsg && (
        <div style={{ background: 'var(--brand-soft)', color: 'var(--brand)', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {errMsg}
        </div>
      )}

      {loading && <div className="state">Loading…</div>}

      {!loading && items.length === 0 && (
        <div className="card state">
          <h3>No payments in this view</h3>
          <p>
            {filter === 'pending'
              ? 'No pending submissions. Users will appear here when they pay.'
              : 'Nothing matches this filter.'}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((p) => (
          <div key={p.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <img
                className="avatar"
                width={48}
                height={48}
                src={p.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.profiles?.full_name || 'U'}`}
                alt=""
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {p.profiles?.full_name}{' '}
                  {p.profiles?.is_verified && (
                    <span className="badge badge-green" style={{ marginLeft: 4 }}>✅ Verified</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.profiles?.email}</div>

                <div
                  style={{
                    marginTop: 10,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>Purpose</div>
                    <div style={{ fontWeight: 700 }}>{purposeLabel(p.purpose, p.metadata)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>M-Pesa Code</div>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{p.mpesa_code}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>Amount</div>
                    <div style={{ fontWeight: 700 }}>{p.currency} {p.amount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>Phone</div>
                    <div>{p.phone || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>Submitted</div>
                    <div>{new Date(p.created_at).toLocaleString()}</div>
                  </div>
                </div>

                {p.rejection_reason && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>
                    Reason: {p.rejection_reason}
                  </div>
                )}
              </div>

              <span
                className={
                  'badge ' +
                  (p.status === 'approved' ? 'badge-green' : p.status === 'rejected' ? 'badge-red' : 'badge-yellow')
                }
              >
                {p.status}
              </span>
            </div>

            {isAdmin && (
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                {p.status === 'pending' && (
                  <>
                    <button className="btn btn-primary" onClick={() => approve(p)}>
                      ✅ Approve
                    </button>
                    <button className="btn" onClick={() => reject(p)} style={{ color: 'var(--danger)' }}>
                      ❌ Reject
                    </button>
                  </>
                )}
                {p.status === 'approved' && (
                  <button className="btn" onClick={() => revoke(p)} style={{ color: 'var(--danger)' }}>
                    Revoke
                  </button>
                )}
                {p.status === 'rejected' && (
                  <button className="btn" onClick={() => approve(p)}>
                    Re-approve
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
