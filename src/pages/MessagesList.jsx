import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS, ROLE_COLORS } from '../lib/roles';
import { UserIcon, ChevronRightIcon } from '../components/Icons.jsx';

export default function MessagesList() {
  const { profile: me } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState([]);
  const [presence, setPresence] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0); // Used to force time updates

  // 1. Fetch team and their presence
  useEffect(() => {
    const fetchTeam = async () => {
      // Fetch admins/mods
      const { data: teamData } = await supabase
        .from('profiles')
        .select('*, roles!inner(name, level)')
        .gte('roles.level', 1)
        .order('created_at', { ascending: false });

      // Fetch presence
      const { data: presenceData } = await supabase
        .from('admin_presence')
        .select('id, last_seen');

      const presenceMap = {};
      presenceData?.forEach(p => presenceMap[p.id] = p.last_seen);

      // Fetch unread messages for me
      const { data: unreadData } = await supabase
        .from('admin_team_messages')
        .select('sender_id')
        .eq('receiver_id', me.id)
        .eq('is_read', false);

      const unreadMap = {};
      unreadData?.forEach(m => {
        unreadMap[m.sender_id] = (unreadMap[m.sender_id] || 0) + 1;
      });

      if (teamData) {
        // Sort: Online first, then by role level
        const sorted = teamData
          .filter(u => u.id !== me.id)
          .sort((a, b) => {
            const aOnline = presenceMap[a.id] && (Date.now() - new Date(presenceMap[a.id]).getTime() < 60000);
            const bOnline = presenceMap[b.id] && (Date.now() - new Date(presenceMap[b.id]).getTime() < 60000);
            if (aOnline && !bOnline) return -1;
            if (!aOnline && bOnline) return 1;
            return (b.roles?.level || 0) - (a.roles?.level || 0);
          });
        setTeam(sorted);
      }
      
      setPresence(presenceMap);
      setUnreadCounts(unreadMap);
      setLoading(false);
    };

    fetchTeam();

    // Realtime listener for new messages (updates unread badge instantly)
    const channel = supabase
      .channel('team-list-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_team_messages', filter: `receiver_id=eq.${me.id}` }, (payload) => {
        const senderId = payload.new.sender_id;
        setUnreadCounts(prev => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1
        }));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [me.id]);

  // 2. Heartbeat to update "Last seen X ago" every minute
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatLastSeen = (userId) => {
    const lastSeen = presence[userId];
    if (!lastSeen) return 'Offline';
    const secs = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
    
    if (secs < 60) return 'Online';
    if (secs < 3600) return `Active ${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `Last seen ${Math.floor(secs / 3600)}h ago`;
    return `Last seen ${Math.floor(secs / 86400)}d ago`;
  };

  return (
    <div style={{ paddingBottom: 40, background: '#000', minHeight: '100vh' }}>
      <div style={{ padding: '20px 20px 10px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Team Messages</h1>
        
        <div style={{ background: '#111', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <UserIcon width={18} height={18} color="#6d7382" />
          <input type="text" placeholder="Search team..." style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontSize: 15 }} />
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6d7382', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Admins & Moderators
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#6d7382', padding: 20 }}>Loading team...</div>
        ) : team.map(u => {
          const lastSeenTs = presence[u.id] ? new Date(presence[u.id]).getTime() : 0;
          const isOnline = Date.now() - lastSeenTs < 60000;
          const unread = unreadCounts[u.id] || 0;
          
          return (
            <button
              key={u.id}
              onClick={() => navigate(`/team-chat/${u.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                padding: '14px 0', background: 'transparent', border: 'none',
                borderBottom: '1px solid #1f1f1f', textAlign: 'left', cursor: 'pointer'
              }}
            >
              <div style={{ position: 'relative' }}>
                <img 
                  src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.full_name}`} 
                  style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#1a1a1a' }} 
                />
                {isOnline && (
                  <div style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, background: '#22c55e', border: '2px solid #000' }} />
                )}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: '#fff', fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.full_name}
                  </span>
                  <span style={{ fontSize: 11, color: ROLE_COLORS[u.roles?.name] || '#6d7382', fontWeight: 800, textTransform: 'uppercase' }}>
                    {ROLE_LABELS[u.roles?.name]}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: isOnline ? '#22c55e' : '#6d7382', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatLastSeen(u.id)}
                  </div>
                  {/* UNREAD BADGE */}
                  {unread > 0 && (
                    <div style={{ 
                      background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, 
                      width: 20, height: 20, borderRadius: 10, display: 'flex', 
                      alignItems: 'center', justifyContent: 'center' 
                    }}>
                      {unread}
                    </div>
                  )}
                </div>
              </div>
              <ChevronRightIcon width={16} height={16} color="#333" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
