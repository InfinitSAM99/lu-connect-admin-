import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  XIcon, AlertTriangleIcon, FileTextIcon, CreditCardIcon, 
  UsersIcon, MegaphoneIcon, ClipboardIcon, ShieldCheckIcon, ShieldIcon, MessageIcon, LockIcon, RocketIcon
} from './Icons.jsx';

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Exact icons and order from your original screenshot
  const actions = [
    { icon: <ShieldIcon width={22} height={22} />, path: '/security-threats' },
    { icon: <AlertTriangleIcon width={22} height={22} />, path: '/reports' },
    { icon: <CreditCardIcon width={22} height={22} />, path: '/payments' },
    { icon: <FileTextIcon width={22} height={22} />, path: '/posts' },
    { icon: <MessageIcon width={22} height={22} />, path: '/help-desk' },
    { icon: <LockIcon width={22} height={22} />, path: '/admins' },
    { icon: <AlertTriangleIcon width={22} height={22} />, path: '/appeals' },
    { icon: <RocketIcon width={22} height={22} />, path: '/boosts' },
  ];

  return (
    <>
      {/* HEADER BELL BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: 'transparent', color: '#ef4444', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, marginRight: 12
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </button>

      {/* THE EXACT PILL-SHAPED FLOATING SIDEBAR */}
      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 1000 }} />
          <div
            style={{
              position: 'fixed', 
              top: '50%', 
              left: 20, 
              transform: 'translateY(-50%)',
              background: '#1a1a1a',
              borderRadius: 40,
              padding: '24px 10px',
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              gap: 24,
              boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
              border: '1px solid #333',
              zIndex: 1001,
              animation: 'fade-in-scale 200ms ease-out'
            }}
          >
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => { setIsOpen(false); navigate(action.path); }}
                style={{
                  background: 'transparent', 
                  border: 'none', 
                  color: '#fff', 
                  cursor: 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: 0,
                  opacity: 0.8,
                  transition: 'opacity 200ms, transform 200ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {action.icon}
              </button>
            ))}
          </div>
          <style>{`
            @keyframes fade-in-scale {
              from { opacity: 0; transform: translateY(-50%) scale(0.9); }
              to { opacity: 1; transform: translateY(-50%) scale(1); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
