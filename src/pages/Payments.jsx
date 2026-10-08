import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { VerifyIcon, XCircleIcon, BanIcon } from '../components/Icons.jsx';

function purposeLabel(purpose, metadata) {
  switch (purpose) {
    case 'verify': return 'Verify';
    case 'followers': return `Followers (+${metadata?.followers || 0})`;
    case 'post_boost': return `Post Boost (${metadata?.hours || 0}h)`;
    default: return purpose;
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

  useEffect(() => { load(); }, [filter]);

  const approve = async (p) => {
    if (!confirm(`Approve ${p.mpesa_code} from ${p.profiles?.full_name}?`)) return;

    const { error } = await supabase
      .from('payments')
      .update({ status: 'approved', reviewed_by: me.id, reviewed_at: new Date().toISOString() })
      .eq('id', p.id);
    if (error) { alert('Approve failed: ' + error.message); return; }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'approve_payment', target_type: 'payment', target_id: p.id,
      details: { mpesa_code: p.mpesa_code, user: p.profiles?.email, amount: p.amount, purpose: p.purpose },
    });

    let title = 'Payment approved';
    let body = '';
    if (p.purpose === 'verify') {
      title = 'You are now verified!';
      body = 'Your account shows the blue checkmark.';
    } else if (p.purpose === 'followers') {
      title = `+${p.metadata?.followers || 0} followers added!`;
      body = 'Your displayed follower count has been updated.';
    } else if (p.purpose === 'post_boost') {
      title = `Post boosted for ${p.metadata?.hours || 0} hours!`;
      body = 'Your post will now appear at the top of feeds.';
    }

    await supabase.from('notifications').insert({
      user_id: p.user_id, type: 'like', title, body,
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
    if (error) { alert('Reject failed: ' + error.message); return; }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'reject_payment', target_type: 'payment', target_id: p.id,
      details: { reason, mpesa_code: p.mpesa_code, purpose: p.purpose },
    });

    await supabase.from('notifications').insert({
      user_id: p.user_id, type: 'like', title: 'Payment rejected',
      body: reason || 'Payment could not be verified.', link: '/get-boosted',
    });

    load();
  };

  const revoke = async (p) => {
    if (!confirm("Revoke this payment's reward?")) return;
    await supabase
      .from('payments')
      .update({ status: 'rejected', rejection_reason: 'Revoked by admin' })
      .eq('id', p.id);
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'revoke_payment', target_type: 'payment', target_id: p.id,
    });
    load();
  };

  const statusBadge = (status) => {
    if (status === 'approved') return 'badge-green';
    if (status === 'rejected') return 'badge-red';
    return 'badge-yellow';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <p className="page-subtitle">Review M-Pesa submissions · verify · followers · post boosts</p>
      </div>

      <div className="filters-block">
        <div className="filter-tabs">
          {['pending', 'approved', 'rejected', 'all'].map((s) => (
            <button
              key={s}
              className={'filter-tab' + (filter === s ? ' active' : '')}
              onClick={() => setFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {errMsg && (
        <div
          style={{
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          {errMsg}
        </div>
      )}

      {loading && <div className="state">Loading…</div>}

      {!loading && items.length === 0 && (
        <div className="flat-empty">No payments in this view</div>
      )}

      {!loading && items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>User</th>
                <th style={{ minWidth: 140 }}>Purpose</th>
                <th style={{ width: 130 }}>M-Pesa Code</th>
                <th style={{ width: 90 }}>Amount</th>
                <th style={{ width: 130 }}>Phone</th>
                <th style={{ width: 130 }}>Status</th>
                <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="cell-user">
                      <img
                        className="avatar"
                        width={32}
                        height={32}
                        src={p.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.profiles?.full_name || 'U'}`}
                        alt=""
                      />
                      <div className="cell-user-info">
                        <div className="cell-user-name">
                          {p.profiles?.full_name || 'Unknown'}
                          {p.profiles?.is_verified && <span className="verified-dot">✓</span>}
                        </div>
                        <div className="cell-user-sub">{p.profiles?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{purposeLabel(p.purpose, p.metadata)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.mpesa_code}</td>
                  <td style={{ fontWeight: 600 }}>{p.currency || 'KES'} {p.amount}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.phone || '—'}</td>
                  <td>
                    <span className={'badge ' + statusBadge(p.status)}>{p.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="cell-actions">
                      {isAdmin && p.status === 'pending' && (
                        <>
                          <button
                            className="icon-btn"
                            title="Approve"
                            onClick={() => approve(p)}
                            style={{ color: 'var(--success)' }}
                          >
                            <VerifyIcon width={16} height={16} />
                          </button>
                          <button
                            className="icon-btn icon-btn-danger"
                            title="Reject"
                            onClick={() => reject(p)}
                          >
                            <XCircleIcon width={16} height={16} />
                          </button>
                        </>
                      )}
                      {isAdmin && p.status === 'approved' && (
                        <button
                          className="icon-btn icon-btn-danger"
                          title="Revoke"
                          onClick={() => revoke(p)}
                        >
                          <BanIcon width={16} height={16} />
                        </button>
                      )}
                      {isAdmin && p.status === 'rejected' && (
                        <button
                          className="icon-btn"
                          title="Re-approve"
                          onClick={() => approve(p)}
                          style={{ color: 'var(--success)' }}
                        >
                          <VerifyIcon width={16} height={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
