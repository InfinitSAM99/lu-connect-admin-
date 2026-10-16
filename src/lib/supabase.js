import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Mobile-tuned realtime config.
// - heartbeatIntervalMs: 15s instead of 30s default. Android Doze can kill
//   idle sockets before 30s; 15s keeps it warm without being chatty.
// - timeout: how long to wait for a heartbeat ack before declaring dead.
// - reconnectAfterMs: custom backoff. Default hammer is too aggressive on
//   flaky mobile networks and burns battery.
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
    heartbeatIntervalMs: 15000,
    timeout: 10000,
    reconnectAfterMs: (tries) => {
      // 1s, 2s, 5s, 10s, then cap at 15s
      const schedule = [1000, 2000, 5000, 10000, 15000];
      return schedule[Math.min(tries - 1, schedule.length - 1)] || 15000;
    },
  },
});
