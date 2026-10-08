import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { ChevronRightIcon, TrashIcon } from '../components/Icons.jsx';

export default function Posts() {
  const { profile: me, isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*, profiles:author_id(id, full_name, avatar_url)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(200);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (p) => {
    if (!confirm('Remove this post?')) return;
    const { error } = await supabase.rpc('soft_delete_post', { post_id: p.id });
    if (error) { alert('Delete failed: ' + error.message); return; }
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'delete_post',
      target_type: 'post',
      target_id: p.id,
      details: { content: p.content?.slice(0, 100) },
    });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Posts</h1>
        <p className="page-subtitle">All posts across the platform</p>
      </div>

      {loading && <div className="state">Loading…</div>}

      {!loading && posts.length === 0 && (
        <div className="flat-empty">No posts yet</div>
      )}

      {!loading && posts.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Author</th>
                <th>Content</th>
                <th style={{ width: 160 }}>Posted</th>
                <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/students/${p.author_id}`} className="cell-user">
                      <img
                        className="avatar"
                        width={32}
                        height={32}
                        src={p.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.profiles?.full_name || 'U'}`}
                        alt=""
                      />
                      <div className="cell-user-info">
                        <div className="cell-user-name">{p.profiles?.full_name || 'Unknown'}</div>
                      </div>
                    </Link>
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
                      {p.content || '(media only)'}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                      {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="cell-actions">
                      <Link to={`/posts/${p.id}`} className="icon-btn" title="View post">
                        <ChevronRightIcon width={16} height={16} />
                      </Link>
                      {isAdmin && (
                        <button
                          className="icon-btn icon-btn-danger"
                          title="Delete"
                          onClick={() => remove(p)}
                        >
                          <TrashIcon width={16} height={16} />
                        </button>
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
