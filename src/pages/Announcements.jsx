import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  MegaphoneIcon,
  TrashIcon,
  PencilIcon,
  XIcon,
  ChevronRightIcon,
} from '../components/Icons.jsx';

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fullDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString() + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Announcements() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '',
    is_pinned: false, is_important: false, is_published: true,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

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
    if (dragY > 100) setActive(null);
    setDragY(0);
    activeRef.current = false;
  };

  const openNew = () => {
    setForm({ title: '', description: '', is_pinned: false, is_important: false, is_published: true });
    setEditing('new');
  };

  const openEdit = (a) => {
    setActive(null);
    setForm({
      title: a.title || '',
      description: a.description || '',
      is_pinned: !!a.is_pinned,
      is_important: !!a.is_important,
      is_published: a.is_published !== false,
    });
    setEditing(a);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      alert('Title and description required');
      return;
    }
    setBusy(true);

    if (editing === 'new') {
      const { data: created, error } = await supabase
        .from('announcements')
        .insert({ ...form, author_id: profile.id })
        .select()
        .single();
      if (error) { setBusy(false); alert(error.message); return; }
      if (created) setItems((old) => [created, ...old]);
      await supabase.from('admin_audit_logs').insert({
        admin_id: profile.id, action: 'create_announcement',
        target_type: 'announcement', details: { title: form.title },
      });
      setMsg('Announcement published');
    } else {
      const { error } = await supabase
        .from('announcements')
        .update(form)
        .eq('id', editing.id);
      if (error) { setBusy(false); alert(error.message); return; }
      setItems((old) => old.map((x) => x.id === editing.id ? { ...x, ...form } : x));
      await supabase.from('admin_audit_logs').insert({
        admin_id: profile.id, action: 'update_announcement',
        target_type: 'announcement', target_id: editing.id,
      });
      setMsg('Announcement updated');
    }

    setBusy(false);
    setEditing(null);
    setTimeout(() => setMsg(''), 2500);
  };

  const remove = async (a) => {
    if (!confirm('Delete this announcement permanently? This cannot be undone.')) return;
    setActive(null);
    setItems((old) => old.filter((x) => x.id !== a.id));
    const { error } = await supabase.from('announcements').delete().eq('id', a.id);
    if (error) {
      alert('Delete failed: ' + error.message);
      load();
      return;
    }
    await supabase.from('admin_audit_logs').insert({
      admin_id: profile.id, action: 'delete_announcement',
      target_type: 'announcement', target_id: a.id,
    });
    setMsg('Announcement deleted');
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 28px', gap: 12,
      }}>
        <MegaphoneIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Announcements
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-3)',
          textAlign: 'center', maxWidth: 320, lineHeight: 1.5,
        }}>
          {items.length} {items.length === 1 ? 'announcement' : 'announcements'} · shown on the student app
        </div>
      </div>

      {msg && (
        <div style={{ margin: '0 20px 16px', background: 'rgba(34,197,94,.15)', color: '#22c55e', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
          {msg}
        </div>
      )}

      {/* NEW ANNOUNCEMENT ROW */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={openNew}
          style={{
            display: 'flex', alignItems: 'center', gap: 18,
            width: '100%', padding: '20px 16px',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--border)',
            color: '#fff', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 5, background: '#3b82f6', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>New announcement</span>
          <span style={{ display: 'inline-flex', color: 'var(--text-3)', opacity: 0.5 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </button>
      </div>

      {/* LIST */}
      <div style={{
        padding: '20px 20px 8px',
        fontSize: 12, fontWeight: 600, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: 1,
      }}>
        All announcements
      </div>

      {loading && <div className="state">Loading…</div>}

      {!loading && items.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          No announcements yet
        </div>
      )}

      {!loading && items.map((a) => (
        <button
          key={a.id}
          onClick={() => { setActive(a); setDragY(0); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            width: '100%', padding: '16px 20px',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--border)',
            color: '#fff', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{
                fontSize: 15, fontWeight: 500, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: 200,
              }}>
                {a.title}
              </span>
              {a.is_pinned && <Badge color="#ef4444">Pinned</Badge>}
              {a.is_important && <Badge color="#eab308">Important</Badge>}
              {!a.is_published && <Badge color="#6d7382">Draft</Badge>}
            </div>
            <div style={{
              fontSize: 12, color: 'var(--text-3)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {a.description} · {timeAgo(a.published_at)}
            </div>
          </div>
          <ChevronRightIcon width={18} height={18} style={{ opacity: 0.4, flexShrink: 0 }} />
        </button>
      ))}

      {/* ACTION DRAWER */}
      {active && (
        <>
          <div
            onClick={() => setActive(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              maxHeight: '90vh', background: 'var(--surface)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 310, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', animation: 'drawer-slide-up 250ms ease-out',
              transform: `translateY(${dragY}px)`,
              transition: dragY === 0 ? 'transform 200ms ease-out' : 'none',
            }}
          >
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 0 6px', flexShrink: 0, touchAction: 'none', cursor: 'grab',
              }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 28 }}>
              <div style={{
                padding: '8px 20px 20px',
                borderBottom: '1px solid var(--border)',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {active.is_pinned && <Badge color="#ef4444">Pinned</Badge>}
                  {active.is_important && <Badge color="#eab308">Important</Badge>}
                  {!active.is_published && <Badge color="#6d7382">Draft</Badge>}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                  {active.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>
                  {fullDate(active.published_at)}
                </div>
                <button
                  onClick={() => setActive(null)}
                  style={{
                    position: 'absolute', top: 4, right: 12,
                    background: 'transparent', border: 'none',
                    color: '#fff', padding: 8, cursor: 'pointer',
                  }}
                >
                  <XIcon width={22} height={22} />
                </button>
              </div>

              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
                }}>
                  Message
                </div>
                <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {active.description}
                </div>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => openEdit(active)}
                  style={actionBtn('transparent', '#3b82f6', '1.5px solid #3b82f6')}
                >
                  <PencilIcon width={20} height={20} />
                  Edit announcement
                </button>
                <button
                  onClick={() => remove(active)}
                  style={actionBtn('transparent', 'var(--brand)', '1.5px solid var(--brand)')}
                >
                  <TrashIcon width={20} height={20} />
                  Delete permanently
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CREATE / EDIT DRAWER */}
      {editing && (
        <>
          <div
            onClick={() => setEditing(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              maxHeight: '92vh', background: 'var(--surface)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 310, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', animation: 'drawer-slide-up 250ms ease-out',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 6px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 20px 20px',
              borderBottom: '1px solid var(--border)',
              position: 'relative',
            }}>
              <MegaphoneIcon width={56} height={56} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>
                {editing === 'new' ? 'New announcement' : 'Edit announcement'}
              </div>
              <button
                onClick={() => setEditing(null)}
                style={{
                  position: 'absolute', top: 4, right: 12,
                  background: 'transparent', border: 'none',
                  color: '#fff', padding: 8, cursor: 'pointer',
                }}
              >
                <XIcon width={22} height={22} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={5}
                style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
              />

              <ToggleRow
                label="Pin to top"
                on={form.is_pinned}
                onClick={() => setForm({ ...form, is_pinned: !form.is_pinned })}
              />
              <ToggleRow
                label="Mark important"
                on={form.is_important}
                onClick={() => setForm({ ...form, is_important: !form.is_important })}
              />
              <ToggleRow
                label="Published"
                on={form.is_published}
                onClick={() => setForm({ ...form, is_published: !form.is_published })}
              />

              <button
                onClick={save}
                disabled={busy}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', padding: 16, marginTop: 8,
                  background: 'var(--brand)', color: '#fff',
                  border: 'none', borderRadius: 16,
                  fontSize: 15, fontWeight: 600,
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                {busy ? 'Saving…' : (editing === 'new' ? 'Publish announcement' : 'Save changes')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color, textTransform: 'uppercase',
      letterSpacing: 0.6,
      padding: '2px 7px', borderRadius: 6,
      background: `${color}22`,
      flexShrink: 0,
    }}>
      {children}
    </span>
  );
}

function ToggleRow({ label, on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: 16,
        background: 'var(--surface-2)', border: 'none',
        borderRadius: 14, color: '#fff', cursor: 'pointer',
        fontSize: 15, fontWeight: 500,
      }}
    >
      {label}
      <span style={{
        fontSize: 12, fontWeight: 700,
        color: on ? '#22c55e' : 'var(--text-3)',
      }}>
        {on ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

const inputStyle = {
  width: '100%', padding: 16,
  background: 'var(--surface-2)', border: 'none',
  borderRadius: 14, color: '#fff',
  fontSize: 15, fontFamily: 'inherit',
  outline: 'none',
};

const actionBtn = (bg, color, border) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '16px', background: bg, color,
  border: border || 'none', borderRadius: 14,
  fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
});
