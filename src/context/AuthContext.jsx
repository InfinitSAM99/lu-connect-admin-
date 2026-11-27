import { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
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

  // ── DEEP LINK LISTENER ──────────────────────────────────────
  useEffect(() => {
    let listenerHandle = null;
    const setupListener = async () => {
      listenerHandle = await CapApp.addListener('appUrlOpen', async (event) => {
        const url = event.url;
        
        if (url.includes('callback') || url.includes('auth-callback') || url.includes('access_token')) {
          try { await Browser.close(); } catch (e) {}

          const hashIndex = url.indexOf('#');
          const queryIndex = url.indexOf('?');
          
          let paramsString = '';
          if (hashIndex > -1) paramsString = url.substring(hashIndex + 1);
          else if (queryIndex > -1) paramsString = url.substring(queryIndex + 1);

          const params = new URLSearchParams(paramsString);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          } else {
            const code = params.get('code');
            if (code) await supabase.auth.exchangeCodeForSession(code);
          }
        }
      });
    };
    setupListener();
    return () => { if (listenerHandle) listenerHandle.remove(); };
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

  // ── LOGIN ACTION ─────────────────────────────────────────────
  const signInWithGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // ADDED ?app=admin SO THE WEBSITE KNOWS TO REDIRECT TO THE ADMIN APP
        const webUrl = "https://lu-connect-website-sigma.vercel.app/login?app=admin";
        
        await Browser.open({ url: webUrl });
        return { error: null };
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + '/dashboard' }
        });
        return { error };
      }
    } catch (err) {
      return { error: err };
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
