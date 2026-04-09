/**
 * LiveAnnouncer
 *
 * Renders an aria-live region for dynamic status announcements.
 * Screen readers announce changes to these regions automatically.
 *
 * Usage:
 *   <LiveAnnouncer message={bookingMessage} />
 *   <LiveAnnouncer message={errorMessage} priority="assertive" />
 *
 * The element is visually hidden but fully accessible. It wraps the
 * message in a keyed span so changing the same text twice still triggers
 * an announcement (React would otherwise skip the re-render).
 */

import { useRef } from 'react';

interface LiveAnnouncerProps {
  /** The message to announce. Pass null/undefined/''/false to clear. */
  message: string | null | undefined | false;
  /**
   * 'polite' (default) — waits for the user to finish their current action.
   * 'assertive' — interrupts the user immediately. Use for errors only.
   */
  priority?: 'polite' | 'assertive';
  /** Optional additional className for the wrapper element. */
  className?: string;
}

/** Visually-hidden style — element is in the accessibility tree but not visible */
const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function LiveAnnouncer({
  message,
  priority = 'polite',
  className,
}: LiveAnnouncerProps) {
  // Keep a monotonically increasing key so the same message text triggers
  // a fresh DOM update (and therefore a fresh screen-reader announcement).
  const keyRef = useRef(0);
  if (message) keyRef.current += 1;

  return (
    <div
      role={priority === 'assertive' ? 'alert' : 'status'}
      aria-live={priority}
      aria-atomic="true"
      style={SR_ONLY}
      className={className}
    >
      {message ? <span key={keyRef.current}>{message}</span> : null}
    </div>
  );
}
