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

  // ── Handle incoming auth URLs (tokens from web login) ───────
  const handleAuthUrl = async (url) => {
    if (!url) return;
    if (!url.includes('access_token') && !url.includes('code=')) return;

    try { await Browser.close(); } catch (e) {}

    // Parse params from both # and ?
    let paramsString = '';
    if (url.includes('#')) paramsString = url.split('#')[1];
    else if (url.includes('?')) paramsString = url.split('?')[1];

    const params = new URLSearchParams(paramsString);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) console.error('setSession error:', error.message);
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.error('exchangeCode error:', error.message);
    }
  };

  useEffect(() => {
    // 1. Listen for URL opens (when app is in foreground/background)
    let listenerHandle = null;
    const setup = async () => {
      listenerHandle = await CapApp.addListener('appUrlOpen', async (event) => {
        await handleAuthUrl(event.url);
      });

      // 2. Handle initial URL (when app is launched fresh from a link)
      const launch = await CapApp.getLaunchUrl();
      if (launch?.url) await handleAuthUrl(launch.url);
    };
    setup();

    // 3. Handle web-based deep links (Capacitor converts custom scheme to web url sometimes)
    const checkWebUrl = () => handleAuthUrl(window.location.href);
    checkWebUrl();

    return () => { if (listenerHandle) listenerHandle.remove(); };
  }, []);

  // ── Session listener ─────────────────────────────────────────
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

  // ── Login Action ────────────────────────────────────────────
  const signInWithGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
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
