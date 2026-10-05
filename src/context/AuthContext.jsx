import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roleLevel, setRoleLevel] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid) => {
    if (!uid) { setProfile(null); setRoleLevel(0); return; }
    const { data } = await supabase.from('profiles').select('*, roles(name, level)').eq('id', uid).single();
    setProfile(data);
    setRoleLevel(data?.roles?.level || 0);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      loadProfile(data.session?.user?.id).finally(() => setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signOut = () => supabase.auth.signOut();
  const isAdmin = roleLevel >= 2;
  const isSuperAdmin = roleLevel >= 3;

  return (
    <AuthContext.Provider value={{ user, profile, roleLevel, isAdmin, isSuperAdmin, loading, signIn, signOut, reloadProfile: () => loadProfile(user?.id) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);