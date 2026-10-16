import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtime, useRefetchOnReconnect } from './realtime';
import { cacheGet, cacheSet } from './cache';

/* ============================================================
   useLiveQuery — cache-first + realtime + reconnect-aware
   ------------------------------------------------------------
   Returns:
     { data, loading, refreshing, error, refresh }

   Behavior:
   - On mount: if cache hit → data set immediately, loading=false.
               then fetch runs in background (refreshing=true).
     no cache → data stays initialData, loading=true until fetch.
   - On realtime event: debounced refetch.
   - On reconnect (app resume / network): immediate refetch.
   - On success: writes to cache with TTL.

   Params:
     key      unique string (also the cache key)
     queryFn  () => supabase.from(...).select(...)
     rtConfig { table, event?, schema?, filter? } or null to skip realtime
     options  { enabled, debounceMs, initialData, cacheTtl, cache }
   ============================================================ */
export function useLiveQuery(key, queryFn, rtConfig, options = {}) {
  const {
    enabled = true,
    debounceMs = 500,
    initialData = null,
    cacheTtl = 5 * 60 * 1000,
    cache = true,
  } = options;

  // Try cache synchronously on first render — this is what makes it feel instant.
  const cachedRef = useRef(undefined);
  if (cachedRef.current === undefined) {
    cachedRef.current = cache && key ? cacheGet(key) : null;
  }
  const cached = cachedRef.current;

  const [data, setData] = useState(cached?.data ?? initialData);
  const [loading, setLoading] = useState(cached == null && initialData == null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const inflightRef = useRef(false);
  const debounceRef = useRef(null);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const runQuery = useCallback(async ({ silent = false } = {}) => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    if (!silent) setRefreshing(true);

    try {
      const result = await queryFnRef.current();
      if (!mountedRef.current) return;

      if (result?.error) {
        setError(result.error);
      } else {
        const next = result?.data ?? null;
        setData(next);
        setError(null);
        if (cache && key) cacheSet(key, next, cacheTtl);
      }
    } catch (e) {
      if (mountedRef.current) setError(e);
    } finally {
      inflightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [key, cache, cacheTtl]);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Silent when we already have data on screen — no spinner flicker
      runQuery({ silent: true });
    }, debounceMs);
  }, [runQuery, debounceMs]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;
    // If we have cache → background refresh (no loading spinner)
    // If we don't → real load (loading spinner)
    runQuery({ silent: !!cached });
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  // Realtime
  useRealtime(
    enabled && rtConfig ? `live:${key}` : null,
    rtConfig
      ? {
          event: rtConfig.event || '*',
          schema: rtConfig.schema || 'public',
          table: rtConfig.table,
          filter: rtConfig.filter,
        }
      : null,
    () => scheduleRefetch(),
    [enabled]
  );

  // Reconnect refetch
  useRefetchOnReconnect(() => {
    if (enabled) runQuery({ silent: true });
  });

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: runQuery,
    refetch: runQuery,
  };
}
