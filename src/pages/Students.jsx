import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  SearchIcon, ChevronRightIcon, CheckIcon, BanIcon,
} from '../components/Icons.jsx';

export default function Students() {
  const { profile: me, isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('id, email, full_name, username, avatar_url, faculty, course, year_of_study, role_id, is_verified, is_suspended, is_broadcast_only, created_at, displayed_follower_count, roles(name, level)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (q.trim()) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,username.ilike.%${q}%`);

    const { data } = await query;
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logAction = async (action, targetId, details = {}) => {
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action,
      target_type: 'profile',
      target_id: targetId,
      details,
    });
  };

  const toggleSuspend = async (s) => {
    const newStatus = !s.is_suspended;
    if (!confirm(`${newStatus ? 'Suspend' : 'Reactivate'} ${s.full_name}?`)) return;
    const reason = newStatus ? prompt('Reason for suspension:') || 'Policy violation' : null;

    setBusy(s.id);
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: newStatus, suspended_reason: reason })
      .eq('id', s.id);
    if (error) { alert(error.message); setBusy(null); return; }

    await logAction(newStatus ? 'suspend_user' : 'reactivate_user', s.id, { reason });
    setBusy(null);
    load();
  };

  const verifyUser = async (s) => {
    setBusy(s.id);
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: !s.is_verified })
      .eq('id', s.id);
    if (error) { alert(error.message); setBusy(null); return; }

    await logAction(s.is_verified ? 'unverify_user' : 'verify_user', s.id);
    setBusy(null);
    load();
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'verified', label: 'Verified' },
    { key: 'unverified', label: 'Unverified' },
    { key: 'suspended', label: 'Suspended' },
  ];

  const filtered = students.filter((s) => {
    if (filter === 'verified') return s.is_verified && !s.is_suspended;
    if (filter === 'unverified') return !s.is_verified && !s.is_suspended;
    if (filter === 'suspended') return s.is_suspended;
    return true;
  });

  const counts = {
    all: students.length,
    verified: students.filter((s) => s.is_verified && !s.is_suspended).length,
    unverified: students.filter((s) => !s.is_verified && !s.is_suspended).length,
    suspended: students.filter((s) => s.is_suspended).length,
  };

  const statusLabel = (s) => {
    if (s.is_suspended) return { text: 'Suspended', cls: 'badge-red' };
    if (s.is_verified) return { text: 'Verified', cls: 'badge-green' };
    return { text: 'Active', cls: 'badge-gray' };
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Students</h1>
        <p className="page-subtitle">Manage accounts, verify students, suspend abusers</p>
      </div>

      <div className="filters-block">
        <div className="filters-row">
          <div className="search-wrap">
            <SearchIcon width={16} height={16} />
            <input
              className="search-input"
              placeholder="Search by name, email, or username…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <button className="btn btn-primary" onClick={load} disabled={loading}>
            Search
          </button>
        </div>

        <div className="filter-tabs">
          {filters.map((f) => (
            <button
              key={f.key}
              className={'filter-tab' + (filter === f.key ? ' active' : '')}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="filter-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="state">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <div className="flat-empty">No students found</div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 260 }}>Name</th>
                <th style={{ minWidth: 100 }}>Faculty</th>
                <th style={{ width: 60 }}>Year</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 130, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const st = statusLabel(s);
                return (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/students/${s.id}`} className="cell-user">
                        <img
                          className="avatar"
                          width={36}
                          height={36}
                          src={s.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${s.full_name || 'U'}`}
                          alt=""
                        />
                        <div className="cell-user-info">
                          <div className="cell-user-name">
                            {s.full_name || 'Unnamed'}
                            {s.is_verified && <span className="verified-dot">✓</span>}
                            {s.is_broadcast_only && <span className="badge badge-red" style={{ marginLeft: 4 }}>📢</span>}
                          </div>
                          <div className="cell-user-sub">{s.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td>{s.faculty || '—'}</td>
                    <td>{s.year_of_study || '—'}</td>
                    <td>
                      <span className={'badge ' + st.cls}>{st.text}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="cell-actions">
                        {isAdmin && (
                          <>
                            <button
                              className="icon-btn"
                              title={s.is_verified ? 'Unverify' : 'Verify'}
                              onClick={() => verifyUser(s)}
                              disabled={busy === s.id}
                            >
                              <CheckIcon width={16} height={16} />
                            </button>
                            <button
                              className={'icon-btn' + (s.is_suspended ? ' icon-btn-warn' : ' icon-btn-danger')}
                              title={s.is_suspended ? 'Reactivate' : 'Suspend'}
                              onClick={() => toggleSuspend(s)}
                              disabled={busy === s.id}
                            >
                              <BanIcon width={16} height={16} />
                            </button>
                          </>
                        )}
                        <Link to={`/students/${s.id}`} className="icon-btn" title="View">
                          <ChevronRightIcon width={16} height={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
