import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  ShieldCheckIcon, 
  CopyIcon, 
  PlusIcon, 
  CheckCircleIcon,
  ClockIcon
} from '../components/Icons.jsx';

export default function AdminCodes() {
  const { profile } = useAuth();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_download_codes')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) setCodes(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generateCode = async () => {
    setGenerating(true);
    // Generate a random code: LU-ADMIN-XXXXX
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newCode = `LU-ADMIN-${randomStr}`;

    const { error } = await supabase
      .from('admin_download_codes')
      .insert({ code: newCode });

    if (error) {
      alert('Failed to generate code: ' + error.message);
    } else {
      await supabase.from('admin_audit_logs').insert({
        admin_id: profile.id,
        action: 'generate_download_code',
        target_type: 'system',
        details: { code: newCode }
      });
      load();
    }
    setGenerating(false);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 28px', gap: 12,
      }}>
        <ShieldCheckIcon width={56} height={56} color="#FFD700" />
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
          Access Codes
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', maxWidth: 320 }}>
          Generate unique codes to download the Admin App from the website.
        </div>
      </div>

      {/* GENERATE BUTTON */}
      <div style={{ padding: '0 20px 20px' }}>
        <button
          onClick={generateCode}
          disabled={generating}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '16px',
            background: 'rgba(255, 215, 0, 0.1)', color: '#FFD700',
            border: '1.5px solid #FFD700', borderRadius: 14,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <PlusIcon width={20} height={20} color="#FFD700" />
          {generating ? 'Generating...' : 'Generate New Code'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid rgba(255, 215, 0, 0.25)',
            borderTopColor: '#FFD700',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      ) : (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {codes.map((c) => (
            <div
              key={c.code}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '20px 16px', borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 20,
                background: c.is_used ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {c.is_used ? (
                  <ClockIcon width={20} height={20} color="#ef4444" />
                ) : (
                  <CheckCircleIcon width={20} height={20} color="#22c55e" />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: 15, fontWeight: 600, color: c.is_used ? 'var(--text-3)' : '#fff',
                  fontFamily: 'monospace', letterSpacing: 0.5,
                  textDecoration: c.is_used ? 'line-through' : 'none',
                }}>
                  {c.code}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                  {new Date(c.created_at).toLocaleDateString()} · {c.is_used ? 'Used' : 'Available'}
                </div>
              </div>

              <button
                onClick={() => copyToClipboard(c.code, c.code)}
                style={{
                  background: 'var(--surface-2)', border: 'none',
                  padding: 10, borderRadius: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {copiedId === c.code ? (
                  <CheckCircleIcon width={18} height={18} color="#22c55e" />
                ) : (
                  <CopyIcon width={18} height={18} color="#fff" />
                )}
              </button>
            </div>
          ))}
          {codes.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
              No codes generated yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
