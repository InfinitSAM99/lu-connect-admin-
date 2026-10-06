import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

export default function PendingApprovals() {
  const { profile: me, isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, username, admission_number, mobile_number, approval_status, rejection_reason, resubmit_count, created_at, avatar_url, faculty, course, year_of_study')
      .in('approval_status', ['pending', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(200);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logAction = async (action, targetId, details = {}) => {
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action, target_type: 'profile', target_id: targetId, details,
    });
  };

  const approve = async (r) => {
    if (!confirm(`Approve ${r.full_name}?`)) return;
    const { error } = await supabase.from('profiles').update({
      approval_status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: me.id,
      rejection_reason: null,
    }).eq('id', r.id);
    if (error) return alert(error.message);
    await logAction('approve_user', r.id, { admission_number: r.admission_number });
    load();
  };

  const reject = async (r) => {
    const reason = prompt(`Reject ${r.full_name}? Reason (student will see this):`);
    if (reason === null) return;
    const { error } = await supabase.from('profiles').update({
      approval_status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: me.id,
      rejection_reason: reason || 'Admission number could not be verified',
    }).eq('id', r.id);
    if (error) return alert(error.message);
    await logAction('reject_user', r.id, { reason });
    load();
  };

  const pendingRows = rows.filter((r) => r.approval_status === 'pending');
  const rejectedRows = rows.filter((r) => r.approval_status === 'rejected');
  const shown = tab === 'pending' ? pendingRows : rejectedRows;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Pending Approvals</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className={tab === 'pending' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => setTab('pending')}
        >
          Pending ({pendingRows.length})
        </button>
        <button
          className={tab === 'rejected' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => setTab('rejected')}
        >
          Rejected / Resubmitted ({rejectedRows.length})
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={load}>Refresh</button>
      </div>

      {loading && <div className="state">Loading…</div>}
      {!loading && shown.length === 0 && (
        <div className="card state"><h3>No {tab} accounts</h3></div>
      )}

      {!loading && shown.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map((r) => (
            <div key={r.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <img className="avatar" width={44} height={44}
                  src={r.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${r.full_name}`} alt="" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.full_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{r.email}</div>
                  {r.username && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>@{r.username}</div>}
                </div>
                <span className={'badge ' + (r.approval_status === 'pending' ? 'badge-gray' : 'badge-red')}>
                  {r.approval_status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 10 }}>
                <div>
                  <div style={{ color: 'var(--text-3)', fontSize: 11 }}>Admission number</div>
                  <div style={{ fontWeight: 700 }}>{r.admission_number || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-3)', fontSize: 11 }}>Mobile</div>
                  <div style={{ fontWeight: 700 }}>{r.mobile_number || '—'}</div>
                </div>
                {r.faculty && <div><div style={{ color: 'var(--text-3)', fontSize: 11 }}>Faculty</div><div>{r.faculty}</div></div>}
                {r.course && <div><div style={{ color: 'var(--text-3)', fontSize: 11 }}>Course</div><div>{r.course}</div></div>}
                <div>
                  <div style={{ color: 'var(--text-3)', fontSize: 11 }}>Signed up</div>
                  <div>{new Date(r.created_at).toLocaleString()}</div>
                </div>
                {r.resubmit_count > 0 && (
                  <div>
                    <div style={{ color: 'var(--text-3)', fontSize: 11 }}>Resubmits</div>
                    <div>{r.resubmit_count}</div>
                  </div>
                )}
              </div>

              {r.rejection_reason && (
                <div style={{ background: 'var(--brand-soft)', color: 'var(--brand)', padding: 8, borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
                  <strong>Previous reason:</strong> {r.rejection_reason}
                </div>
              )}

              {isAdmin && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => approve(r)} style={{ flex: 1 }}>
                    ✓ Approve
                  </button>
                  <button className="btn" onClick={() => reject(r)} style={{ flex: 1 }}>
                    ✗ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
