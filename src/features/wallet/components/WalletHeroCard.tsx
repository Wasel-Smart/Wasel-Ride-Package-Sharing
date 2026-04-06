import { ArrowUpRight, Clock, Eye, EyeOff, Gift, Plus, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { WaselColors } from '../../../tokens/wasel-tokens';

type WalletHeroCardProps = {
  balance: number;
  balanceVisible: boolean;
  pendingBalance: number;
  rewardsBalance: number;
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
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: `linear-gradient(135deg, ${WaselColors.navyCard} 0%, #1a2744 50%, #0d2137 100%)`,
        border: `1px solid ${WaselColors.teal}20`,
      }}
    >
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-10" style={{ background: WaselColors.teal }} />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full opacity-5" style={{ background: WaselColors.bronze }} />

      <div className="relative z-10">
        <div className="mb-1 flex items-center justify-between gap-4">
          <div>
            <span className="text-sm text-slate-400">{t.balance}</span>
            <p className="mt-1 text-xs text-slate-400">
              Keep your money actions in one place: add money, withdraw, or send instantly.
            </p>
          </div>
          <button type="button" onClick={onToggleBalance} className="text-slate-400 transition-colors hover:text-white">
            {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight text-white tabular-nums">
            {balanceVisible ? balance.toFixed(2) : t.maskedBalance}
          </span>
          <span className="text-lg font-medium text-slate-400">{t.jod}</span>
        </div>

        <div className="mb-6 flex gap-4">
          {pendingBalance > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-xs text-yellow-400">
                {t.pending}: {balanceVisible ? pendingBalance.toFixed(2) : t.maskedShort} {t.jod}
              </span>
            </div>
          )}
          {rewardsBalance > 0 && (
            <div className="flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs text-purple-400">
                {t.rewards}: {balanceVisible ? rewardsBalance.toFixed(2) : t.maskedShort} {t.jod}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button onClick={onShowTopUp} className="h-12 rounded-xl text-sm font-semibold" style={{ background: WaselColors.teal }}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t.addMoney}
          </Button>
          <Button onClick={onShowWithdraw} variant="outline" className="h-12 rounded-xl border-slate-600 text-sm font-semibold text-slate-200 hover:bg-slate-700/50">
            <ArrowUpRight className="mr-1.5 h-4 w-4" />
            {t.withdraw}
          </Button>
          <Button onClick={onShowSend} variant="outline" className="h-12 rounded-xl border-slate-600 text-sm font-semibold text-slate-200 hover:bg-slate-700/50">
            <Send className="mr-1.5 h-4 w-4" />
            {t.sendMoney}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
