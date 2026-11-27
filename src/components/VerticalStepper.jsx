import { CheckCircleIcon } from './Icons.jsx';

export default function VerticalStepper({ steps, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const state = step.state || 'pending';

        const dotColor =
          state === 'done' ? '#22c55e' :
          state === 'current' ? '#ef4444' :
          state === 'error' ? '#ef4444' :
          '#1f1f1f';

        const dotBorder =
          state === 'current' ? '2px solid #ef4444' :
          state === 'error' ? '2px solid #ef4444' :
          '2px solid #2a2a2a';

        const lineColor = state === 'done' ? '#22c55e' : '#1f1f1f';

        // A step is clickable if it's the current step AND has an onAction
        const isClickable = state === 'current' && step.onAction;

        const Wrapper = isClickable ? 'button' : 'div';
        const wrapperProps = isClickable ? {
          onClick: step.onAction,
          style: {
            display: 'flex', gap: 16, position: 'relative',
            width: '100%', background: 'transparent', border: 'none',
            textAlign: 'left', cursor: 'pointer', padding: 0
          }
        } : {
          style: { display: 'flex', gap: 16, position: 'relative' }
        };

        return (
          <Wrapper key={i} {...wrapperProps}>
            {/* Dot + Line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14,
                background: dotColor,
                border: dotBorder,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 1,
                boxShadow: state === 'current' ? '0 0 0 6px rgba(239,68,68,0.15)' : 'none',
                transition: 'all 300ms ease',
              }}>
                {state === 'done' && <CheckCircleIcon width={14} height={14} color="#fff" />}
                {state === 'current' && (
                  <div style={{
                    width: 10, height: 10, borderRadius: 5,
                    background: '#fff',
                    animation: 'stepper-pulse 1.5s ease-in-out infinite',
                  }} />
                )}
                {state === 'error' && (
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
              {!isLast && (
                <div style={{
                  width: 2,
                  flex: 1,
                  minHeight: 32,
                  background: lineColor,
                  marginTop: 4, marginBottom: 4,
                  transition: 'background 300ms ease',
                }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 24, paddingTop: 2 }}>
              <div style={{
                fontSize: 14,
                fontWeight: state === 'current' ? 800 : 700,
                color: state === 'pending' ? '#6d7382' : '#fff',
                letterSpacing: 0.2,
              }}>
                {step.label}
              </div>
              {step.description && (
                <div style={{
                  fontSize: 13,
                  color: state === 'pending' ? '#4a4f5c' : '#9aa0aa',
                  marginTop: 4,
                  lineHeight: 1.5,
                }}>
                  {step.description}
                </div>
              )}
              {step.detail && (
                <div style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  background: '#0f0f0f',
                  border: '1px solid #1f1f1f',
                  borderRadius: 10,
                  fontSize: 12,
                  color: '#c5c8cf',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                }}>
                  {step.detail}
                </div>
              )}

              {/* Tap to Mark Done Hint */}
              {isClickable && (
                <div style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: '#ef4444',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: '#ef4444' }} />
                  Tap here to mark as checked
                </div>
              )}

              {/* Custom content below the step (Approve buttons) */}
              {state === 'current' && action && (
                <div style={{ marginTop: 16 }}>
                  {action}
                </div>
              )}
            </div>
          </Wrapper>
        );
      })}

      <style>{`
        @keyframes stepper-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
