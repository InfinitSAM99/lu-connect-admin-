import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

export default function Events() {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', location: '', starts_at: '', is_published: true });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('events').select('*').order('starts_at', { ascending: false });
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ title: '', description: '', location: '', starts_at: '', is_published: true });
    setEditing('new');
  };
  const openEdit = (e) => {
    setForm({ ...e, starts_at: e.starts_at?.slice(0, 16) });
    setEditing(e);
  };

  const save = async () => {
    if (!form.title.trim() || !form.starts_at) return alert('Title and start date required');
    const payload = {
      title: form.title, description: form.description, location: form.location,
      starts_at: new Date(form.starts_at).toISOString(), is_published: form.is_published,
      organizer_id: profile.id,
    };
    if (editing === 'new') {
      await supabase.from('events').insert(payload);
      await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'create_event', target_type: 'event', details: { title: form.title } });
    } else {
      await supabase.from('events').update(payload).eq('id', editing.id);
      await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'update_event', target_type: 'event', target_id: editing.id });
    }
    setEditing(null); load();
  };

  const remove = async (e) => {
    if (!confirm('Delete event?')) return;
    await supabase.from('events').delete().eq('id', e.id);
    await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'delete_event', target_type: 'event', target_id: e.id });
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 style={{ marginTop: 0, flex: 1 }}>Events</h1>
        <button className="btn btn-primary" onClick={openNew}>+ New Event</button>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{editing === 'new' ? 'New Event' : 'Edit Event'}</h2>
            <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ marginBottom: 8 }} />
            <textarea className="input" placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: 8, minHeight: 100 }} />
            <input className="input" placeholder="Location" value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} style={{ marginBottom: 8 }} />
            <input className="input" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} style={{ marginBottom: 8 }} />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, fontSize: 13 }}>
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} style={{ width: 'auto' }} /> Published
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="state">Loading…</div>}
      {!loading && events.length === 0 && <div className="card state"><h3>No events</h3></div>}

      <div className="card" style={{ overflow: 'auto' }}>
        <table className="data">
          <thead><tr><th>Title</th><th>Starts</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.title}</td>
                <td>{new Date(e.starts_at).toLocaleString()}</td>
                <td>{e.location || '—'}</td>
                <td>{e.is_published ? <span className="badge badge-green">Published</span> : <span className="badge badge-gray">Draft</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost" onClick={() => openEdit(e)} style={{ fontSize: 12 }}>Edit</button>
                    <button className="btn btn-ghost" onClick={() => remove(e)} style={{ fontSize: 12, color: 'var(--danger)' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}