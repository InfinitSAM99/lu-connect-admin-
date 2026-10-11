import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  FileTextIcon,
  TrashIcon,
  XIcon,
  ChevronRightIcon,
  UserIcon,
} from '../components/Icons.jsx';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fullDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString() + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Posts() {
  const { profile: me, isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('id, content, created_at, author_id, is_deleted, profiles:author_id(id, full_name, avatar_url, username)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(500);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
    activeRef.current = true;
  };
  const onTouchMove = (e) => {
    if (!activeRef.current) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 100) setDrawer(null);
    setDragY(0);
    activeRef.current = false;
  };

  const closeDrawer = () => {
    setDrawer(null);
    setDragY(0);
  };

  const removePost = async (p) => {
    if (!confirm('Remove this post? It will be hidden from all users.')) return;
    const { error } = await supabase.rpc('soft_delete_post', { post_id: p.id });
    if (error) { alert('Delete failed: ' + error.message); return; }
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action: 'delete_post',
      target_type: 'post',
      target_id: p.id,
      details: { content: p.content?.slice(0, 100) },
    });
    setPosts((old) => old.filter((x) => x.id !== p.id));
  };

  // Group by author
  const authors = [];
  const map = {};
  posts.forEach((p) => {
    const id = p.author_id || 'unknown';
    if (!map[id]) {
      map[id] = {
        id,
        profile: p.profiles || null,
        posts: [],
      };
      authors.push(map[id]);
    }
    map[id].posts.push(p);
  });
  authors.sort((a, b) => b.posts.length - a.posts.length);

  const drawerPosts = drawer ? drawer.posts : [];

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 24px 28px',
          gap: 12,
        }}
      >
        <FileTextIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Posts
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-3)',
            textAlign: 'center',
            maxWidth: 300,
            lineHeight: 1.5,
          }}
        >
          All posts grouped by author. Tap a name to review.
        </div>
      </div>

      {loading && <div className="state">Loading…</div>}

      {!loading && authors.length === 0 && (
        <div
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 13,
          }}
        >
          No posts yet
        </div>
      )}

      {/* AUTHOR LIST */}
      {!loading && authors.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {authors.map((a) => (
            <button
              key={a.id}
              onClick={() => setDrawer(a)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                width: '100%',
                padding: '14px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: 'var(--surface-2)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {a.profile?.avatar_url ? (
                  <img
                    src={a.profile.avatar_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <UserIcon width={22} height={22} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {a.profile?.full_name || 'Unknown'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                  {a.posts.length} {a.posts.length === 1 ? 'post' : 'posts'}
                </div>
              </div>

              <ChevronRightIcon width={18} height={18} style={{ opacity: 0.4, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {/* DRAWER — author's posts */}
      {drawer && (
        <>
          <div
            onClick={closeDrawer}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: '88vh',
              background: 'var(--surface)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              zIndex: 210,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'drawer-slide-up 250ms ease-out',
              transform: `translateY(${dragY}px)`,
              transition: dragY === 0 ? 'transform 200ms ease-out' : 'none',
            }}
          >
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 0 6px',
                flexShrink: 0,
                touchAction: 'none',
                cursor: 'grab',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.35)',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 20px 20px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: 'var(--surface-2)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {drawer.profile?.avatar_url ? (
                  <img
                    src={drawer.profile.avatar_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <UserIcon width={26} height={26} />
                )}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>
                {drawer.profile?.full_name || 'Unknown'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                {drawerPosts.length} {drawerPosts.length === 1 ? 'post' : 'posts'}
              </div>

              <button
                onClick={closeDrawer}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 12,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  padding: 8,
                  cursor: 'pointer',
                }}
              >
                <XIcon width={22} height={22} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              {drawerPosts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
                    {fullDate(p.created_at)}
                  </div>

                  <div
                    style={{
                      fontSize: 15,
                      lineHeight: 1.5,
                      color: '#fff',
                      marginBottom: 12,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {p.content || '(media only)'}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => removePost(p)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '12px',
                        background: 'transparent',
                        color: 'var(--brand)',
                        border: '1.5px solid var(--brand)',
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <TrashIcon width={18} height={18} />
                      Delete post
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
