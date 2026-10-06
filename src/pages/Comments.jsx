import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

export default function Comments() {
  const { profile: me, isAdmin } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    const { data, error } = await supabase
      .from('comments')
      .select('*, author:profiles!comments_author_id_fkey(id, full_name, avatar_url), post:posts!comments_post_id_fkey(id, content)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      setErr(error.message + ' — ' + (error.details || ''));
      setComments([]);
    } else {
      setComments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (c) => {
    if (!confirm('Remove this comment?')) return;
    const { error } = await supabase.rpc('admin_soft_delete_comment', { p_comment_id: c.id });
    if (error) return alert('Delete failed: ' + error.message);
    load();
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Comment Management</h1>

      {err && (
        <div className="card" style={{ padding: 12, marginBottom: 12, color: 'var(--danger)' }}>
          <strong>Query error:</strong> {err}
        </div>
      )}

      {loading && <div className="state">Loading…</div>}
      {!loading && !err && comments.length === 0 && (
        <div className="card state"><h3>No comments</h3></div>
      )}

      {!loading && comments.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {comments.map((c) => (
            <div key={c.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                <img className="avatar" width={28} height={28}
                  src={c.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.author?.full_name || 'U'}`} alt="" />
                <div style={{ flex: 1, fontSize: 13 }}>
                  <strong>{c.author?.full_name || 'Unknown'}</strong>
                  <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                {isAdmin && (
                  <button className="btn btn-ghost" onClick={() => remove(c)} style={{ color: 'var(--danger)', fontSize: 12 }}>
                    Delete
                  </button>
                )}
              </div>
              <div style={{ fontSize: 14 }}>{c.content}</div>
              {c.post?.content && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, paddingLeft: 10, borderLeft: '2px solid var(--border)' }}>
                  On post: {c.post.content.slice(0, 100)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
