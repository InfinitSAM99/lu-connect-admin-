/* ============================================================
   LU Admin cache — localStorage-backed, versioned, TTL'd.
   ------------------------------------------------------------
   Purpose: stale-while-revalidate. On page open we return the
   last known data instantly, then refresh in the background.

   Design:
   - Namespaced prefix so we can blow it away safely
   - Schema version so a shape change doesn't poison the app
   - Per-key TTL, default 5 min
   - Automatic eviction if storage is full
   - Never throws — cache failures degrade to "no cache"
   ============================================================ */

const PREFIX = 'lu_admin_cache:';
const VERSION = 1;

function fullKey(key) {
  return `${PREFIX}v${VERSION}:${key}`;
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

/* ---------- set ---------- */
export function cacheSet(key, data, ttlMs = 5 * 60 * 1000) {
  if (!key) return;
  const payload = { data, ts: Date.now(), ttl: ttlMs };
  const raw = JSON.stringify(payload);
  try {
    localStorage.setItem(fullKey(key), raw);
  } catch (e) {
    // Storage full — evict every entry older than 1 day and retry once
    try {
      evictStale(24 * 60 * 60 * 1000);
      localStorage.setItem(fullKey(key), raw);
    } catch {
      // give up silently
    }
  }
}

/* ---------- get ----------
   Returns { data, ts, age, stale } or null.
   `stale` = true if older than ttl. Caller decides what to do.
*/
export function cacheGet(key) {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(fullKey(key));
    if (!raw) return null;
    const parsed = safeParse(raw);
    if (!parsed || !('data' in parsed)) return null;
    const age = Date.now() - (parsed.ts || 0);
    return {
      data: parsed.data,
      ts: parsed.ts || 0,
      age,
      stale: age > (parsed.ttl || 0),
    };
  } catch {
    return null;
  }
}

/* ---------- remove one ---------- */
export function cacheRemove(key) {
  try { localStorage.removeItem(fullKey(key)); } catch {}
}

/* ---------- remove many by prefix ---------- */
export function cacheRemoveByPrefix(prefix) {
  try {
    const full = fullKey(prefix);
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(full)) toDelete.push(k);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/* ---------- wipe everything namespaced ---------- */
export function cacheClearAll() {
  try {
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toDelete.push(k);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/* ---------- evict entries older than maxAgeMs ---------- */
export function evictStale(maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const cutoff = Date.now() - maxAgeMs;
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const parsed = safeParse(localStorage.getItem(k));
      if (!parsed || (parsed.ts || 0) < cutoff) toDelete.push(k);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/* ---------- diagnostic ---------- */
export function cacheStats() {
  try {
    let count = 0;
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        count += 1;
        bytes += (localStorage.getItem(k) || '').length;
      }
    }
    return { count, bytes };
  } catch {
    return { count: 0, bytes: 0 };
  }
}
