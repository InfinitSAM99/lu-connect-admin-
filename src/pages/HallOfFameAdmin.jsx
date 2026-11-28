import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldCheckIcon, XIcon } from '../components/Icons.jsx';

export default function HallOfFameAdmin() {
  const { profile: me } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [seasonActive, setSeasonActive] = useState(true);
  
  // State for the bottom drawer
  const [activeUser, setActiveUser] = useState(null);
  // State for the congratulations screen
  const [crownedUser, setCrownedUser] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  const loadData = async () => {
    setLoading(true);
    const { data: leadersData } = await supabase.from('leaderboard_view').select('*').limit(15);
    setLeaders(leadersData || []);

    const { data: setting } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'season_active').maybeSingle();
    setSeasonActive(setting?.setting_value === 'true' || setting?.setting_value === true);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const nextYear = new Date(now.getFullYear() + 1, 0, 1); // Jan 1st next year
      const diff = nextYear.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Season Resetting...');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const crownWinner = async (user) => {
    setBusy(true);
    const year = new Date().getFullYear();

    // 1. Save winner
    await supabase.from('hall_of_fame_winners').insert({
      user_id: user.id, year, category: 'overall', final_score: user.total_score,
    });
    
    // 2. Pause season
    await supabase.from('system_settings').upsert({ setting_key: 'season_active', setting_value: 'false', updated_at: new Date().toISOString() });
    
    // 3. Log action
    await supabase.from('admin_audit_logs').insert({ admin_id: me.id, action: 'crown_winner', target_type: 'user', target_id: user.id, details: { year, score: user.total_score } });
    
    // 4. Notify user
    await supabase.from('notifications').insert({ user_id: user.id, type: 'trophy', title: `👑 Winner of ${year}!`, body: `You have been crowned the LU CONNECT Winner of the Year.`, link: '/hall-of-fame' });

    // Show visual confirmation
    setActiveUser(null);
    setCrownedUser(user);
    
    // Auto-dismiss congrats screen after 4 seconds
    setTimeout(() => {
      setCrownedUser(null);
      setBusy(false);
      loadData();
    }, 4000);
  };

  const startNewSeason = async () => {
    if (!window.confirm("Reset all scores to 0 and start a new season?")) return;
    setBusy(true);
    const now = new Date().toISOString();
    await supabase.from('system_settings').upsert({ setting_key: 'season_reset_date', setting_value: now, updated_at: now });
    await supabase.from('system_settings').upsert({ setting_key: 'season_active', setting_value: 'true', updated_at: now });
    setBusy(false);
    loadData();
  };

  return (
    <div style={{ padding: 20, background: '#000', minHeight: '100vh', position: 'relative' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <ShieldCheckIcon width={28} height={28} color="#E5C07B" />
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 900, margin: 0 }}>Hall of Fame</h1>
      </div>

      <div style={{ background: '#111', padding: 16, borderRadius: 12, border: '1px solid #222', marginBottom: 24, textAlign: 'center' }}>
        <div style={{ color: '#6d7382', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Season Resets In</div>
        <div style={{ color: '#E5C07B', fontSize: 24, fontWeight: 900, marginTop: 8 }}>{timeLeft || 'Calculating...'}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ color: '#6d7382', fontSize: 14 }}>
          Season: <span style={{ color: seasonActive ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{seasonActive ? 'LIVE' : 'FINISHED'}</span>
        </div>
        {!seasonActive && (
          <button onClick={startNewSeason} disabled={busy} style={{ background: '#1f1f1f', color: '#fff', padding: '8px 16px', borderRadius: 8, border: '1px solid #333', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Start New Season
          </button>
        )}
      </div>

      {/* FLAT LIST */}
      {loading ? <div style={{ color: '#6d7382' }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {leaders.map((user, i) => (
            <button
              key={user.id}
              onClick={() => setActiveUser(user)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                padding: '16px 0', background: 'transparent', border: 'none',
                borderBottom: '1px solid #1f1f1f', cursor: 'pointer', textAlign: 'left'
              }}
            >
              <div style={{ width: 24, color: '#6d7382', fontWeight: 800, fontSize: 14 }}>#{i + 1}</div>
              <img src={user.avatar_url || 'https://via.placeholder.com/40'} style={{ width: 48, height: 48, borderRadius: 24 }} alt="" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name}</div>
              </div>
              <div style={{ color: '#E5C07B', fontWeight: 900, fontSize: 20 }}>{Math.round(user.total_score)}%</div>
            </button>
          ))}
        </div>
      )}

      {/* BOTTOM DRAWER (¾ screen) */}
      {activeUser && !crownedUser && (
        <>
          <div onClick={() => setActiveUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, height: '75vh', background: '#0a0a0a',
            borderTopLeftRadius: 24, borderTopRightRadius: 24, zIndex: 310, display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s ease-out'
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            <button onClick={() => setActiveUser(null)} style={{ position: 'absolute', top: 16, right: 16, background: '#1f1f1f', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 320 }}>
              <XIcon width={18} height={18} />
            </button>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 32 }}>
                <img src={activeUser.avatar_url || 'https://via.placeholder.com/120'} style={{ width: 96, height: 96, borderRadius: 48, border: '3px solid #E5C07B', marginBottom: 16 }} alt="" />
                <div style={{ color: '#fff', fontSize: 24, fontWeight: 900 }}>{activeUser.full_name}</div>
                <div style={{ color: '#6d7382', fontSize: 14, marginTop: 4 }}>{activeUser.university_name || 'Student'}</div>
                <div style={{ color: '#E5C07B', fontSize: 48, fontWeight: 900, marginTop: 16, lineHeight: 1 }}>
                  {Math.round(activeUser.total_score)}<span style={{ fontSize: 24 }}>%</span>
                </div>
                <div style={{ color: '#6d7382', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Total Score</div>
              </div>

              {/* Clean Text Stats (No Boxes) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f1f1f', paddingBottom: 12 }}>
                  <span style={{ color: '#6d7382', fontSize: 15 }}>Followers</span>
                  <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{activeUser.followers}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f1f1f', paddingBottom: 12 }}>
                  <span style={{ color: '#6d7382', fontSize: 15 }}>Total Likes</span>
                  <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{activeUser.likes}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f1f1f', paddingBottom: 12 }}>
                  <span style={{ color: '#6d7382', fontSize: 15 }}>Comments</span>
                  <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{activeUser.comments}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f1f1f', paddingBottom: 12 }}>
                  <span style={{ color: '#6d7382', fontSize: 15 }}>Connections</span>
                  <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{activeUser.connections}</span>
                </div>
              </div>

              {/* Crown Button */}
              {true && (
                <button onClick={() => crownWinner(activeUser)} disabled={busy} style={{ width: '100%', background: '#E5C07B', color: '#000', border: 'none', padding: 18, borderRadius: 14, fontSize: 16, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {busy ? 'Crowning...' : '👑 Crown as Winner'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* CONGRATULATIONS VISUAL SCREEN */}
      {crownedUser && (
        <div style={{
          position: 'fixed', inset: 0, background: '#000', zIndex: 500,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <div style={{ fontSize: 80, marginBottom: 20, animation: 'pulse 1s infinite' }}>👑</div>
          <h1 style={{ color: '#E5C07B', fontSize: 32, fontWeight: 900, margin: 0, textAlign: 'center' }}>Congratulations!</h1>
          <p style={{ color: '#fff', fontSize: 18, marginTop: 10, textAlign: 'center', padding: '0 20px' }}>
            <strong>{crownedUser.full_name}</strong> is the new Winner of the Year!
          </p>
          <p style={{ color: '#6d7382', fontSize: 14, marginTop: 10 }}>Their profile has been updated with the crown.</p>
        </div>
      )}

      {/* Embedded CSS for animations */}
      <style>
        {`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        `}
      </style>
    </div>
  );
}
