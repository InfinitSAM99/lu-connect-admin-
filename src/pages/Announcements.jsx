import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { TrashIcon, PencilIcon } from '../components/Icons.jsx';

export default function Announcements() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    is_pinned: false,
    is_important: false,
    is_published: true,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('published_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ title: '', description: '', is_pinned: false, is_important: false, is_published: true });
    setEditing('new');
  };

  const openEdit = (a) => {
    setForm({
      title: a.title,
      description: a.description,
      is_pinned: a.is_pinned,
      is_important: a.is_important,
      is_published: a.is_published,
    });
    setEditing(a);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) return alert('Title and description required');
    if (editing === 'new') {
      const { error } = await supabase.from('announcements').insert({ ...form, author_id: profile.id });
      if (error) return alert(error.message);
      await supabase.from('admin_audit_logs').insert({
        admin_id: profile.id, action: 'create_announcement',
        target_type: 'announcement', details: { title: form.title },
      });
    } else {
      const { error } = await supabase.from('announcements').update(form).eq('id', editing.id);
      if (error) return alert(error.message);
      await supabase.from('admin_audit_logs').insert({
        admin_id: profile.id, action: 'update_announcement',
        target_type: 'announcement', target_id: editing.id,
      });
    }
    setEditing(null);
    load();
  };

  const remove = async (a) => {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcements').delete().eq('id', a.id);
    await supabase.from('admin_audit_logs').insert({
      admin_id: profile.id, action: 'delete_announcement',
      target_type: 'announcement', target_id: a.id,
    });
    load();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Campus-wide messages shown on the student app</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New</button>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{editing === 'new' ? 'New Announcement' : 'Edit Announcement'}</h2>
            <input
              className="input"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ marginBottom: 8 }}
            />
            <textarea
              className="input"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ marginBottom: 8, minHeight: 120 }}
            />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.is_pinned}
                onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                style={{ width: 'auto' }} /> Pin to top
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.is_important}
                onChange={(e) => setForm({ ...form, is_important: e.target.checked })}
                style={{ width: 'auto' }} /> Mark important
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, fontSize: 13 }}>
              <input type="checkbox" checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                style={{ width: 'auto' }} /> Published
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="state">Loading…</div>}

      {!loading && items.length === 0 && (
        <div className="flat-empty">No announcements yet</div>
      )}

      {!loading && items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Title</th>
                <th>Description</th>
                <th style={{ width: 160 }}>Published</th>
                <th style={{ width: 90, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="cell-user-name" style={{ maxWidth: 260 }}>
                      {a.title}
                      {a.is_pinned && <span className="badge badge-red" style={{ marginLeft: 6 }}>Pinned</span>}
                      {a.is_important && <span className="badge badge-yellow" style={{ marginLeft: 4 }}>Important</span>}
                      {!a.is_published && <span className="badge badge-gray" style={{ marginLeft: 4 }}>Draft</span>}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        maxWidth: 420,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'var(--text-2)',
                        fontSize: 13,
                      }}
                    >
                      {a.description}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {new Date(a.published_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="cell-actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(a)}>
                        <PencilIcon width={16} height={16} />
                      </button>
                      <button className="icon-btn icon-btn-danger" title="Delete" onClick={() => remove(a)}>
                        <TrashIcon width={16} height={16} />
                      </button>
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
