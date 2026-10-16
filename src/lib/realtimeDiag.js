import { supabase } from './supabase';

export function probeRealtimeTransport() {
  if (typeof window === 'undefined') return;
  try {
    const ch = supabase.channel('__admin_transport_probe__');
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        let kind = 'unknown';
        try {
          const sock =
            ch?.socket ||
            ch?.connector?.socket ||
            ch?.push?.socket ||
            null;
          const wsUrl = sock?.transport?.url || sock?.url || '';
          const readyState = sock?.transport?.readyState ?? sock?.readyState;
          if (wsUrl && wsUrl.startsWith('ws')) kind = 'websocket';
          else if (readyState === 0 || readyState === 1) kind = 'websocket';
          else if (typeof window.WebSocket !== 'undefined') kind = 'websocket (assumed)';
          else kind = 'polling (fallback)';
        } catch {
          kind = 'unknown';
        }
        console.log(`[admin/realtime] transport: ${kind}`);
        setTimeout(() => {
          try { supabase.removeChannel(ch); } catch {}
        }, 500);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[admin/realtime] probe ${status}`);
      }
    });
  } catch (e) {
    console.warn('[admin/realtime] probe failed:', e?.message);
  }
}
