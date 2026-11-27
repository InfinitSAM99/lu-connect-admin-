import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertTriangleIcon, MessageIcon, ClockIcon, CreditCardIcon, XIcon } from './Icons.jsx';

export default function Sidebar({ position }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ approvals: 0, appeals: 0, payments: 0, reports: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const [approvals, appeals, payments, reports] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('ban_appeals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setCounts({
        approvals: approvals.count || 0, appeals: appeals.count || 0,
        payments: payments.count || 0, reports: reports.count || 0
      });
    };
    fetchCounts();
  }, []);

  if (position !== 'header') return null;

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

      {/* VERTICAL SIDEBAR DRAWER */}
      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }} />
          <div
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 320,
              background: '#0a0a0a', zIndex: 1001, display: 'flex', flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
              animation: 'slide-left 250ms ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #1f1f1f' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Notifications</span>
              <button onClick={() => setIsOpen(false)} style={{ background: '#1f1f1f', border: 'none', borderRadius: 20, padding: 8, color: '#fff' }}>
                <XIcon width={20} height={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => { setIsOpen(false); navigate('/pending-approvals'); }} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'transparent', border: 'none', color: '#fff', padding: '16px', borderRadius: 12, textAlign: 'left' }}>
                <div style={{ background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: '50%' }}><ClockIcon width={24} height={24} style={{ color: '#ef4444' }} /></div>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>Approvals</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>{counts.approvals}</span>
              </button>

              <button onClick={() => { setIsOpen(false); navigate('/appeals'); }} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'transparent', border: 'none', color: '#fff', padding: '16px', borderRadius: 12, textAlign: 'left' }}>
                <div style={{ background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: '50%' }}><AlertTriangleIcon width={24} height={24} style={{ color: '#ef4444' }} /></div>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>Appeals</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>{counts.appeals}</span>
              </button>

              <button onClick={() => { setIsOpen(false); navigate('/payments'); }} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'transparent', border: 'none', color: '#fff', padding: '16px', borderRadius: 12, textAlign: 'left' }}>
                <div style={{ background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: '50%' }}><CreditCardIcon width={24} height={24} style={{ color: '#ef4444' }} /></div>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>Payments</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>{counts.payments}</span>
              </button>

              <button onClick={() => { setIsOpen(false); navigate('/reports'); }} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'transparent', border: 'none', color: '#fff', padding: '16px', borderRadius: 12, textAlign: 'left' }}>
                <div style={{ background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: '50%' }}><MessageIcon width={24} height={24} style={{ color: '#ef4444' }} /></div>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>Reports</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>{counts.reports}</span>
              </button>
            </div>
          </div>
          <style>{`
            @keyframes slide-left {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
