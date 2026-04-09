import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  CreditCard,
  Crown,
  Gift,
  Lock,
  Plus,
  RefreshCw,
  Send,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { WaselColors } from '../../../tokens/wasel-tokens';

export const TX_ICONS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  topup: { icon: Plus, color: WaselColors.success, bg: 'bg-green-500/10' },
  payment: { icon: CreditCard, color: WaselColors.error, bg: 'bg-red-500/10' },
  earning: { icon: TrendingUp, color: WaselColors.teal, bg: 'bg-teal-500/10' },
  withdrawal: { icon: ArrowUpRight, color: WaselColors.warning, bg: 'bg-orange-500/10' },
  refund: { icon: RefreshCw, color: WaselColors.info, bg: 'bg-blue-500/10' },
  send: { icon: Send, color: WaselColors.bronze, bg: 'bg-amber-500/10' },
  receive: { icon: ArrowDownLeft, color: WaselColors.success, bg: 'bg-green-500/10' },
  reward: { icon: Gift, color: '#A855F7', bg: 'bg-purple-500/10' },
  subscription: { icon: Crown, color: WaselColors.bronze, bg: 'bg-amber-500/10' },
  escrow_hold: { icon: Lock, color: WaselColors.warning, bg: 'bg-yellow-500/10' },
  escrow_release: { icon: CheckCircle, color: WaselColors.success, bg: 'bg-green-500/10' },
  cashback: { icon: Zap, color: '#A855F7', bg: 'bg-purple-500/10' },
};

export const PIE_COLORS = ['#47B7E6', '#A8D614', '#22C55E', '#A855F7', '#3B82F6', '#F59E0B', '#EF4444'];
