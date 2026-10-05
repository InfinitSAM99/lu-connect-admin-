import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

export default function Comments() {
  const { profile: me, isAdmin } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('comments')
      .select('*, profiles:author_id(id, full_name, avatar_url), posts:post_id(id, content)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }).limit(100);
    setComments(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (c) => {
    if (!confirm('Remove this comment?')) return;
    await supabase.from('comments').update({ is_deleted: true }).eq('id', c.id);
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'delete_comment', target_type: 'comment', target_id: c.id,
    });
    load();
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Comment Management</h1>

      {loading && <div className="state">Loading…</div>}
      {!loading && comments.length === 0 && <div className="card state"><h3>No comments</h3></div>}

      <div style={{ display: 'grid', gap: 10 }}>
        {comments.map((c) => (
          <div key={c.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
              <img className="avatar" width={28} height={28}
                src={c.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.profiles?.full_name}`} alt="" />
              <div style={{ flex: 1, fontSize: 13 }}>
                <strong>{c.profiles?.full_name}</strong>
                <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>{new Date(c.created_at).toLocaleString()}</span>
              </div>
              {isAdmin && <button className="btn btn-ghost" onClick={() => remove(c)}>Delete</button>}
            </div>
            <div style={{ fontSize: 14 }}>{c.content}</div>
            {c.posts?.content && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, paddingLeft: 10, borderLeft: '2px solid var(--border)' }}>
                On post: {c.posts.content.slice(0, 100)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}