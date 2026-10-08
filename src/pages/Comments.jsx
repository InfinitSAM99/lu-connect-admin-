import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { ChevronRightIcon, TrashIcon } from '../components/Icons.jsx';

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
      .limit(200);
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
      <div className="page-header">
        <h1 className="page-title">Comments</h1>
        <p className="page-subtitle">All comments across the platform</p>
      </div>

      {err && (
        <div
          style={{
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          <strong>Query error:</strong> {err}
        </div>
      )}

      {loading && <div className="state">Loading…</div>}

      {!loading && !err && comments.length === 0 && (
        <div className="flat-empty">No comments yet</div>
      )}

      {!loading && comments.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Author</th>
                <th>Comment</th>
                <th style={{ minWidth: 220 }}>On Post</th>
                <th style={{ width: 140 }}>Posted</th>
                <th style={{ width: 90, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/students/${c.author?.id}`} className="cell-user">
                      <img
                        className="avatar"
                        width={32}
                        height={32}
                        src={c.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.author?.full_name || 'U'}`}
                        alt=""
                      />
                      <div className="cell-user-info">
                        <div className="cell-user-name">{c.author?.full_name || 'Unknown'}</div>
                      </div>
                    </Link>
                  </td>
                  <td>
                    <div
                      style={{
                        maxWidth: 340,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'var(--text)',
                        fontSize: 13,
                      }}
                    >
                      {c.content}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        maxWidth: 260,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'var(--text-3)',
                        fontSize: 12,
                        fontStyle: 'italic',
                      }}
                    >
                      {c.post?.content ? `"${c.post.content.slice(0, 80)}"` : '—'}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="cell-actions">
                      {c.post?.id && (
                        <Link to={`/posts/${c.post.id}`} className="icon-btn" title="View post">
                          <ChevronRightIcon width={16} height={16} />
                        </Link>
                      )}
                      {isAdmin && (
                        <button
                          className="icon-btn icon-btn-danger"
                          title="Delete"
                          onClick={() => remove(c)}
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
