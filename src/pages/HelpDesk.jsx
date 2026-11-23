import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  MailIcon,
  SearchIcon,
  XIcon,
  ChevronRightIcon,
  TrashIcon,
} from '../components/Icons.jsx';

const GOLD = '#FFD700';

export default function HelpDesk() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const loadMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => { loadMessages(); }, []);

  const handleSelect = async (msg) => {
    setSelected(msg);
    if (!msg.is_read) {
      await supabase.from('contact_messages').update({ is_read: true }).eq('id', msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  const deleteMessage = async (id) => {
    if (!confirm('Delete this message permanently?')) return;
    await supabase.from('contact_messages').delete().eq('id', id);
    setSelected(null);
    loadMessages();
  };

  const filtered = useMemo(() => {
    return messages
      .filter(m => filter === 'all' ? true : filter === 'unread' ? !m.is_read : m.is_read)
      .filter(m => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          (m.name || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.message || '').toLowerCase().includes(q)
        );
      });
  }, [messages, filter, query]);

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100%', maxWidth: 700, margin: '0 auto', padding: '0 16px' }}>
      
      {/* HEADER MATCHING STUDENTS/POSTS PAGES */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40, marginBottom: 30 }}>
        <div style={{ marginBottom: 16 }}>
          <MailIcon width={72} height={72} style={{ color: '#fff' }} />
        </div>
        <div style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Help Desk</div>
        <div style={{ color: '#6d7382', fontSize: 14, textAlign: 'center', maxWidth: 300 }}>
          Messages from the LU Connect website contact form.
        </div>
      </div>

      {/* SEARCH BAR */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#111',
          border: '1px solid #222',
          borderRadius: 16,
          padding: '14px 16px',
        }}>
          <SearchIcon width={20} height={20} style={{ color: '#6d7382', flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or message"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: 15,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              aria-label="Clear search"
            >
              <XIcon width={18} height={18} style={{ color: '#6d7382' }} />
            </button>
          )}
        </div>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, padding: '0 4px' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread' },
          { key: 'read', label: 'Read' },
        ].map(t => {
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
                color: active ? GOLD : '#6d7382',
                fontSize: 14,
                fontWeight: 700,
                padding: '8px 0',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* FLAT LIST */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid #1f1f1f',
            borderTopColor: '#ef4444',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: '#6d7382', textAlign: 'center', marginTop: 40, fontSize: 15 }}>
          {query ? 'No messages match your search.' : 'No support messages yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map((msg) => {
            const unread = !msg.is_read;
            return (
              <div
                key={msg.id}
                onClick={() => handleSelect(msg)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '20px 0',
                  borderBottom: '1px solid #1f1f1f',
                  cursor: 'pointer',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 48, height: 48, borderRadius: 24,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 18,
                  color: '#fff',
                  background: '#1f1f1f',
                  flexShrink: 0,
                }}>
                  {(msg.name || '?').charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
                      {msg.name || 'Unknown'}
                    </span>
                    {unread && <span style={{ width: 8, height: 8, borderRadius: 4, background: GOLD, flexShrink: 0 }} />}
                  </div>
                  <div style={{ color: '#6d7382', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.message}
                  </div>
                </div>

                <ChevronRightIcon width={20} height={20} style={{ color: '#3f3f3f' }} />
              </div>
            );
          })}
        </div>
      )}

      {/* PREMIUM BOTTOM SHEET — detail */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
            zIndex: 1000, display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#000',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              width: '100%', maxHeight: '90vh', overflowY: 'auto',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 16 }}>
              <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px' }}>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, display: 'flex' }}
                aria-label="Close"
              >
                <XIcon width={24} height={24} style={{ color: '#fff' }} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px 24px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 32,
                background: `linear-gradient(135deg, ${GOLD}, #b8860b)`,
                boxShadow: `0 0 20px rgba(255,215,0,0.35)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 24, color: '#000',
                flexShrink: 0,
              }}>
                {(selected.name || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
                  {selected.name}
                </div>
                <a
                  href={`mailto:${selected.email}`}
                  style={{ color: GOLD, fontSize: 13, textDecoration: 'none', fontWeight: 600, display: 'block' }}
                >
                  {selected.email}
                </a>
              </div>
            </div>

            <div style={{ padding: '0 24px 24px' }}>
              <div style={{ color: '#6d7382', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 10 }}>MESSAGE</div>
              <div style={{
                background: '#0a0a0a',
                border: '1px solid #1f1f1f',
                borderRadius: 14,
                padding: 20,
                color: '#e5e7eb',
                fontSize: 15,
                lineHeight: 1.7,
              }}>
                {selected.message}
              </div>
            </div>

            <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={`mailto:${selected.email}?subject=Re: LU Connect Support - ${selected.name}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: '#ef4444',
                  color: '#fff',
                  padding: 16,
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: 1.5,
                }}
              >
                <MailIcon width={18} height={18} style={{ color: '#fff' }} />
                REPLY VIA EMAIL
              </a>

              <button
                onClick={() => deleteMessage(selected.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'transparent',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.25)',
                  padding: 14,
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: 1.5,
                  cursor: 'pointer',
                }}
              >
                <TrashIcon width={16} height={16} style={{ color: '#ef4444' }} />
                DELETE MESSAGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
