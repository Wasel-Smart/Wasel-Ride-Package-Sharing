import type { ReactNode } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/**
 * Keep the initial route visible immediately and use a compositor-only CSS
 * transition for later navigations. This keeps framer-motion out of the app
 * shell's critical bundle while preserving a small route-change cue.
 */
export function WaselRouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigationType = useNavigationType();

  return (
    <div
      key={location.pathname}
      className={navigationType === 'POP' ? undefined : 'wasel-route-enter'}
      style={{ width: '100%' }}
    >
      {children}
    </div>
  );
}
