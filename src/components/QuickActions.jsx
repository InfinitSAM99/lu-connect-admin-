import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  XIcon, 
  UserIcon, 
  AlertTriangleIcon, 
  FileTextIcon, 
  CreditCardIcon, 
  UsersIcon, 
  MegaphoneIcon,
  ClipboardIcon
} from './Icons.jsx';

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Real actions mapped to your admin routes
  const actions = [
    { label: 'Approvals', icon: <ClipboardIcon width={28} height={28} />, path: '/pending-approvals', badge: 12 },
    { label: 'Appeals', icon: <AlertTriangleIcon width={28} height={28} />, path: '/appeals' },
    { label: 'Payments', icon: <CreditCardIcon width={28} height={28} />, path: '/payments' },
    { label: 'Reports', icon: <FileTextIcon width={28} height={28} />, path: '/reports' },
    { label: 'Students', icon: <UsersIcon width={28} height={28} />, path: '/students' },
    { label: 'Announce', icon: <MegaphoneIcon width={28} height={28} />, path: '/announcements' },
  ];

  return (
    <>
      {/* FLOATING RED BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 90, // Just above your bottom nav
          right: 24,
          width: 60,
          height: 60,
          borderRadius: 30,
          background: '#ef4444', // Your brand red
          color: '#fff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)',
          zIndex: 1000,
          cursor: 'pointer',
          animation: 'pulse-glow 2s infinite'
        }}
      >
        {/* Using AlertTriangle as a notification bell substitute since BellIcon isn't in your list */}
        <AlertTriangleIcon width={28} height={28} />
      </button>

      {/* SLIDE DOWN MENU OVERLAY */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            animation: 'fade-in 200ms ease-out'
          }}
        >
          {/* SLIDING PANEL */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              background: '#0a0a0a',
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              padding: '24px 20px 32px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              animation: 'slide-down 300ms cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>Quick Actions</div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: '#1f1f1f', border: 'none', borderRadius: 20, padding: 8, color: '#fff', cursor: 'pointer' }}
              >
                <XIcon width={20} height={20} />
              </button>
            </div>

            {/* Grid of Icons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {actions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => { setIsOpen(false); navigate(action.path); }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#111',
                    border: '1px solid #1f1f1f',
                    borderRadius: 16,
                    padding: '16px 8px',
                    gap: 10,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28 }}>
                    {action.icon}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{action.label}</div>
                  
                  {action.badge > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 900,
                      padding: '2px 6px',
                      borderRadius: 10,
                      minWidth: 20,
                      textAlign: 'center'
                    }}>
                      {action.badge}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keyframes injected directly */}
      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </>
  );
}
