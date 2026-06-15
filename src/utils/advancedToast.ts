import { C, SH, R, F } from './wasel-ds';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
  action?: ToastAction;
  dismissible?: boolean;
  icon?: string;
}

interface ActiveToast extends ToastOptions {
  id: string;
  element: HTMLDivElement;
  timer?: NodeJS.Timeout;
}

const activeToasts = new Map<string, ActiveToast>();

function getToastStyles(type: ToastType) {
  const styles = {
    success: {
      background: C.green + '1A',
      border: `1px solid ${C.green}`,
      color: C.green,
      icon: '✓',
    },
    error: {
      background: C.error + '1A',
      border: `1px solid ${C.error}`,
      color: C.error,
      icon: '✕',
    },
    warning: {
      background: C.gold + '1A',
      border: `1px solid ${C.gold}`,
      color: C.gold,
      icon: '⚠',
    },
    info: {
      background: C.cyan + '1A',
      border: `1px solid ${C.cyan}`,
      color: C.cyan,
      icon: 'ℹ',
    },
  };

  return styles[type];
}

function createToastElement(options: ToastOptions): HTMLDivElement {
  const {
    message,
    type = 'info',
    action,
    dismissible = true,
    icon,
  } = options;

  const style = getToastStyles(type);
  const container = document.createElement('div');

  Object.assign(container.style, {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
    borderRadius: R.lg,
    background: style.background,
    border: style.border,
    color: style.color,
    fontSize: '0.9rem',
    fontFamily: F,
    boxShadow: SH.lg,
    maxWidth: '420px',
    minWidth: '300px',
    animation: 'slideIn 0.3s ease-out',
    marginBottom: '12px',
  });

  // Icon
  const iconEl = document.createElement('span');
  iconEl.textContent = icon || style.icon;
  Object.assign(iconEl.style, {
    fontSize: '1.2rem',
    fontWeight: '700',
    flexShrink: '0',
  });
  container.appendChild(iconEl);

  // Message
  const messageEl = document.createElement('div');
  messageEl.textContent = message;
  Object.assign(messageEl.style, {
    flex: '1',
    lineHeight: '1.4',
  });
  container.appendChild(messageEl);

  // Action button
  if (action) {
    const actionBtn = document.createElement('button');
    actionBtn.textContent = action.label;
    Object.assign(actionBtn.style, {
      padding: '6px 12px',
      borderRadius: R.md,
      border: 'none',
      background: style.color,
      color: C.bgDeep,
      fontWeight: '700',
      fontSize: '0.8rem',
      cursor: 'pointer',
      fontFamily: F,
    });
    actionBtn.onclick = () => {
      action.onClick();
      dismissToast(container.dataset.toastId!);
    };
    container.appendChild(actionBtn);
  }

  // Dismiss button
  if (dismissible) {
    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = '✕';
    Object.assign(dismissBtn.style, {
      padding: '4px 8px',
      borderRadius: R.full,
      border: 'none',
      background: 'transparent',
      color: style.color,
      cursor: 'pointer',
      fontSize: '1rem',
      opacity: '0.7',
      transition: 'opacity 0.2s',
      flexShrink: '0',
    });
    dismissBtn.onmouseenter = () => (dismissBtn.style.opacity = '1');
    dismissBtn.onmouseleave = () => (dismissBtn.style.opacity = '0.7');
    dismissBtn.onclick = () => dismissToast(container.dataset.toastId!);
    container.appendChild(dismissBtn);
  }

  return container;
}

function getOrCreateToastContainer(position: ToastPosition = 'bottom'): HTMLDivElement {
  const id = `wasel-toast-container-${position}`;
  let container = document.getElementById(id) as HTMLDivElement;

  if (!container) {
    container = document.createElement('div');
    container.id = id;
    Object.assign(container.style, {
      position: 'fixed',
      [position]: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '10000',
      display: 'flex',
      flexDirection: position === 'top' ? 'column' : 'column-reverse',
      alignItems: 'center',
      pointerEvents: 'none',
    });
    document.body.appendChild(container);

    // Add animation keyframes
    if (!document.getElementById('wasel-toast-animations')) {
      const style = document.createElement('style');
      style.id = 'wasel-toast-animations';
      style.textContent = `
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(${position === 'top' ? '-' : ''}20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(${position === 'top' ? '-' : ''}20px);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  return container;
}

export function dismissToast(toastId: string): void {
  const toast = activeToasts.get(toastId);
  if (!toast) return;

  if (toast.timer) {
    clearTimeout(toast.timer);
  }

  toast.element.style.animation = 'slideOut 0.3s ease-out';
  setTimeout(() => {
    toast.element.remove();
    activeToasts.delete(toastId);
  }, 300);
}

export function showToast(options: ToastOptions): string {
  const {
    duration = 5000,
    position = 'bottom',
  } = options;

  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const container = getOrCreateToastContainer(position);
  const element = createToastElement(options);

  element.dataset.toastId = toastId;
  element.style.pointerEvents = 'auto';

  container.appendChild(element);

  let timer: NodeJS.Timeout | undefined;
  if (duration > 0) {
    timer = setTimeout(() => {
      dismissToast(toastId);
    }, duration);
  }

  activeToasts.set(toastId, {
    ...options,
    id: toastId,
    element,
    timer,
  });

  return toastId;
}

export function showSuccessToast(message: string, action?: ToastAction): string {
  return showToast({ message, type: 'success', action });
}

export function showErrorToast(message: string, action?: ToastAction): string {
  return showToast({ message, type: 'error', duration: 7000, action });
}

export function showWarningToast(message: string, action?: ToastAction): string {
  return showToast({ message, type: 'warning', duration: 6000, action });
}

export function showInfoToast(message: string, action?: ToastAction): string {
  return showToast({ message, type: 'info', action });
}

export function dismissAllToasts(): void {
  activeToasts.forEach((_, id) => dismissToast(id));
}
