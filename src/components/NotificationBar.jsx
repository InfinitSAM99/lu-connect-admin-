import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  AlertTriangleIcon, 
  FileTextIcon, 
  CreditCardIcon, 
  ShieldCheckIcon,
  MessageIcon,
  ClockIcon,
  RocketIcon
} from './Icons.jsx';

export default function NotificationBar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const [counts, setCounts] = useState({
    approvals: 0, appeals: 0, payments: 0, reports: 0,
    helpdesk: 0, recovery: 0, security: 0, boosts: 0
  });

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [a, ap, p, r, h, rec, s, b] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_bot', false).eq('approval_status', 'pending'),
          supabase.from('appeals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('helpdesk_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
          supabase.from('recovery_messages').select('*', { count: 'exact', head: true }).eq('is_read', false),
          supabase.from('security_logs').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
          supabase.from('boosts').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ]);

        setCounts({
          approvals: a.count || 0, appeals: ap.count || 0, payments: p.count || 0,
          reports: r.count || 0, helpdesk: h.count || 0, recovery: rec.count || 0,
          security: s.count || 0, boosts: b.count || 0
        });
      } catch (err) { console.error(err); }
    }
    fetchCounts();
    
    const channel = supabase.channel('notif-bar').on('postgres_changes', { event: '*', schema: 'public' }, fetchCounts).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const items = [
    { id: 'approvals', icon: <ShieldCheckIcon width={22} height={22} />, badge: counts.approvals, path: '/pending-approvals' },
    { id: 'appeals', icon: <AlertTriangleIcon width={22} height={22} />, badge: counts.appeals, path: '/appeals' },
    { id: 'payments', icon: <CreditCardIcon width={22} height={22} />, badge: counts.payments, path: '/payments' },
    { id: 'reports', icon: <FileTextIcon width={22} height={22} />, badge: counts.reports, path: '/moderation' },
    { id: 'helpdesk', icon: <MessageIcon width={22} height={22} />, badge: counts.helpdesk, path: '/help-desk' },
    { id: 'recovery', icon: <ClockIcon width={22} height={22} />, badge: counts.recovery, path: '/recovery-messages' },
    { id: 'security', icon: <ShieldCheckIcon width={22} height={22} />, badge: counts.security, path: '/security-center' },
    { id: 'boosts', icon: <RocketIcon width={22} height={22} />, badge: counts.boosts, path: '/boosts' },
  ];

  const totalUnread = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      {isOpen && (
        <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1500 }} />
      )}

      <div
        style={{
          position: 'fixed',
          left: 16, 
          top: '50%',
          transform: isOpen ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(-150%)',
          opacity: isOpen ? 1 : 0,
          background: '#0a0a0a',
          borderRadius: 32, 
          padding: '16px 8px',
          display: 'flex', flexDirection: 'column', gap: 20,
          boxShadow: '0 10px 30px rgba(0,0,0,0.9)',
          zIndex: 1501, border: '1px solid #1f1f1f',
          transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => { setIsOpen(false); navigate(item.path); }}
            style={{ position: 'relative', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}
          >
            {item.icon}
            {item.badge > 0 && (
              <div style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 900, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #0a0a0a' }}>
                {item.badge > 99 ? '99+' : item.badge}
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', bottom: 90, right: 24,
          width: 60, height: 60, borderRadius: 30,
          background: '#ef4444', color: '#fff', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)',
          zIndex: 1502, cursor: 'pointer',
          transition: 'transform 300ms',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        
        {totalUnread > 0 && !isOpen && (
          <div style={{ position: 'absolute', top: -4, right: -4, background: '#fff', color: '#ef4444', fontSize: 12, fontWeight: 900, width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #ef4444' }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </div>
        )}
      </button>
    </>
  );
}
