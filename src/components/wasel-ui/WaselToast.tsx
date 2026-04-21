import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, Info, X, XCircle } from 'lucide-react';
import { C, R, TYPE, Z } from '../utils/wasel-ds';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let toastId = 0;
const toastListeners: Set<(toasts: Toast[]) => void> = new Set();
const globalToasts: Toast[] = [];

function broadcastToasts() {
  toastListeners.forEach(listener => listener([...globalToasts]));
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.add(setToasts);
    return () => {
      toastListeners.delete(setToasts);
    };
  }, []);

  const addToast = (type: ToastType, message: string) => {
    const id = `toast-${++toastId}`;
    globalToasts.push({ id, type, message });
    broadcastToasts();
    setTimeout(() => {
      const index = globalToasts.findIndex(t => t.id === id);
      if (index > -1) {
        globalToasts.splice(index, 1);
        broadcastToasts();
      }
    }, 4000);
  };

  const removeToast = (id: string) => {
    const index = globalToasts.findIndex(t => t.id === id);
    if (index > -1) {
      globalToasts.splice(index, 1);
      broadcastToasts();
    }
  };

  return { toasts, addToast, removeToast };
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: Info,
};

const colors = {
  success: C.green,
  error: C.error,
  info: C.cyan,
  warning: C.warning,
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.add(setToasts);
    return () => {
      toastListeners.delete(setToasts);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: Z.toast,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 320,
      }}
    >
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = icons[toast.type];
          const color = colors[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                background: C.navy,
                border: `1px solid ${color}40`,
                borderRadius: R.lg,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              <Icon size={18} style={{ color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: TYPE.size.sm, color: C.text }}>
                {toast.message}
              </span>
              <button
                onClick={() => {
                  const index = globalToasts.findIndex(t => t.id === toast.id);
                  if (index > -1) {
                    globalToasts.splice(index, 1);
                    broadcastToasts();
                  }
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={14} style={{ color: C.textMuted }} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
