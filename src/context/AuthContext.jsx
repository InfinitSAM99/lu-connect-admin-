import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { realtime } from '../lib/realtime';

const AuthContext = createContext(null);

const CACHE_KEY = 'lu_admin_auth_cache_v1';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    if (payload) localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    else localStorage.removeItem(CACHE_KEY);
  } catch {}
}

export function AuthProvider({ children }) {
  const cached = typeof window !== 'undefined' ? readCache() : null;

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(cached?.profile || null);
  const [roleLevel, setRoleLevel] = useState(cached?.roleLevel ?? 0);
  // IMPORTANT: loading stays true until getSession resolves.
  // Cache gives us instant profile, but the SESSION must be verified
  // so AdminGuard doesn't bounce to /login on cold start.
  const [loading, setLoading] = useState(true);

  const refreshingRef = useRef(false);
  const lastFetchRef = useRef(0);
  const bootDoneRef = useRef(false);

  const loadProfile = async (uid, { force = false } = {}) => {
    if (!uid) {
      setProfile(null);
      setRoleLevel(0);
      writeCache(null);
      return;
    }
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 20 * 1000) return;
    if (refreshingRef.current) return;
    refreshingRef.current = true;

    const { data } = await supabase
      .from('profiles')
      .select('*, roles(name, level)')
      .eq('id', uid)
      .single();

    refreshingRef.current = false;
    lastFetchRef.current = Date.now();

    if (!data) return;

    setProfile(data);
    setRoleLevel(data?.roles?.level || 0);
    writeCache({
      userId: uid,
      profile: data,
      roleLevel: data?.roles?.level || 0,
      ts: Date.now(),
    });
  };

  useEffect(() => {
    let mounted = true;

    // 1. Boot: wait for getSession before setting loading = false
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user ?? null;
      setUser(u);

      if (!u) {
        setProfile(null);
        setRoleLevel(0);
        writeCache(null);
        setLoading(false);
        bootDoneRef.current = true;
        realtime.shutdown();
        return;
      }

      // Boot realtime manager now that we know who the user is.
      // Safe even if plugins fail — boot() swallows listener errors.
      realtime.boot(u.id).catch((e) => {
        console.warn('[auth] realtime.boot failed:', e?.message);
      });

      const c = readCache();
      if (c?.userId === u.id && c?.profile) {
        setLoading(false);
        bootDoneRef.current = true;
        loadProfile(u.id, { force: true });
      } else {
        loadProfile(u.id, { force: true }).finally(() => {
          if (mounted) {
            setLoading(false);
            bootDoneRef.current = true;
          }
        });
      }
    });

    // 2. Auth events
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);

      if (event === 'SIGNED_OUT' || !u) {
        setProfile(null);
        setRoleLevel(0);
        writeCache(null);
        setLoading(false);
        bootDoneRef.current = true;
        // Kill all realtime channels on logout so RLS-scoped sockets die.
        realtime.shutdown().catch(() => {});
        return;
      }

      // New session / token refresh — make sure realtime is running.
      realtime.boot(u.id).catch(() => {});

      // Only force profile refresh after boot has finished — avoids races
      if (bootDoneRef.current) {
        const c = readCache();
        if (c?.userId === u.id && c?.profile) {
          loadProfile(u.id, { force: true });
        } else {
          loadProfile(u.id, { force: true }).finally(() => setLoading(false));
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      // Do NOT shutdown realtime here — React strict mode double-mounts
      // in dev and would kill channels mid-flight. Shutdown happens on
      // explicit SIGNED_OUT or app teardown.
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = async () => {
    writeCache(null);
    setProfile(null);
    setRoleLevel(0);
    await realtime.shutdown().catch(() => {});
    return supabase.auth.signOut();
  };

  const isAdmin = roleLevel >= 2;
  const isSuperAdmin = roleLevel >= 3;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roleLevel,
        isAdmin,
        isSuperAdmin,
        loading,
        signIn,
        signOut,
        reloadProfile: () => loadProfile(user?.id, { force: true }),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
