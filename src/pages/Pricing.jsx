import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { CheckCircleIcon, AlertTriangleIcon } from '../components/Icons.jsx';

export default function Pricing() {
  const { isSuperAdmin } = useAuth();
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('app_pricing').select('*').order('plan_key');
    if (error) {
      alert('Error loading pricing: ' + error.message);
    } else {
      setPricing(data || []);
    }
    setLoading(false);
  };

  const updateField = (planKey, field, value) => {
    setPricing(prev => prev.map(p => p.plan_key === planKey ? { ...p, [field]: value } : p));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      for (const plan of pricing) {
        const { error } = await supabase
          .from('app_pricing')
          .update({
            base_price: plan.base_price,
            duration_days: plan.duration_days,
            updated_at: new Date().toISOString(),
          })
          .eq('plan_key', plan.plan_key);
        
        if (error) throw error;
      }
      setMsg('Pricing updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert('Save Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6d7382' }}>
        <AlertTriangleIcon width={48} height={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <h3 style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Access Denied</h3>
        <p>Only super admins can change pricing.</p>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6d7382' }}>Loading pricing...</div>;
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ padding: '24px 20px 20px' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0 }}>Pricing Settings</h1>
        <p style={{ color: '#6d7382', fontSize: 13, marginTop: 6 }}>Set the price and duration for LU Pro plans. The app will update instantly.</p>
      </div>

      {msg && (
        <div style={{ margin: '0 20px 16px', background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', color: '#22c55e', padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 20px' }}>
        {pricing.map((plan) => (
          <div key={plan.plan_key} style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, textTransform: 'capitalize', margin: 0 }}>{plan.plan_key} Plan</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {/* Price */}
              <div>
                <label style={{ color: '#6d7382', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>Price (KES)</label>
                <input
                  type="number"
                  value={plan.base_price}
                  onChange={(e) => updateField(plan.plan_key, 'base_price', Number(e.target.value))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 18, fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Duration */}
              <div>
                <label style={{ color: '#6d7382', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>Duration (Days)</label>
                <input
                  type="number"
                  value={plan.duration_days || 30}
                  onChange={(e) => updateField(plan.plan_key, 'duration_days', Number(e.target.value))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 18, fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginTop: 20, padding: 16, background: '#050505', border: '1px solid #1f1f1f', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: '#6d7382', marginBottom: 8 }}>Preview:</div>
              <div style={{ fontSize: 14, color: '#fff' }}>
                <b>KES {plan.base_price}</b> for <b>{plan.duration_days || 30} days</b>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: 10, padding: '18px', borderRadius: 16, background: '#ef4444',
            color: '#fff', border: 'none', fontSize: 16, fontWeight: 800,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          {saving ? 'Saving...' : <><CheckCircleIcon width={20} height={20} /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}
