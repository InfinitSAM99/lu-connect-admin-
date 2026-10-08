// LU CONNECT Admin — client for the AI Edge Function
import { supabase } from './supabase';

const FUNCTION_URL = 'https://uuuqlzsczxekyfliviiv.supabase.co/functions/v1/lu-assistant';
const ANON_KEY = supabase.supabaseKey;

export async function askAdminAI({ question, stats, history = [] }) {
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        mode: 'admin_query',
        stats,
        messages: [...history, { role: 'user', content: question }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return { reply: '', error: `HTTP ${res.status}: ${txt}` };
    }

    const data = await res.json();
    return { reply: data.reply || '', error: data.error || null };
  } catch (e) {
    return { reply: '', error: String(e) };
  }
}
