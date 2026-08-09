type BodyLockSnapshot = {
  overflow: string;
  paddingRight: string;
};

let activeLocks = 0;
let snapshot: BodyLockSnapshot | null = null;

function getScrollbarWidth() {
  if (typeof window === 'undefined') return 0;
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getScrollTarget(): HTMLElement {
  if (isPwaStandalone()) {
    return (document.getElementById('root') as HTMLElement) ?? document.body;
  }
  return document.body;
}

export function lockBodyScroll() {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  activeLocks += 1;

  if (activeLocks === 1) {
    const target = getScrollTarget();
    snapshot = {
      overflow: target.style.overflow,
      paddingRight: target.style.paddingRight,
    };
    target.style.overflow = 'hidden';
    if (!isPwaStandalone()) {
      const scrollbarWidth = getScrollbarWidth();
      if (scrollbarWidth > 0) {
        target.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    releaseOneLock();
  };
}

function releaseOneLock() {
  activeLocks = Math.max(0, activeLocks - 1);
  if (activeLocks > 0 || !snapshot) return;
  const target = getScrollTarget();
  target.style.overflow = snapshot.overflow;
  target.style.paddingRight = snapshot.paddingRight;
  snapshot = null;
}

/**
 * Hard-reset all active locks on route change to prevent leaked locks
 * when a modal/sheet unmounts without calling its release function.
 */
export function resetBodyScrollLock() {
  if (activeLocks === 0) return;
  activeLocks = 1;
  releaseOneLock();
}
