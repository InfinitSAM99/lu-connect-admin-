import { useEffect, useRef, useCallback, useState } from 'react';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { supabase } from './supabase';

/* ============================================================
   RealtimeManager
   ------------------------------------------------------------
   Owns every Supabase realtime channel in the admin app.

   Responsibilities:
   - Create one channel per subscription key
   - Re-subscribe every channel on:
       * app resume (Capacitor App appStateChange -> isActive)
       * network reconnect (Capacitor Network networkStatusChange)
       * auth session change (boot / shutdown)
   - Tear down cleanly on logout
   - Notify registered listeners after a reconnect so pages can refetch

   This is THE fix for Android backgrounding killing WebSockets.
   ============================================================ */

class RealtimeManager {
  constructor() {
    this.channels = new Map();      // key -> channel
    this.configs = new Map();       // key -> config (to rebuild)
    this.handlers = new Map();      // key -> handler fn
    this.refetchers = new Set();    // callbacks to run after reconnect
    this.booted = false;
    this.userId = null;
    this.listenersAttached = false;
    this.resubscribing = false;
    this.status = 'idle';           // idle | connected | disconnected | reconnecting
    this.statusListeners = new Set();
  }

  /* ---------- status broadcast ---------- */
  setStatus(next) {
    if (this.status === next) return;
    this.status = next;
    this.statusListeners.forEach((fn) => {
      try { fn(next); } catch {}
    });
  }

  onStatus(fn) {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  /* ---------- boot / shutdown ---------- */
  async boot(userId) {
    if (this.booted && this.userId === userId) return;
    this.userId = userId;
    this.booted = true;
    this.attachListeners();
    // If we had configs registered before boot, rebuild now
    await this.rebuildAll('boot');
  }

  async shutdown() {
    this.booted = false;
    this.userId = null;
    await this.teardownAll();
    this.setStatus('idle');
  }

  /* ---------- listener wiring (idempotent) ---------- */
  attachListeners() {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    // App resume — Android kills sockets when app backgrounds.
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive && this.booted) {
        this.setStatus('reconnecting');
        await this.rebuildAll('resume');
      }
    });

    // Network flap — Wi-Fi <-> LTE, airplane mode toggles.
    Network.addListener('networkStatusChange', async (s) => {
      if (!this.booted) return;
      if (s.connected) {
        this.setStatus('reconnecting');
        await this.rebuildAll('network');
      } else {
        this.setStatus('disconnected');
      }
    });
  }

  /* ---------- subscribe API ---------- */
  subscribe(key, config, handler) {
    if (!key) throw new Error('realtime.subscribe: key required');
    if (typeof handler !== 'function') throw new Error('realtime.subscribe: handler fn required');

    // Store for rebuilds
    this.configs.set(key, config);
    this.handlers.set(key, handler);

    // Tear down old if exists
    const existing = this.channels.get(key);
    if (existing) {
      try { supabase.removeChannel(existing); } catch {}
      this.channels.delete(key);
    }

    const channel = supabase
      .channel(`admin:${key}`)
      .on('postgres_changes', config, (payload) => {
        const fn = this.handlers.get(key);
        if (fn) {
          try { fn(payload); } catch (e) { console.warn('[realtime] handler error', key, e); }
        }
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          this.setStatus('connected');
          // After a rebuild, fire refetchers once channel is live
          if (this.resubscribing) {
            this.resubscribing = false;
            this.fireRefetchers();
          }
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          this.setStatus('disconnected');
        }
      });

    this.channels.set(key, channel);
    return () => this.unsubscribe(key);
  }

  unsubscribe(key) {
    const ch = this.channels.get(key);
    if (ch) {
      try { supabase.removeChannel(ch); } catch {}
      this.channels.delete(key);
    }
    this.configs.delete(key);
    this.handlers.delete(key);
  }

  async teardownAll() {
    for (const [key, ch] of this.channels.entries()) {
      try { supabase.removeChannel(ch); } catch {}
    }
    this.channels.clear();
    // keep configs? No — logout means pages are unmounting. Clear all.
    this.configs.clear();
    this.handlers.clear();
  }

  async rebuildAll(reason) {
    if (this.resubscribing) return; // avoid parallel rebuild storms
    this.resubscribing = true;

    const keys = Array.from(this.configs.keys());
    for (const key of keys) {
      const config = this.configs.get(key);
      const handler = this.handlers.get(key);
      if (!config || !handler) continue;

      // Remove stale
      const old = this.channels.get(key);
      if (old) {
        try { supabase.removeChannel(old); } catch {}
        this.channels.delete(key);
      }

      const channel = supabase
        .channel(`admin:${key}`)
        .on('postgres_changes', config, (payload) => {
          const fn = this.handlers.get(key);
          if (fn) {
            try { fn(payload); } catch (e) { console.warn('[realtime] handler error', key, e); }
          }
        })
        .subscribe((s) => {
          if (s === 'SUBSCRIBED') {
            this.setStatus('connected');
            if (this.resubscribing) {
              this.resubscribing = false;
              this.fireRefetchers();
            }
          } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
            this.setStatus('disconnected');
          }
        });

      this.channels.set(key, channel);
    }

    // Safety: if there are no channels to rebuild, fire refetchers anyway
    if (keys.length === 0 && this.resubscribing) {
      this.resubscribing = false;
      this.fireRefetchers();
    }

    console.log(`[realtime] rebuilt ${keys.length} channel(s) — reason: ${reason}`);
  }

  /* ---------- refetch bus ---------- */
  onReconnect(fn) {
    this.refetchers.add(fn);
    return () => this.refetchers.delete(fn);
  }

  fireRefetchers() {
    this.refetchers.forEach((fn) => {
      try { fn(); } catch (e) { console.warn('[realtime] refetch error', e); }
    });
  }
}

export const realtime = new RealtimeManager();

/* ============================================================
   useRealtime — React hook
   ------------------------------------------------------------
   Subscribe to a table. Auto-cleans on unmount. Auto-rebuilds
   on resume / network / auth.

   Usage:
     useRealtime('students-live', {
       event: '*',
       schema: 'public',
       table: 'students',
     }, (payload) => {
       // refetch or patch state
     });
   ============================================================ */
export function useRealtime(key, config, handler, deps = []) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!key || !config) return;
    const wrapped = (payload) => handlerRef.current?.(payload);
    const unsub = realtime.subscribe(key, config, wrapped);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, JSON.stringify(config), ...deps]);
}

/* ============================================================
   useRealtimeStatus — for a small "LIVE / OFFLINE" dot in UI
   ============================================================ */
export function useRealtimeStatus() {
  const [status, setStatus] = useState(realtime.status);
  useEffect(() => realtime.onStatus(setStatus), []);
  return status;
}

/* ============================================================
   useRefetchOnReconnect — register a refetch callback
   ============================================================ */
export function useRefetchOnReconnect(fn) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    const unsub = realtime.onReconnect(() => fnRef.current?.());
    return unsub;
  }, []);
}
