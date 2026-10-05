import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('lu-admin-theme') || 'system');

  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode) => {
      root.setAttribute('data-theme', mode);
      root.classList.toggle('dark', mode === 'dark');
    };
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const h = (e) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', h);
      return () => mq.removeEventListener('change', h);
    }
    apply(theme);
  }, [theme]);

  const update = (t) => { localStorage.setItem('lu-admin-theme', t); setTheme(t); };

  return <ThemeContext.Provider value={{ theme, setTheme: update }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);