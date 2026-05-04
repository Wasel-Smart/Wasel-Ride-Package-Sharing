/**
 * WaselBadge — Live indicator and status badges.
 *
 * Variants:
 *  - live: Pulsing green dot + "LIVE DATA"
 *  - ai: Cyan brain icon + "AI POWERED"
 *  - new: Orange dot + "NEW"
 *  - custom: Any color/text
 */

import { Brain, Zap, Radio } from 'lucide-react';
import type { ReactNode } from 'react';

type BadgeVariant = 'live' | 'ai' | 'new' | 'hot' | 'custom';

interface WaselBadgeProps {
  variant?: BadgeVariant;
  label?: string;
  icon?: ReactNode;
  className?: string;
}

const variants: Record<
  BadgeVariant,
  {
    bg: string;
    text: string;
    border: string;
    dot?: string;
    defaultIcon?: ReactNode;
    defaultLabel: string;
  }
> = {
  live: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    defaultIcon: <Radio className="w-3 h-3" />,
    defaultLabel: 'LIVE DATA',
  },
  ai: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/20',
    defaultIcon: <Brain className="w-3 h-3" />,
    defaultLabel: 'AI POWERED',
  },
  new: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    defaultLabel: 'NEW',
  },
  hot: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    defaultIcon: <Zap className="w-3 h-3" />,
    defaultLabel: 'HOT',
  },
  custom: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    defaultLabel: '',
  },
};

export function WaselBadge({ variant = 'live', label, icon, className = '' }: WaselBadgeProps) {
  const v = variants[variant];

  return (
    <span
      className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      text-[10px] font-bold uppercase tracking-widest
      ${v.bg} ${v.text} border ${v.border}
      ${className}
    `}
    >
      {v.dot && <span className={`w-1.5 h-1.5 rounded-full ${v.dot} live-dot`} />}
      {icon || v.defaultIcon}
      {label || v.defaultLabel}
    </span>
  );
}
