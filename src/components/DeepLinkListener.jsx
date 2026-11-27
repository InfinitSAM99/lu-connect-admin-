import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';

export default function DeepLinkListener() {
  useEffect(() => {
    let listenerHandle = null;

    const setupListener = async () => {
      listenerHandle = await CapApp.addListener('appUrlOpen', async (event) => {
        const url = event.url;
        
        // Check if the URL matches our redirect
        if (url.includes('callback')) {
          // Close the in-app browser if it's open
          try { await Browser.close(); } catch (e) {}

          // Extract the code from the URL
          const parsedUrl = new URL(url.replace('com.luconnect.admin://callback', 'https://placeholder.com/callback'));
          const code = parsedUrl.searchParams.get('code');

          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('Auth Exchange Error:', error.message);
            } else {
              // Success! Force a reload to pick up the new session
              window.location.href = '/dashboard';
            }
          }
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, []);

  return null;
}
