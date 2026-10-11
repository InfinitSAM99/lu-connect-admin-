import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const MIN_HOLD = 5000;
const FADE_DURATION = 700;

export default function Splash({ onDone }) {
  const { loading } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_HOLD);
    const t2 = setTimeout(() => setDrawn(true), 3800);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (!minElapsed || loading) return;
    setFading(true);
    const t = setTimeout(() => {
      setGone(true);
      onDone?.();
    }, FADE_DURATION);
    return () => { clearTimeout(t); };
  }, [minElapsed, loading, onDone]);

  if (gone) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 28,
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-out`,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div className={drawn ? 'lu-splash-stage drawn' : 'lu-splash-stage'}>
        <svg viewBox="0 0 200 200" width="220" height="220">
          <rect className="lu-splash-frame" x="14" y="14" width="172" height="172" rx="34" />
          <path className="lu-splash-letter lu-splash-letter-l" d="M 62 60 L 62 130 L 96 130" />
          <path className="lu-splash-letter lu-splash-letter-u" d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60" />
          <rect className="lu-splash-glow" x="14" y="14" width="172" height="172" rx="34" />
        </svg>
      </div>

      <div
        style={{
          fontSize: 12,
          color: '#6d7382',
          letterSpacing: 0.8,
          opacity: drawn ? 1 : 0,
          transform: drawn ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 900ms ease-out 300ms, transform 900ms ease-out 300ms',
          textAlign: 'center',
        }}
      >
        Admin Panel · by Samuel Mugasia
      </div>
    </div>
  );
}
