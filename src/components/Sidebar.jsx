import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  UsersIcon, 
  AlertTriangleIcon, 
  FileTextIcon, 
  CreditCardIcon, 
  ShieldCheckIcon,
  MessageIcon,
  LockIcon,
  RocketIcon,
  AlertCircleIcon
} from './Icons.jsx';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  
  const [counts, setCounts] = useState({
    approvals: 0,
    appeals: 0,
    payments: 0,
    reports: 0,
    helpdesk: 0,
    recovery: 0,
    security: 0,
    boosts: 0
  });

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [
          approvalsRes,
          appealsRes,
          paymentsRes,
          reportsRes,
          helpdeskRes,
          recoveryRes,
          securityRes,
          boostsRes
        ] = await Promise.all([
          // 1. Approvals (Matches PendingApprovals.jsx exactly)
          supabase.from('profiles').select('*', { count: 'exact', head: true })
            .eq('is_bot', false).eq('approval_status', 'pending'),
            
          // 2. Appeals (Assuming table name is 'appeals')
          supabase.from('appeals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          
          // 3. Payments (Assuming table 'payments' and pending)
          supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          
          // 4. Reports (Assuming table 'reports' and pending)
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          
          // 5. Help Desk (Assuming table 'helpdesk_tickets')
          supabase.from('helpdesk_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
          
          // 6. Recovery Messages (Assuming table 'recovery_messages')
          supabase.from('recovery_messages').select('*', { count: 'exact', head: true }).eq('is_read', false),
          
          // 7. Security (Assuming table 'security_logs')
          supabase.from('security_logs').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
          
          // 8. Boosts (Assuming table 'boosts')
          supabase.from('boosts').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ]);

        setCounts({
          approvals: approvalsRes.count || 0,
          appeals: appealsRes.count || 0,
          payments: paymentsRes.count || 0,
          reports: reportsRes.count || 0,
          helpdesk: helpdeskRes.count || 0,
          recovery: recoveryRes.count || 0,
          security: securityRes.count || 0,
          boosts: boostsRes.count || 0
        });
      } catch (err) {
        console.error("Failed to fetch notification counts", err);
      }
    }

    fetchCounts();

    // Realtime listener to update counts instantly when data changes
    const channel = supabase.channel('admin-notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchCounts();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const items = [
    { id: 'approvals', icon: <ShieldCheckIcon width={22} height={22} />, badge: counts.approvals, path: '/pending-approvals', label: 'Approvals' },
    { id: 'appeals', icon: <AlertTriangleIcon width={22} height={22} />, badge: counts.appeals, path: '/appeals', label: 'Appeals' },
    { id: 'payments', icon: <CreditCardIcon width={22} height={22} />, badge: counts.payments, path: '/payments', label: 'Payments' },
    { id: 'reports', icon: <FileTextIcon width={22} height={22} />, badge: counts.reports, path: '/reports', label: 'Reports' },
    { id: 'helpdesk', icon: <MessageIcon width={22} height={22} />, badge: counts.helpdesk, path: '/help-desk', label: 'Help Desk' },
    { id: 'recovery', icon: <LockIcon width={22} height={22} />, badge: counts.recovery, path: '/recovery-messages', label: 'Recovery' },
    { id: 'security', icon: <AlertCircleIcon width={22} height={22} />, badge: counts.security, path: '/security-center', label: 'Security' },
    { id: 'boosts', icon: <RocketIcon width={22} height={22} />, badge: counts.boosts, path: '/boosts', label: 'Boosts' },
  ];

  // Total sum of all badges
  const totalUnread = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 1500,
            animation: 'fade-in 200ms ease-out'
          }}
        />
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
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: '0 10px 30px rgba(0,0,0,0.9)',
          zIndex: 1501,
          border: '1px solid #1f1f1f',
          transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            title={item.label}
            onClick={() => { setIsOpen(false); navigate(item.path); }}
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
              transition: 'color 150ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
          >
            {item.icon}
            
            {item.badge > 0 && (
              <div
                style={{
                  position: 'absolute', top: 0, right: 0,
                  background: '#ef4444', color: '#fff',
                  fontSize: 10, fontWeight: 900,
                  minWidth: 16, height: 16, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', border: '2px solid #0a0a0a',
                }}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 90,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: 30,
          background: '#ef4444',
          color: '#fff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)',
          zIndex: 1502,
          cursor: 'pointer',
          transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
        }}
      >
        {/* Real Notification Bell Icon */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        
        {totalUnread > 0 && !isOpen && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            background: '#fff', color: '#ef4444',
            fontSize: 12, fontWeight: 900,
            width: 24, height: 24, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #ef4444'
          }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </div>
        )}
      </button>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
