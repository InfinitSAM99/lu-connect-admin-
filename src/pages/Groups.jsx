import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

export default function Groups() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    const { data, error } = await supabase
      .from('groups')
      .select('*, creator:profiles!groups_created_by_fkey(full_name, email)')
      .order('created_at', { ascending: false });
    if (error) {
      setErr(error.message + ' — ' + (error.details || ''));
      setGroups([]);
    } else {
      setGroups(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleArchive = async (g) => {
    await supabase.from('groups').update({ is_archived: !g.is_archived }).eq('id', g.id);
    await supabase.from('admin_audit_logs').insert({
      admin_id: profile.id,
      action: g.is_archived ? 'unarchive_group' : 'archive_group',
      target_type: 'group', target_id: g.id,
    });
    load();
  };

  const remove = async (g) => {
    if (!confirm(`Delete group "${g.name}"?`)) return;
    await supabase.from('groups').delete().eq('id', g.id);
    await supabase.from('admin_audit_logs').insert({
      admin_id: profile.id, action: 'delete_group', target_type: 'group', target_id: g.id,
      details: { name: g.name },
    });
    load();
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Groups & Communities</h1>

      {err && (
        <div className="card" style={{ padding: 12, marginBottom: 12, color: 'var(--danger)' }}>
          <strong>Query error:</strong> {err}
        </div>
      )}

      {loading && <div className="state">Loading…</div>}
      {!loading && !err && groups.length === 0 && (
        <div className="card state"><h3>No groups</h3></div>
      )}

      {!loading && groups.length > 0 && (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="data">
            <thead>
              <tr><th>Name</th><th>Category</th><th>Members</th><th>Creator</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td style={{ fontWeight: 600 }}>{g.name}</td>
                  <td>{g.category || '—'}</td>
                  <td>{g.member_count ?? 0}</td>
                  <td>{g.creator?.full_name || '—'}</td>
                  <td>{g.is_archived ? <span className="badge badge-red">Archived</span> : <span className="badge badge-green">Active</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" onClick={() => toggleArchive(g)} style={{ fontSize: 12 }}>
                        {g.is_archived ? 'Unarchive' : 'Archive'}
                      </button>
                      <button className="btn btn-ghost" onClick={() => remove(g)} style={{ fontSize: 12, color: 'var(--danger)' }}>Delete</button>
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
