import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  CalendarIcon,
  TrashIcon,
  PencilIcon,
  XIcon,
  ChevronRightIcon,
  MapPinIcon,
} from '../components/Icons.jsx';

function fullDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function monthDay(date) {
  if (!date) return ['', ''];
  const d = new Date(date);
  return [
    d.toLocaleDateString([], { month: 'short' }).toUpperCase(),
    String(d.getDate()).padStart(2, '0'),
  ];
}

export default function Events() {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | event object | null
  const [form, setForm] = useState({ title: '', description: '', location: '', starts_at: '', is_published: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('starts_at', { ascending: false });
    setEvents(data || []);
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
    setForm({ title: '', description: '', location: '', starts_at: '', is_published: true });
    setEditing('new');
  };

  const openEdit = (ev) => {
    setActive(null);
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      location: ev.location || '',
      starts_at: ev.starts_at ? ev.starts_at.slice(0, 16) : '',
      is_published: ev.is_published !== false,
    });
    setEditing(ev);
  };

  const save = async () => {
    if (!form.title.trim() || !form.starts_at) {
      alert('Title and start date required');
      return;
    }
    setBusy(true);
    const payload = {
      title: form.title,
      description: form.description,
      location: form.location,
      starts_at: new Date(form.starts_at).toISOString(),
      is_published: form.is_published,
      organizer_id: profile.id,
    };
    if (editing === 'new') {
      const { data: created } = await supabase.from('events').insert(payload).select().single();
      if (created) setEvents((old) => [created, ...old]);
      await supabase.from('admin_audit_logs').insert({
        admin_id: profile.id, action: 'create_event', target_type: 'event',
        details: { title: form.title },
      });
    } else {
      const { error } = await supabase.from('events').update(payload).eq('id', editing.id);
      if (!error) {
        setEvents((old) => old.map((x) => x.id === editing.id ? { ...x, ...payload } : x));
      }
      await supabase.from('admin_audit_logs').insert({
        admin_id: profile.id, action: 'update_event', target_type: 'event', target_id: editing.id,
      });
    }
    setBusy(false);
    setEditing(null);
    setMsg(editing === 'new' ? 'Event created' : 'Event updated');
    setTimeout(() => setMsg(''), 2500);
  };

  const remove = async (ev) => {
    if (!confirm('Delete this event permanently? This cannot be undone.')) return;
    setActive(null);
    setEvents((old) => old.filter((x) => x.id !== ev.id));
    const { error } = await supabase.from('events').delete().eq('id', ev.id);
    if (error) {
      alert('Delete failed: ' + error.message);
      load();
      return;
    }
    await supabase.from('admin_audit_logs').insert({
      admin_id: profile.id, action: 'delete_event', target_type: 'event', target_id: ev.id,
    });
    setMsg('Event deleted');
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 28px', gap: 12,
      }}>
        <CalendarIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Events
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-3)',
          textAlign: 'center', maxWidth: 320, lineHeight: 1.5,
        }}>
          {events.length} {events.length === 1 ? 'event' : 'events'} · manage campus events and schedules
        </div>
      </div>

      {msg && (
        <div style={{ margin: '0 20px 16px', background: 'rgba(34,197,94,.15)', color: '#22c55e', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
          {msg}
        </div>
      )}

      {/* NEW EVENT ROW */}
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
          <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>New event</span>
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
        All events
      </div>

      {loading && <div className="state">Loading…</div>}

      {!loading && events.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          No events yet
        </div>
      )}

      {!loading && events.map((ev) => {
        const [mon, day] = monthDay(ev.starts_at);
        return (
          <button
            key={ev.id}
            onClick={() => setActive(ev)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              width: '100%', padding: '14px 20px',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--border)',
              color: '#fff', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: 'var(--surface-2)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: 0.6 }}>
                {mon}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                {day}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 500, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {ev.title}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--text-3)', marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {fullDate(ev.starts_at)}{ev.location ? ` · ${ev.location}` : ''}
              </div>
            </div>
            {!ev.is_published && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: 0.6,
                padding: '3px 8px', borderRadius: 6,
                background: 'var(--surface-2)', flexShrink: 0,
              }}>
                Draft
              </span>
            )}
            <ChevronRightIcon width={18} height={18} style={{ opacity: 0.4, flexShrink: 0 }} />
          </button>
        );
      })}

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
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                  {active.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>
                  {fullDate(active.starts_at)}
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

              {active.description && (
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
                  }}>
                    Description
                  </div>
                  <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                    {active.description}
                  </div>
                </div>
              )}

              {active.location && (
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
                  }}>
                    Location
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 14 }}>
                    <MapPinIcon width={18} height={18} />
                    {active.location}
                  </div>
                </div>
              )}

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => openEdit(active)}
                  style={actionBtn('transparent', '#3b82f6', '1.5px solid #3b82f6')}
                >
                  <PencilIcon width={20} height={20} />
                  Edit event
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
              <CalendarIcon width={56} height={56} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>
                {editing === 'new' ? 'New event' : 'Edit event'}
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
              <FormInput type="text" placeholder="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              <FormTextarea placeholder="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
              <FormInput type="text" placeholder="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
              <FormInput type="datetime-local" placeholder="Starts at" value={form.starts_at} onChange={(v) => setForm({ ...form, starts_at: v })} />

              <button
                onClick={() => setForm({ ...form, is_published: !form.is_published })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: 16,
                  background: 'var(--surface-2)', border: 'none',
                  borderRadius: 14, color: '#fff', cursor: 'pointer',
                  fontSize: 15, fontWeight: 500,
                }}
              >
                Published
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: form.is_published ? '#22c55e' : 'var(--text-3)',
                }}>
                  {form.is_published ? 'ON' : 'OFF'}
                </span>
              </button>

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
                {busy ? 'Saving…' : (editing === 'new' ? 'Create event' : 'Save changes')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FormInput({ type, placeholder, value, onChange }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%', padding: 16,
        background: 'var(--surface-2)', border: 'none',
        borderRadius: 14, color: '#fff',
        fontSize: 15, fontFamily: 'inherit',
        outline: 'none',
      }}
    />
  );
}

function FormTextarea({ placeholder, value, onChange }) {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      style={{
        width: '100%', minHeight: 100, padding: 16,
        background: 'var(--surface-2)', border: 'none',
        borderRadius: 14, color: '#fff',
        fontSize: 15, fontFamily: 'inherit',
        outline: 'none', resize: 'vertical',
      }}
    />
  );
}

const actionBtn = (bg, color, border) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '16px', background: bg, color,
  border: border || 'none', borderRadius: 14,
  fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
});
