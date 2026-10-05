import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { readableError, supabase } from '../lib/supabase.js';

export function PageHeader({ eyebrow = 'MANAGE YOUR COMMUNITY', title, description, action }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="header-action">{action}</div>}</div>;
}
export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return <label className="search-box"><Search size={17} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}
export function useTable(table, { order = 'created_at', limit = 200 } = {}) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function reload() {
    if (!supabase) { setRows([]); setLoading(false); setError('Add Supabase credentials to load live data.'); return; }
    setLoading(true); setError('');
    const { data, error: requestError } = await supabase.from(table).select('*').order(order, { ascending: false }).limit(limit);
    if (requestError) setError(readableError(requestError)); else setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { reload(); }, [table]);
  return { rows, setRows, loading, error, reload };
}
export function TableState({ loading, error, empty, children }) {
  if (loading) return <div className="table-state"><span className="spinner" />Loading records…</div>;
  if (error) return <div className="table-state error-state">{error}</div>;
  if (empty) return <div className="table-state">{empty}</div>;
  return children;
}
export function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, options);
}
export function shortId(value) { return value ? String(value).slice(0, 8) : '—'; }
export async function updateRow(table, id, values) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from(table).update(values).eq('id', id);
  if (error) throw error;
}
export function useNotice() {
  const [notice, setNotice] = useState('');
  function notify(message) { setNotice(message); window.setTimeout(() => setNotice(''), 3500); }
  return [notice, notify];
}
