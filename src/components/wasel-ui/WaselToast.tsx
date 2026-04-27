/**
 * WaselToast — unified design system
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

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

const icons = { success: CheckCircle, error: AlertCircle, warning: AlertCircle, info: Info };

const colors = {
  success: 'var(--success)',
  error: 'var(--error)',
  warning: 'var(--warning)',
  info: 'var(--info)',
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
        zIndex: 400,
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
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Icon size={18} style={{ color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>
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
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: 'var(--text-muted)',
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
