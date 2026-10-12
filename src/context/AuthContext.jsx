import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

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
  const [loading, setLoading] = useState(!cached?.profile);

  const refreshingRef = useRef(false);
  const lastFetchRef = useRef(0);

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

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user ?? null;
      setUser(u);

      if (!u) {
        setProfile(null);
        setRoleLevel(0);
        writeCache(null);
        setLoading(false);
        return;
      }

      const c = readCache();
      if (c?.userId === u.id && c?.profile) {
        setLoading(false);
        loadProfile(u.id, { force: true });
      } else {
        loadProfile(u.id, { force: true }).finally(() => {
          if (mounted) setLoading(false);
        });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);

      if (event === 'SIGNED_OUT' || !u) {
        setProfile(null);
        setRoleLevel(0);
        writeCache(null);
        setLoading(false);
        return;
      }

      const c = readCache();
      if (c?.userId === u.id && c?.profile) {
        loadProfile(u.id, { force: true });
      } else {
        loadProfile(u.id, { force: true }).finally(() => setLoading(false));
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = async () => {
    writeCache(null);
    setProfile(null);
    setRoleLevel(0);
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
