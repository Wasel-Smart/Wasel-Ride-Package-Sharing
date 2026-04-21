import { ArrowUpRight, Clock, Eye, EyeOff, Gift, Plus, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { WaselColors, WaselShadows } from '../../../tokens/wasel-tokens';

type WalletHeroCardProps = {
  balance: number;
  balanceVisible: boolean;
  pendingBalance: number;
  rewardsBalance: number;
  actionsLocked?: boolean;
  subscription?: {
    planName: string;
    corridorLabel?: string | null;
  } | null;
  t: Record<string, string>;
  onShowSend: () => void;
  onShowTopUp: () => void;
  onShowWithdraw: () => void;
  onToggleBalance: () => void;
};

export function WalletHeroCard({
  balance,
  balanceVisible,
  pendingBalance,
  rewardsBalance,
  actionsLocked = false,
  subscription = null,
  t,
  onShowSend,
  onShowTopUp,
  onShowWithdraw,
  onToggleBalance,
}: WalletHeroCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] p-[var(--wasel-card-padding)]"
      style={{
        background: [
          `radial-gradient(circle at 82% 18%, ${WaselColors.cyanGlow} 0%, transparent 24%)`,
          `radial-gradient(circle at 16% 88%, ${WaselColors.greenGlow} 0%, transparent 22%)`,
          `linear-gradient(135deg, rgba(8,15,26,0.98) 0%, ${WaselColors.navyCard} 56%, rgba(6,13,26,0.98) 100%)`,
        ].join(','),
        border: `1px solid ${WaselColors.borderDark}`,
        boxShadow: WaselShadows.glow,
      }}
    >
      <div
        className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-10"
        style={{ background: WaselColors.teal }}
      />
      <div
        className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full opacity-5"
        style={{ background: WaselColors.bronze }}
      />

      <div className="relative z-10">
        <div className="mb-1 flex items-center justify-between gap-4">
          <div>
            <span className="text-sm" style={{ color: WaselColors.textSecondary }}>{t.balance}</span>
            <p className="mt-1 text-xs" style={{ color: WaselColors.textMuted }}>
              {subscription
                ? [subscription.planName, subscription.corridorLabel].filter(Boolean).join(' - ')
                : t.heroSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleBalance}
            className="transition-colors"
            style={{ color: WaselColors.textSecondary }}
          >
            {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight tabular-nums" style={{ color: WaselColors.textPrimary }}>
            {balanceVisible ? balance.toFixed(2) : t.maskedBalance}
          </span>
          <span className="text-lg font-medium" style={{ color: WaselColors.textSecondary }}>{t.jod}</span>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            className="rounded-[1.35rem] px-4 py-3"
            style={{
              border: `1px solid ${WaselColors.borderDark}`,
              background: 'rgba(220,255,248,0.05)',
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: WaselColors.textMuted }}>{t.availableLabel}</div>
            <div className="mt-1 text-base font-semibold tabular-nums" style={{ color: WaselColors.textPrimary }}>
              {balanceVisible ? balance.toFixed(2) : t.maskedShort} {t.jod}
            </div>
          </div>
          <div
            className="rounded-[1.35rem] px-4 py-3"
            style={{
              border: `1px solid ${WaselColors.borderDark}`,
              background: 'rgba(220,255,248,0.05)',
            }}
          >
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]" style={{ color: WaselColors.textMuted }}>
              <Clock className="h-3.5 w-3.5" style={{ color: WaselColors.orange }} />
              {t.pending}
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums" style={{ color: WaselColors.textPrimary }}>
              {balanceVisible ? pendingBalance.toFixed(2) : t.maskedShort} {t.jod}
            </div>
          </div>
          <div
            className="rounded-[1.35rem] px-4 py-3"
            style={{
              border: `1px solid ${WaselColors.borderDark}`,
              background: 'rgba(220,255,248,0.05)',
            }}
          >
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]" style={{ color: WaselColors.textMuted }}>
              <Gift className="h-3.5 w-3.5" style={{ color: WaselColors.bronze }} />
              {t.rewards}
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums" style={{ color: WaselColors.textPrimary }}>
              {balanceVisible ? rewardsBalance.toFixed(2) : t.maskedShort} {t.jod}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            onClick={onShowTopUp}
            disabled={actionsLocked}
            className="h-12 rounded-[1.15rem] text-sm font-semibold"
          >
            <Plus className="me-1.5 h-4 w-4" />
            {t.addMoney}
          </Button>
          <Button
            onClick={onShowWithdraw}
            disabled={actionsLocked}
            variant="outline"
            className="h-12 rounded-[1.15rem] text-sm font-semibold"
          >
            <ArrowUpRight className="me-1.5 h-4 w-4" />
            {t.withdraw}
          </Button>
          <Button
            onClick={onShowSend}
            disabled={actionsLocked}
            variant="outline"
            className="h-12 rounded-[1.15rem] text-sm font-semibold"
          >
            <Send className="me-1.5 h-4 w-4" />
            {t.sendMoney}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
