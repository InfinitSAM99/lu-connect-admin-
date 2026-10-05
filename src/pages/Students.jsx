import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

export default function Students() {
  const { profile: me, isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*, roles(name, level)').order('created_at', { ascending: false }).limit(100);
    if (q.trim()) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    const { data } = await query;
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logAction = async (action, targetId, details = {}) => {
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action, target_type: 'profile', target_id: targetId, details,
    });
  };

  const toggleSuspend = async (s) => {
    const newStatus = !s.is_suspended;
    if (!confirm(`${newStatus ? 'Suspend' : 'Reactivate'} ${s.full_name}?`)) return;
    await supabase.from('profiles').update({
      is_suspended: newStatus,
      suspended_reason: newStatus ? prompt('Reason for suspension:') || 'Policy violation' : null,
    }).eq('id', s.id);
    await logAction(newStatus ? 'suspend_user' : 'reactivate_user', s.id);
    load();
  };

  const verifyUser = async (s) => {
    await supabase.from('profiles').update({ is_verified: !s.is_verified }).eq('id', s.id);
    await logAction(s.is_verified ? 'unverify_user' : 'verify_user', s.id);
    load();
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Student Management</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input className="input" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-primary" onClick={load}>Search</button>
      </div>

      {loading && <div className="state">Loading…</div>}
      {!loading && students.length === 0 && <div className="card state"><h3>No students found</h3></div>}

      {!loading && students.length > 0 && (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="data">
            <thead>
              <tr>
                <th>Student</th><th>Email</th><th>Faculty</th><th>Role</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img className="avatar" width={32} height={32}
                        src={s.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${s.full_name}`} alt="" />
                      <span style={{ fontWeight: 600 }}>{s.full_name}</span>
                    </div>
                  </td>
                  <td>{s.email}</td>
                  <td>{s.faculty || '—'}</td>
                  <td><span className="badge badge-gray">{s.roles?.name || 'student'}</span></td>
                  <td>
                    {s.is_suspended ? <span className="badge badge-red">Suspended</span> :
                      s.is_verified ? <span className="badge badge-green">Verified</span> :
                      <span className="badge badge-gray">Active</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {isAdmin && (
                        <>
                          <button className="btn btn-ghost" onClick={() => verifyUser(s)} style={{ fontSize: 12 }}>
                            {s.is_verified ? 'Unverify' : 'Verify'}
                          </button>
                          <button className="btn btn-ghost" onClick={() => toggleSuspend(s)} style={{ fontSize: 12 }}>
                            {s.is_suspended ? 'Reactivate' : 'Suspend'}
                          </button>
                        </>
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