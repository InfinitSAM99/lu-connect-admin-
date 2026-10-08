import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { VerifyIcon, XCircleIcon } from '../components/Icons.jsx';

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
      <div className="page-header">
        <h1 className="page-title">Pending Approvals</h1>
        <p className="page-subtitle">Approve new signups or review rejected accounts</p>
      </div>

      <div className="filters-block">
        <div className="filter-tabs">
          <button
            className={'filter-tab' + (tab === 'pending' ? ' active' : '')}
            onClick={() => setTab('pending')}
          >
            Pending
            <span className="filter-count">{pendingRows.length}</span>
          </button>
          <button
            className={'filter-tab' + (tab === 'rejected' ? ' active' : '')}
            onClick={() => setTab('rejected')}
          >
            Rejected
            <span className="filter-count">{rejectedRows.length}</span>
          </button>
        </div>
      </div>

      {loading && <div className="state">Loading…</div>}

      {!loading && shown.length === 0 && (
        <div className="flat-empty">No {tab} accounts</div>
      )}

      {!loading && shown.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Applicant</th>
                <th style={{ width: 140 }}>Admission No.</th>
                <th style={{ width: 130 }}>Mobile</th>
                <th style={{ minWidth: 140 }}>Faculty / Year</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 110, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/students/${r.id}`} className="cell-user">
                      <img
                        className="avatar"
                        width={36}
                        height={36}
                        src={r.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${r.full_name}`}
                        alt=""
                      />
                      <div className="cell-user-info">
                        <div className="cell-user-name">{r.full_name}</div>
                        <div className="cell-user-sub">
                          {r.username ? `@${r.username}` : r.email}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {r.admission_number || '—'}
                  </td>
                  <td style={{ fontSize: 12 }}>{r.mobile_number || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {r.faculty || '—'}
                    {r.year_of_study ? <div style={{ fontSize: 11 }}>Year {r.year_of_study}</div> : null}
                  </td>
                  <td>
                    {r.approval_status === 'pending'
                      ? <span className="badge badge-yellow">Pending</span>
                      : <span className="badge badge-red">Rejected</span>}
                    {r.resubmit_count > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                        Resubmitted {r.resubmit_count}×
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isAdmin && (
                      <div className="cell-actions">
                        <button
                          className="icon-btn"
                          title="Approve"
                          onClick={() => approve(r)}
                          style={{ color: 'var(--success)' }}
                        >
                          <VerifyIcon width={16} height={16} />
                        </button>
                        <button
                          className="icon-btn icon-btn-danger"
                          title="Reject"
                          onClick={() => reject(r)}
                        >
                          <XCircleIcon width={16} height={16} />
                        </button>
                      </div>
                    )}
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
