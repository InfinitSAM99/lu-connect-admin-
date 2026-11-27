import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { ChevronRightIcon } from '../components/Icons.jsx'; 

const SendIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

export default function TeamChat() {
  const { id: otherId } = useParams();
  const navigate = useNavigate();
  const { profile: me } = useAuth();
  
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [lastSeenText, setLastSeenText] = useState('Loading...');

  const messagesEndRef = useRef(null);
  const chatChannel = useRef(null);

  useEffect(() => {
    if (!otherId) return;
    const fetchUser = async () => {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', otherId).single();
      const { data: presence } = await supabase.from('admin_presence').select('last_seen').eq('id', otherId).maybeSingle();
      
      if (profile) {
        setOtherUser({ ...profile, admin_last_seen: presence?.last_seen });
      }
    };
    fetchUser();
  }, [otherId]);

  useEffect(() => {
    if (!otherUser) return;
    const updateStatus = () => {
      const lastSeenTs = otherUser.admin_last_seen ? new Date(otherUser.admin_last_seen).getTime() : 0;
      const isOnline = Date.now() - lastSeenTs < 60000; 
      setOtherOnline(isOnline);
      
      if (isOnline) {
        setLastSeenText('Online');
      } else if (!lastSeenTs) {
        setLastSeenText('Offline');
      } else {
        const secs = Math.floor((Date.now() - lastSeenTs) / 1000);
        if (secs < 3600) setLastSeenText(`Active ${Math.floor(secs / 60)}m ago`);
        else if (secs < 86400) setLastSeenText(`Last seen ${Math.floor(secs / 3600)}h ago`);
        else setLastSeenText(`Last seen ${Math.floor(secs / 86400)}d ago`);
      }
    };
    updateStatus();
    const interval = setInterval(updateStatus, 15000);
    return () => clearInterval(interval);
  }, [otherUser]);

  useEffect(() => {
    if (!me || !otherId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('admin_team_messages')
        .select('*')
        .or(`and(sender_id.eq.${me.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${me.id})`)
        .order('created_at', { ascending: true });

      setMessages(data || []);
      setLoading(false);
      scrollToBottom();

      // MARK MESSAGES AS READ
      await supabase
        .from('admin_team_messages')
        .update({ is_read: true })
        .eq('sender_id', otherId)
        .eq('receiver_id', me.id)
        .eq('is_read', false);
    };

    fetchMessages();

    if (chatChannel.current) supabase.removeChannel(chatChannel.current);
    
    chatChannel.current = supabase
      .channel('admin-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_team_messages' },
        async (payload) => {
          const newMsg = payload.new;
          if (
            (newMsg.sender_id === me.id && newMsg.receiver_id === otherId) ||
            (newMsg.sender_id === otherId && newMsg.receiver_id === me.id)
          ) {
            setMessages((prev) => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            scrollToBottom();

            // If it's a new message from the other person, mark it as read instantly
            if (newMsg.sender_id === otherId) {
              await supabase.from('admin_team_messages').update({ is_read: true }).eq('id', newMsg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (chatChannel.current) supabase.removeChannel(chatChannel.current);
    };
  }, [me, otherId]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !otherUser || sending) return;

    const content = text.trim();
    setText('');
    setSending(true);

    const tempId = 'temp-' + Date.now();
    const optimisticMsg = {
      id: tempId,
      sender_id: me.id,
      receiver_id: otherId,
      content: content,
      created_at: new Date().toISOString(),
      _optimistic: true,
      is_read: false
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const { data, error } = await supabase
        .from('admin_team_messages')
        .insert({ 
          sender_id: me.id, 
          receiver_id: otherId, 
          content: content 
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => prev.map(m => m.id === tempId ? data : m));
      }
    } catch (err) {
      console.error("DB Error:", err);
      alert("Database Error:\n" + err.message); 
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!otherUser) return <div style={{ padding: 20, color: '#fff' }}>Loading user...</div>;

  return (
    <div style={{ 
      position: 'fixed', inset: 0, 
      display: 'flex', flexDirection: 'column', 
      background: '#000', color: '#fff', 
      height: '100%', width: '100%',
      overflow: 'hidden'
    }}>
      
      <div style={{ 
        padding: '16px 20px', paddingTop: 'calc(16px + env(safe-area-inset-top))', 
        background: '#000', borderBottom: '1px solid #1f1f1f', 
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 
      }}>
        <button onClick={() => navigate('/team-chat')} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ChevronRightIcon size={24} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <img src={otherUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUser.full_name}`} style={{ width: 40, height: 40, borderRadius: 20 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{otherUser.full_name}</div>
          <div style={{ fontSize: 12, color: otherOnline ? '#22c55e' : '#6d7382' }}>{lastSeenText}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#6d7382' }}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6d7382', marginTop: 40 }}>No messages yet. Say hi! 👋</div>
        ) : messages.map((m) => {
          const isMine = m.sender_id === me.id;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
              {!isMine && (
                <img src={otherUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUser.full_name}`} style={{ width: 28, height: 28, borderRadius: 14, marginBottom: 4 }} />
              )}
              <div style={{
                maxWidth: '75%', background: isMine ? '#ef4444' : '#262626',
                padding: '10px 14px', borderRadius: 22,
                borderBottomRightRadius: isMine ? 4 : 22,
                borderBottomLeftRadius: !isMine ? 4 : 22,
              }}>
                <div style={{ fontSize: 15, lineHeight: '1.4', color: '#fff', wordWrap: 'break-word' }}>
                  {m.content}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: isMine ? 'rgba(255,255,255,0.7)' : '#aab0bd' }}>
                    {formatTime(m.created_at)}
                  </span>
                  {isMine && (
                    <span style={{ fontSize: 10, color: m._optimistic ? 'rgba(255,255,255,0.4)' : (m.is_read ? '#3b82f6' : '#fff') }}>
                      {m._optimistic ? '✓' : (m.is_read ? '✓✓' : '✓✓')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ 
        padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', 
        background: '#000', borderTop: '1px solid #1f1f1f', 
        display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 
      }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          style={{
            flex: 1, background: '#141414', border: '1px solid #333', borderRadius: 24,
            padding: '12px 20px', color: '#fff', outline: 'none', fontSize: 15
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          style={{
            background: text.trim() ? '#ef4444' : '#1a1a1a',
            color: '#fff', border: 'none', borderRadius: '50%',
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'default', transition: 'background 0.2s', flexShrink: 0
          }}
        >
          <SendIcon size={20} style={{ marginLeft: -2 }} />
        </button>
      </form>
    </div>
  );
}
