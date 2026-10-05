import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

export default function Posts() {
  const { profile: me, isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('posts')
      .select('*, profiles:author_id(id, full_name, avatar_url)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }).limit(100);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (p) => {
   if (!confirm('Remove this post?')) return;
   const { error } = await supabase.rpc('soft_delete_post', { post_id: p.id });
   if (error) { alert('Delete failed: ' + error.message); return; }
   await supabase.from('admin_audit_logs').insert({
    admin_id: me.id, action: 'delete_post', target_type: 'post', target_id: p.id,
    details: { content: p.content?.slice(0, 100) },
   });
   load();
  };
	                         
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Post Management</h1>

      {loading && <div className="state">Loading…</div>}
      {!loading && posts.length === 0 && <div className="card state"><h3>No posts</h3></div>}

      <div style={{ display: 'grid', gap: 10 }}>
        {posts.map((p) => (
          <div key={p.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <img className="avatar" width={32} height={32}
                src={p.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.profiles?.full_name}`} alt="" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.profiles?.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(p.created_at).toLocaleString()}</div>
              </div>
              {isAdmin && <button className="btn btn-ghost" onClick={() => remove(p)}>Delete</button>}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{p.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
