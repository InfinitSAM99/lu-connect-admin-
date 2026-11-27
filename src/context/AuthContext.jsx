import { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';
import { roleNameOf, roleLevelOf } from '../lib/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else {
        setProfile(null);
        setIsSuperAdmin(false);
        setIsBanned(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, roles(name, level)')
        .eq('id', userId)
        .single();

      if (data) {
        if (data.is_admin_banned || data.is_suspended) {
          setIsBanned(true);
          setProfile(null);
        } else {
          setProfile(data);
          setIsSuperAdmin(data.roles?.name === 'super_admin');
          setIsBanned(false);
          
          if (data.roles?.level >= 1) {
            await supabase.from('admin_presence').upsert({ 
              id: userId, 
              last_seen: new Date().toISOString() 
            });
          }
        }
      }
    } catch (e) {
      console.error('Profile load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.id || profile.roles?.level < 1) return;
    const interval = setInterval(() => {
      supabase.from('admin_presence').upsert({ 
        id: profile.id, 
        last_seen: new Date().toISOString() 
      }).then();
    }, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  const signInWithGoogle = async () => {
    const isNative = Capacitor.isNativePlatform();
    const redirectTo = isNative 
      ? 'com.luconnect.admin://callback' 
      : window.location.origin + '/dashboard';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
        skipBrowserRedirect: isNative,
      }
    });

    if (error) {
      console.error(error);
      return;
    }

    if (isNative && data?.url) {
      await Browser.open({ url: data.url });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setIsBanned(false);
  };

  const user = session?.user ?? null;
  const roleName = roleNameOf(profile);
  const roleLevel = roleLevelOf(profile);
  const isAdmin = roleLevel >= 2;
  const isModerator = roleLevel >= 1;

  return (
    <AuthContext.Provider
      value={{
        session, user, profile, loading, roleName, roleLevel, 
        isSuperAdmin, isAdmin, isModerator, isBanned, 
        signInWithGoogle, signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
