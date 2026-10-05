import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

export default function Admins() {
  const { profile: me, isSuperAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'admin' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*, roles(name, level)').order('created_at');
    setAdmins((data || []).filter((p) => (p.roles?.level || 0) >= 2));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (!isSuperAdmin) {
    return (
      <div className="state">
        <h3>Access Denied</h3>
        <p>Only super administrators can manage admins.</p>
      </div>
    );
  }

  const promote = async (uid, roleName) => {
    if (!confirm(`Change role to ${roleName}?`)) return;
    const { data: role } = await supabase.from('roles').select('id').eq('name', roleName).single();
    await supabase.from('profiles').update({ role_id: role.id }).eq('id', uid);
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'change_role', target_type: 'profile', target_id: uid,
      details: { new_role: roleName },
    });
    load();
  };

  const demote = async (uid) => {
    if (!confirm('Demote to student?')) return;
    const { data: role } = await supabase.from('roles').select('id').eq('name', 'student').single();
    await supabase.from('profiles').update({ role_id: role.id }).eq('id', uid);
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'demote_admin', target_type: 'profile', target_id: uid,
    });
    load();
  };

  const createAdmin = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    // Uses secure edge function (create-admin) to avoid exposing service role
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) return setErr(json.error || 'Failed');
    setMsg('Admin created: ' + json.id);
    setForm({ email: '', password: '', full_name: '', role: 'admin' });
    load();
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Admin Management</h1>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Create new administrator</h3>
        {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
        {msg && <p style={{ color: 'var(--success)' }}>{msg}</p>}
        <form onSubmit={createAdmin} style={{ display: 'grid', gap: 8 }}>
          <input className="input" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" placeholder="Temporary password (min 8)" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input className="input" placeholder="Full name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button className="btn btn-primary">Create admin</button>
        </form>
      </div>

      <h3>Current administrators</h3>
      {loading && <div className="state">Loading…</div>}
      {!loading && (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="data">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>{a.full_name}</td>
                  <td>{a.email}</td>
                  <td><span className="badge badge-red">{a.roles?.name}</span></td>
                  <td>
                    {a.id !== me.id && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost" onClick={() => promote(a.id, 'admin')} style={{ fontSize: 12 }}>→ Admin</button>
                        <button className="btn btn-ghost" onClick={() => promote(a.id, 'super_admin')} style={{ fontSize: 12 }}>→ Super</button>
                        <button className="btn btn-ghost" onClick={() => demote(a.id)} style={{ fontSize: 12, color: 'var(--danger)' }}>Demote</button>
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