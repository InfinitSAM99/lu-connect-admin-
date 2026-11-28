import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RocketIcon, XIcon, CheckCircleIcon } from '../components/Icons.jsx';

const CATEGORIES = [
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'followers', label: 'Followers' },
  { key: 'views', label: 'Views' },
  { key: 'post', label: 'Post Boost' },
  { key: 'bundle', label: 'Bundle' },
];

export default function BoostPackagesAdmin() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('likes');
  
  // Drawer State
  const [editingPkg, setEditingPkg] = useState(null);
  const [formData, setFormData] = useState({});
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from('boost_packages').select('*').order('sort_order');
    setPackages(data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const openEdit = (pkg) => {
    setEditingPkg(pkg);
    setFormData({ ...pkg });
  };

  const handleSave = async () => {
    setBusy(true);
    const { error } = await supabase.from('boost_packages').update({
      label: formData.label,
      description: formData.description,
      amount_ksh: Number(formData.amount_ksh),
      quantity: formData.quantity ? Number(formData.quantity) : null,
      duration_days: Number(formData.duration_days),
      active: formData.active,
    }).eq('id', editingPkg.id);

    if (error) alert(error.message);
    setBusy(false);
    setEditingPkg(null);
    loadData();
  };

  const toggleActive = async (pkg, e) => {
    e.stopPropagation();
    const newState = !pkg.active;
    await supabase.from('boost_packages').update({ active: newState }).eq('id', pkg.id);
    // Optimistic update
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, active: newState } : p));
  };

  const filtered = packages.filter(p => p.category === activeTab);

  return (
    <div style={{ padding: 20, background: '#000', minHeight: '100vh', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <RocketIcon width={28} height={28} color="#ef4444" />
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 900, margin: 0 }}>Boost Packages</h1>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 8, paddingBottom: 16, overflowX: 'auto' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            style={{
              background: activeTab === cat.key ? '#ef4444' : '#111',
              color: activeTab === cat.key ? '#fff' : '#6d7382',
              border: '1px solid',
              borderColor: activeTab === cat.key ? '#ef4444' : '#1f1f1f',
              padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: '#6d7382' }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map(pkg => (
            <div 
              key={pkg.id} 
              onClick={() => openEdit(pkg)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: '1px solid #1f1f1f', cursor: 'pointer' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ color: pkg.active ? '#fff' : '#6d7382', fontWeight: 700, fontSize: 16 }}>{pkg.label}</div>
                <div style={{ color: '#6d7382', fontSize: 13, marginTop: 2 }}>{pkg.description}</div>
                <div style={{ color: pkg.active ? '#22c55e' : '#ef4444', fontSize: 11, fontWeight: 800, marginTop: 4, textTransform: 'uppercase' }}>
                  {pkg.active ? 'Active' : 'Hidden'}
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ color: '#E5C07B', fontWeight: 900, fontSize: 18 }}>KSh {pkg.amount_ksh}</div>
                <button 
                  onClick={(e) => toggleActive(pkg, e)}
                  style={{ background: 'transparent', border: 'none', color: pkg.active ? '#ef4444' : '#22c55e', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  {pkg.active ? 'Turn OFF' : 'Turn ON'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT DRAWER */}
      {editingPkg && (
        <>
          <div onClick={() => setEditingPkg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '85vh', background: '#0a0a0a',
            borderTopLeftRadius: 24, borderTopRightRadius: 24, zIndex: 310, overflowY: 'auto', paddingBottom: 30
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            
            <div style={{ padding: '0 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>Edit Package</div>
                <button onClick={() => setEditingPkg(null)} style={{ background: '#1f1f1f', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                  <XIcon width={18} height={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ color: '#6d7382', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Label</label>
                  <input type="text" value={formData.label || ''} onChange={e => setFormData({ ...formData, label: e.target.value })} style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, outline: 'none' }} />
                </div>

                <div>
                  <label style={{ color: '#6d7382', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Description</label>
                  <input type="text" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#6d7382', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Price (KSh)</label>
                    <input type="number" value={formData.amount_ksh || ''} onChange={e => setFormData({ ...formData, amount_ksh: e.target.value })} style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, outline: 'none' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#6d7382', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Quantity</label>
                    <input type="number" value={formData.quantity || ''} onChange={e => setFormData({ ...formData, quantity: e.target.value })} style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, outline: 'none' }} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#6d7382', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Duration (Days)</label>
                    <input type="number" value={formData.duration_days || ''} onChange={e => setFormData({ ...formData, duration_days: e.target.value })} style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, outline: 'none' }} />
                  </div>
                </div>

                <button onClick={handleSave} disabled={busy} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: 16, borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: 10 }}>
                  {busy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
