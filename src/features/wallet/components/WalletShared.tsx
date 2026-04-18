/**
 * WalletShared
 *
 * Shared wallet primitives used across the dashboard surface.
 */

import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useId, type ReactNode } from 'react';
import { WaselColors } from '../../../tokens/wasel-tokens';
import type { WalletTransaction } from '../../../services/walletApi';
import { TX_ICONS } from './walletSharedMeta';

const STATUS_LABEL_KEY: Record<string, string> = {
  pending: 'txStatusPending',
  processing: 'txStatusProcessing',
  requires_action: 'txStatusProcessing',
  authorized: 'txStatusAuthorized',
  posted: 'txStatusPosted',
  completed: 'txStatusCompleted',
  captured: 'txStatusCaptured',
  refunded: 'txStatusRefunded',
  failed: 'txStatusFailed',
  cancelled: 'txStatusFailed',
};

const TX_STATUS_CLASS: Record<string, string> = {
  pending: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  processing: 'text-sky-300 border-sky-400/30 bg-sky-500/10',
  requires_action: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  authorized: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  posted: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  completed: 'text-green-300 border-green-400/30 bg-green-500/10',
  captured: 'text-green-300 border-green-400/30 bg-green-500/10',
  refunded: 'text-sky-300 border-sky-400/30 bg-sky-500/10',
  failed: 'text-red-300 border-red-400/30 bg-red-500/10',
  cancelled: 'text-slate-300 border-slate-400/30 bg-slate-500/10',
};

// Shared transaction row used across wallet tabs
export function TransactionRow({ tx, isRTL, jodLabel, t }: { tx: WalletTransaction; isRTL: boolean; jodLabel: string; t: Record<string, string> }) {
  const txType = tx.type || 'payment';
  const iconCfg = TX_ICONS[txType] || TX_ICONS.payment;
  const Icon = iconCfg.icon;
  const amount = tx.amount ?? 0;
  const isPositive = amount > 0;
  const date = new Date(tx.createdAt);
  const statusKey = String(tx.status ?? 'completed').toLowerCase();
  const statusLabel = t[STATUS_LABEL_KEY[statusKey]] ?? t.txStatusCompleted ?? statusKey;
  const statusClassName = TX_STATUS_CLASS[statusKey] ?? TX_STATUS_CLASS.completed;
  const reference = tx.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconCfg.bg}`}>
        <Icon className="w-5 h-5" style={{ color: iconCfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">
            {date.toLocaleDateString(isRTL ? 'ar-JO' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClassName}`}>
            {statusLabel}
          </span>
          {reference ? (
            <span className="text-[10px] text-muted-foreground/80">
              Ref {String(reference).slice(-8)}
            </span>
          ) : null}
        </div>
      </div>
      <span className={`text-sm font-bold tabular-nums ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{amount.toFixed(2)} {jodLabel}
      </span>
    </motion.div>
  );
}

// Shared modal shell for wallet actions
export function ActionModal({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const titleId = useId();

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
          aria-hidden="true"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md rounded-2xl border border-border/50 p-6 space-y-4"
            style={{ background: WaselColors.navyCard }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={titleId} className="text-lg font-bold text-foreground">{title}</h3>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

