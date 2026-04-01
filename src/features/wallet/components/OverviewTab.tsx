/**
 * OverviewTab — Wallet Dashboard overview tab
 * Extracted from WalletDashboard to reduce file size
 */

import { motion } from 'motion/react';
import {
  ArrowDownLeft, ArrowUpRight, TrendingUp, Lock, Crown, ChevronRight,
  Car, Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { WaselColors } from '../../../tokens/wasel-tokens';
import { TransactionRow } from './WalletShared';
import type { WalletData } from '../../../services/walletApi';

interface OverviewTabProps {
  walletData: WalletData | null;
  isRTL: boolean;
  t: Record<string, string>;
  onSetTab: (tab: string) => void;
  onSubscribe: () => void;
  actionLoading: boolean;
}

export function OverviewTab({ walletData, isRTL, t, onSetTab, onSubscribe, actionLoading }: OverviewTabProps) {
  const transactions = walletData?.transactions ?? [];
  const pendingCount = transactions.filter((tx: any) => ['pending', 'processing', 'authorized', 'posted'].includes(String(tx.status ?? '').toLowerCase())).length;
  const failedCount = transactions.filter((tx: any) => ['failed'].includes(String(tx.status ?? '').toLowerCase())).length;
  const refundedCount = transactions.filter((tx: any) => ['refunded'].includes(String(tx.status ?? '').toLowerCase())).length;
  const paymentMethodsCount = walletData?.wallet?.paymentMethods?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isRTL ? '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0625\u064A\u062F\u0627\u0639' : 'Deposited', value: walletData?.total_deposited ?? 0, icon: ArrowDownLeft, color: WaselColors.success },
          { label: isRTL ? '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0625\u0646\u0641\u0627\u0642' : 'Spent', value: walletData?.total_spent ?? 0, icon: ArrowUpRight, color: WaselColors.error },
          { label: isRTL ? '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0628\u062D' : 'Earned', value: walletData?.total_earned ?? 0, icon: TrendingUp, color: WaselColors.teal },
        ].map((s) => (
          <Card key={s.label} className="p-3 rounded-xl border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">{s.value.toFixed(2)}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-xl border-border/30">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">{isRTL ? 'التحويلات قيد المعالجة' : 'In settlement'}</div>
            <div className="text-lg font-bold text-foreground">{pendingCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {walletData?.pendingBalance
                ? `${walletData.pendingBalance.toFixed(2)} ${t.jod} ${isRTL ? 'قيد الإطلاق' : 'awaiting release'}`
                : isRTL ? 'لا توجد مبالغ معلقة الآن' : 'No held balance right now'}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/30">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">{isRTL ? 'حالات تحتاج متابعة' : 'Needs follow-up'}</div>
            <div className="text-lg font-bold text-foreground">{failedCount + refundedCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {failedCount > 0
                ? isRTL ? 'راجع المحاولات الفاشلة أو الاستردادات.' : 'Review failed payouts or refund events.'
                : isRTL ? 'لا توجد مشاكل دفع مفتوحة.' : 'No open payment issues.'}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/30">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">{isRTL ? 'جاهزية السداد' : 'Settlement readiness'}</div>
            <div className="text-lg font-bold text-foreground">{paymentMethodsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {paymentMethodsCount > 0
                ? isRTL ? 'وسائل دفع محفوظة للحجز والسحب.' : 'Saved payment methods for booking and withdrawal.'
                : isRTL ? 'أضف وسيلة دفع لفتح السداد الكامل.' : 'Add a payment method to unlock full settlement.'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Escrows */}
      {walletData?.activeEscrows && walletData.activeEscrows.length > 0 && (
        <Card className="rounded-xl border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-yellow-400" />
              {t.escrow}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {walletData.activeEscrows.map((esc: any) => (
              <div key={esc.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  {esc.type === 'package' ? <Package className="w-4 h-4 text-muted-foreground" /> : <Car className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm">Trip #{esc.tripId?.slice(0, 8)}</span>
                </div>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                  {t.held}: {esc.amount} {t.jod}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Subscription Card */}
      <Card className="rounded-xl overflow-hidden" style={{ border: `1px solid ${WaselColors.bronze}30` }}>
        <div className="p-4" style={{ background: `linear-gradient(135deg, ${WaselColors.bronze}15, transparent)` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${WaselColors.bronze}20` }}>
                <Crown className="w-5 h-5" style={{ color: WaselColors.bronze }} />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{t.subscription}</h3>
                <p className="text-xs text-muted-foreground">
                  {walletData?.subscription
                    ? t.activeSubscription
                    : isRTL ? '10% \u062E\u0635\u0645 \u0639\u0644\u0649 \u0627\u0644\u0631\u062D\u0644\u0627\u062A \u2022 \u062D\u062C\u0632 \u0623\u0648\u0644\u0648\u064A\u0629' : '10% off rides \u2022 Priority booking'}
                </p>
              </div>
            </div>
            {walletData?.subscription ? (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/30">{isRTL ? '\u0641\u0639\u0651\u0627\u0644' : 'Active'}</Badge>
            ) : (
              <Button size="sm" onClick={onSubscribe} disabled={actionLoading} style={{ background: WaselColors.bronze }}>
                {t.subscribeNow}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{t.recentTransactions}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onSetTab('transactions')} className="text-xs text-primary">
              {t.viewAll} <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(!walletData?.transactions || walletData.transactions.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground text-sm">{t.noTransactions}</div>
          ) : (
            walletData.transactions.slice(0, 5).map((tx: any) => (
              <TransactionRow key={tx.id} tx={tx} isRTL={isRTL} jodLabel={t.jod} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
