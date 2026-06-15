/**
 * notificationHelpers.ts
 *
 * Pure utility functions and static maps for the NotificationCenter.
 * No React dependency — safe to import from anywhere, including tests.
 */
import {
  Bell,
  CarFront,
  CircleDollarSign,
  LifeBuoy,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import type { NotificationCategory } from '../../features/notifications/notificationCenterModel';

// ── Icon + accent maps ────────────────────────────────────────────────────────

export const CATEGORY_ICON: Record<NotificationCategory, typeof CarFront> = {
  rides: CarFront,
  messages: MessageSquare,
  wallet: CircleDollarSign,
  trust: ShieldCheck,
  support: LifeBuoy,
  system: Bell,
};

export const CATEGORY_ACCENT: Record<NotificationCategory, string> = {
  rides: 'from-cyan-500/25 to-sky-500/5 text-cyan-300 border-cyan-500/20',
  messages: 'from-blue-500/25 to-indigo-500/5 text-blue-300 border-blue-500/20',
  wallet: 'from-emerald-500/25 to-lime-500/5 text-emerald-300 border-emerald-500/20',
  trust: 'from-amber-500/25 to-orange-500/5 text-amber-300 border-amber-500/20',
  support: 'from-rose-500/25 to-pink-500/5 text-rose-300 border-rose-500/20',
  system: 'from-slate-500/25 to-slate-400/5 text-slate-200 border-slate-500/20',
};

// ── Timestamp formatter ───────────────────────────────────────────────────────

/**
 * Returns a human-readable relative timestamp.
 * Bilingual: English or Arabic based on `isRTL`.
 */
export function formatRelativeTimestamp(dateString: string, isRTL: boolean): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return isRTL ? 'الآن' : 'Just now';
  if (diffMins < 60) return isRTL ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
  if (diffHours < 24) return isRTL ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
  if (diffDays < 7) return isRTL ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  return date.toLocaleDateString();
}
