import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

export default function Announcements() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', is_pinned: false, is_important: false, is_published: true });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*').order('published_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ title: '', description: '', is_pinned: false, is_important: false, is_published: true });
    setEditing('new');
  };

  const openEdit = (a) => {
    setForm({ title: a.title, description: a.description, is_pinned: a.is_pinned, is_important: a.is_important, is_published: a.is_published });
    setEditing(a);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) return alert('Title and description required');
    if (editing === 'new') {
      const { error } = await supabase.from('announcements').insert({ ...form, author_id: profile.id });
      if (error) return alert(error.message);
      await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'create_announcement', target_type: 'announcement', details: { title: form.title } });
    } else {
      const { error } = await supabase.from('announcements').update(form).eq('id', editing.id);
      if (error) return alert(error.message);
      await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'update_announcement', target_type: 'announcement', target_id: editing.id });
    }
    setEditing(null);
    load();
  };

  const remove = async (a) => {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcements').delete().eq('id', a.id);
    await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'delete_announcement', target_type: 'announcement', target_id: a.id });
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 style={{ marginTop: 0, flex: 1 }}>Announcements</h1>
        <button className="btn btn-primary" onClick={openNew}>+ New</button>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{editing === 'new' ? 'New Announcement' : 'Edit Announcement'}</h2>
            <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ marginBottom: 8 }} />
            <textarea className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: 8, minHeight: 120 }} />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} style={{ width: 'auto' }} /> Pin to top
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.is_important} onChange={(e) => setForm({ ...form, is_important: e.target.checked })} style={{ width: 'auto' }} /> Mark important
            </label>
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
      {!loading && items.length === 0 && <div className="card state"><h3>No announcements</h3></div>}

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((a) => (
          <div key={a.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong>{a.title}</strong>
                  {a.is_pinned && <span className="badge badge-red">Pinned</span>}
                  {a.is_important && <span className="badge badge-yellow">Important</span>}
                  {!a.is_published && <span className="badge badge-gray">Draft</span>}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>{a.description}</p>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(a.published_at).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost" onClick={() => openEdit(a)} style={{ fontSize: 12 }}>Edit</button>
                <button className="btn btn-ghost" onClick={() => remove(a)} style={{ fontSize: 12, color: 'var(--danger)' }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}