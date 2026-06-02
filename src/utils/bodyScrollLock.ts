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

export function lockBodyScroll() {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  activeLocks += 1;

  if (activeLocks === 1) {
    const { body } = document;
    snapshot = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };

    const scrollbarWidth = getScrollbarWidth();
    body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;

    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks > 0 || !snapshot) return;

    document.body.style.overflow = snapshot.overflow;
    document.body.style.paddingRight = snapshot.paddingRight;
    snapshot = null;
  };
}
