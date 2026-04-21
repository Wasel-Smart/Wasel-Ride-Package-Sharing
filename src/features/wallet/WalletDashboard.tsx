/**
 * WalletDashboard
 *
 * Render-focused wallet screen. Runtime mode selection, demo/live data
 * handling, and wallet mutations now live in `useWalletDashboardController`.
 */

import { Wallet, Gift, RefreshCw, Lock } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { WaselColors } from '../../tokens/wasel-tokens';
import { useWalletDashboardController } from './useWalletDashboardController';
import { useOptimizedWallet } from '../../hooks/useOptimizedWallet';
import { TransactionRow as SharedTransactionRow } from './components/WalletShared';
import { OverviewTab } from './components/OverviewTab';
import { SettingsTab } from './components/SettingsTab';
import { WalletHeroCard } from './components/WalletHeroCard';
import { WalletActionModals } from './components/WalletActionModals';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import type { RewardItem, WalletTransaction } from '../../services/walletApi';
import {
  ClarityBand,
  CoreExperienceBanner,
  PageShell,
  SectionHead,
} from '../shared/pageShared';

const LazyInsightsTab = lazy(async () => {
  const module = await import('./components/InsightsTab');
  return { default: module.InsightsTab };
});

export function WalletDashboard() {
  const {
    actionLoading,
    autoTopUpAmount,
    autoTopUpEnabled,
    autoTopUpThreshold,
    balanceVisible,
    handleAddPaymentMethod,
    handleAutoTopUpToggle,
    handleClaimReward,
    handleRefresh,
    handleRemovePaymentMethod,
    handleSend,
    handleSetDefaultPaymentMethod,
    handleSetPin,
    handleSubscribe,
    handleTopUp,
    handleWithdraw,
    insights,
    isRTL,
    loading,
    pinValue,
    refreshing,
    sendAmount,
    sendNote,
    sendRecipient,
    setAutoTopUpAmount,
    setAutoTopUpThreshold,
    setBalanceVisible,
    setPinValue,
    setSendAmount,
    setSendNote,
    setSendRecipient,
    setShowPinSetup,
    setShowSend,
    setShowTopUp,
    setShowWithdraw,
    setTab,
    setTopUpAmount,
    setTopUpMethod,
    setWithdrawAmount,
    setWithdrawBank,
    setWithdrawMethod,
    shouldRedirectToAuth,
    showPinSetup,
    showSend,
    showTopUp,
    showWithdraw,
    t,
    tab,
    topUpAmount,
    topUpMethod,
    walletActionsLocked,
    walletActionsLockedMessage,
    walletData,
    walletHealth,
    walletInsightsHealth,
    walletUnavailable,
    withdrawAmount,
    withdrawBank,
    withdrawMethod,
  } = useWalletDashboardController();

  const { optimizedTransactions } = useOptimizedWallet(walletData);

  const bal = walletData?.balance ?? 0;
  const pending = walletData?.pendingBalance ?? 0;
  const rewardsBal = walletData?.rewardsBalance ?? 0;
  const walletStatusLabel = !walletHealth
    ? null
    : walletHealth.degraded
      ? (isRTL ? 'وضع احتياطي' : 'Fallback mode')
      : walletHealth.source === 'edge-api'
        ? (isRTL ? 'خدمة مباشرة' : 'Live backend')
        : (isRTL ? 'مزامنة مباشرة' : 'Direct sync');
  const walletStatusDescription = !walletHealth
    ? null
    : walletHealth.degraded
      ? (isRTL ? 'البيانات قادمة من Supabase مباشرة بسبب تعطل مسار المحفظة الأساسي.' : 'Using backup data.')
      : walletHealth.source === 'edge-api'
        ? (isRTL ? 'المحفظة تقرأ من مسار الخدمة الأساسي.' : 'Using the main service.')
        : (isRTL ? 'المحفظة تقرأ مباشرة من Supabase.' : 'Using direct sync.');
  const insightsStatusLabel = walletInsightsHealth?.degraded
    ? (isRTL ? 'الإحصاءات محلية' : 'Insights fallback')
    : null;
  const walletReadOnlyTitle = t.walletReadOnlyTitle;
  const walletReadOnlyDescription = t.walletReadOnlyDescription;
  const walletReadOnlyHint = t.walletReadOnlyHint;
  const formatAmount = (amount: number) => `${amount.toFixed(2)} ${t.jod}`;

  if (shouldRedirectToAuth) {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <Lock className="h-12 w-12 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{t.redirectingToSignIn}</p>
        </div>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
          <p className="text-sm text-muted-foreground">{t.processing}</p>
        </div>
      </PageShell>
    );
  }

  if (walletUnavailable) {
    return (
      <PageShell>
      <div className="flex items-center justify-center min-h-[60vh] px-2">
        <div
          className="w-full max-w-xl rounded-3xl border text-center p-8 md:p-10"
          style={{
            background: 'linear-gradient(180deg, rgba(220,255,248,0.08) 0%, rgba(220,255,248,0.03) 100%)',
            borderColor: WaselColors.borderDark,
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div className="flex justify-center mb-5">
            <WaselLogo size={36} theme="dark" variant="full" showWordmark={false} />
          </div>
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${WaselColors.teal}20` }}
          >
            <Wallet className="w-7 h-7" style={{ color: WaselColors.teal }} />
          </div>
          <div className="space-y-2">
            <p className="text-foreground text-lg font-semibold">
              {t.walletUnavailableTitle}
            </p>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-6">
              {t.walletUnavailableDescription}
            </p>
          </div>
          <div
            className="mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground"
            style={{ borderColor: WaselColors.borderDark, background: 'rgba(220,255,248,0.05)' }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: WaselColors.success }} />
            {t.walletUnavailableHint}
          </div>
        </div>
      </div>
      </PageShell>
    );
  }

  if (!walletData) {
    return (
      <PageShell>
      <div className="flex items-center justify-center min-h-[60vh] px-2">
        <div
          className="w-full max-w-2xl rounded-3xl border p-8 md:p-10"
          style={{
            background: 'linear-gradient(180deg, rgba(220,255,248,0.08) 0%, rgba(220,255,248,0.03) 100%)',
            borderColor: WaselColors.borderDark,
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <WaselLogo size={34} showWordmark={false} />
                <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">
                  {t.walletTitle}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-foreground text-xl font-semibold">
                  {t.walletEmptyTitle}
                </p>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  {t.walletEmptyDescription}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full px-3 py-1.5" style={{ border: `1px solid ${WaselColors.borderDark}`, background: 'rgba(220,255,248,0.05)' }}>
                  {t.walletSnapshotLabel}: {t.walletSnapshotDescription}
                </span>
                <span className="rounded-full px-3 py-1.5" style={{ border: `1px solid ${WaselColors.borderDark}`, background: 'rgba(220,255,248,0.05)' }}>
                  {walletHealth?.degraded ? walletStatusLabel : t.walletEmptyAction}
                </span>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-11 rounded-xl px-5 text-sm font-semibold"
              style={{ background: WaselColors.teal }}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t.retry}
            </Button>
          </div>
        </div>
      </div>
      </PageShell>
    );
  }

  return (
    <ErrorBoundary>
      <PageShell>
      <div className="mx-auto max-w-4xl space-y-6 pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
        <SectionHead
          emoji="💳"
          title={t.walletTitle}
          sub={t.walletSubtitle}
          color={WaselColors.teal}
          action={{
            label: refreshing ? t.processing : t.retry,
            onClick: handleRefresh,
          }}
        />

        <CoreExperienceBanner
          title={walletStatusLabel ?? (isRTL ? 'المحفظة متصلة الآن' : 'Wallet stays connected to the network')}
          detail={
            walletActionsLocked
              ? walletReadOnlyDescription
              : walletStatusDescription ??
                (isRTL
                  ? 'الرصيد والمدفوعات والمكافآت تتحرك داخل نفس واجهة واصل.'
                  : 'Balance, payments, and rewards now live inside the same Wasel visual system.')
          }
          tone={WaselColors.teal}
        />

        <ClarityBand
          title={isRTL ? 'إشارات المحفظة الأساسية' : 'Wallet essentials'}
          detail={
            isRTL
              ? 'الرصيد المتاح والمعلّق والمكافآت تظهر بنفس الإيقاع البصري المستخدم في باقي التطبيق.'
              : 'Available funds, pending value, and rewards now follow the same rhythm as the rest of the product.'
          }
          tone={WaselColors.teal}
          items={[
            { label: t.availableLabel, value: balanceVisible ? formatAmount(bal) : `${t.maskedShort} ${t.jod}` },
            { label: t.pending, value: balanceVisible ? formatAmount(pending) : `${t.maskedShort} ${t.jod}` },
            { label: t.rewards, value: balanceVisible ? formatAmount(rewardsBal) : `${t.maskedShort} ${t.jod}` },
          ]}
        />

      {walletStatusLabel && (
        <Card
          className="rounded-[1.6rem]"
          style={{ borderColor: WaselColors.borderDark, background: 'rgba(220,255,248,0.05)' }}
        >
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {walletStatusLabel}
                </Badge>
                {insightsStatusLabel && (
                  <Badge
                    variant="outline"
                    style={{ borderColor: 'rgba(248,186,62,0.28)', background: 'rgba(248,186,62,0.12)', color: WaselColors.orange }}
                  >
                    {insightsStatusLabel}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{walletStatusDescription}</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isRTL ? 'آخر تحديث' : 'Updated'} {new Date(walletHealth?.fetchedAt ?? Date.now()).toLocaleTimeString(isRTL ? 'ar-JO' : 'en-US')}
            </p>
          </CardContent>
        </Card>
      )}

      {walletActionsLocked && (
        <Card
          className="rounded-[1.6rem]"
          style={{ borderColor: 'rgba(248,186,62,0.28)', background: 'rgba(248,186,62,0.08)' }}
        >
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  style={{ borderColor: 'rgba(248,186,62,0.28)', background: 'rgba(248,186,62,0.12)', color: WaselColors.orange }}
                >
                  {walletReadOnlyTitle}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{walletReadOnlyDescription}</p>
            </div>
            <p className="text-[11px] text-amber-500">{walletReadOnlyHint}</p>
          </CardContent>
        </Card>
      )}

      <WalletHeroCard
        actionsLocked={walletActionsLocked}
        balanceVisible={balanceVisible}
        balance={bal}
        pendingBalance={pending}
        rewardsBalance={rewardsBal}
        subscription={walletData?.subscription ?? null}
        t={t}
        onToggleBalance={() => setBalanceVisible(!balanceVisible)}
        onShowTopUp={() => setShowTopUp(true)}
        onShowWithdraw={() => setShowWithdraw(true)}
        onShowSend={() => setShowSend(true)}
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex h-auto w-full gap-2 overflow-x-auto rounded-[1.6rem] p-1.5">
          <TabsTrigger value="overview" className="min-w-[110px] flex-1 text-xs">{t.overview}</TabsTrigger>
          <TabsTrigger value="transactions" className="min-w-[110px] flex-1 text-xs">{t.transactions}</TabsTrigger>
          <TabsTrigger value="rewards" className="min-w-[110px] flex-1 text-xs">{t.rewardsTab}</TabsTrigger>
          <TabsTrigger value="insights" className="min-w-[110px] flex-1 text-xs">{t.insights}</TabsTrigger>
          <TabsTrigger value="settings" className="min-w-[110px] flex-1 text-xs">{t.settings}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <OverviewTab
            walletData={walletData}
            isRTL={isRTL}
            t={t}
            onSetTab={setTab}
            onSubscribe={handleSubscribe}
            actionLoading={actionLoading}
            actionsLocked={walletActionsLocked}
          />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card className="rounded-[1.6rem]">
            <CardContent className="pt-4">
              {(!optimizedTransactions || optimizedTransactions.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground text-sm">{t.noTransactions}</div>
              ) : (
                optimizedTransactions.map((tx: WalletTransaction) => (
                  <SharedTransactionRow key={tx.id} tx={tx} isRTL={isRTL} jodLabel={t.jod} t={t} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="mt-4 space-y-4">
          <Card className="rounded-[1.6rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gift className="w-4 h-4" style={{ color: WaselColors.bronze }} />
                {t.activeRewards}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!walletData?.activeRewards || walletData.activeRewards.length === 0) ? (
                <div className="text-center py-8">
                  <Gift className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">{t.noRewards}</p>
                </div>
              ) : (
                walletData.activeRewards.map((r: RewardItem) => (
                  <div key={r.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.expires}: {new Date(r.expirationDate).toLocaleDateString(isRTL ? 'ar-JO' : 'en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className="font-bold"
                        style={{
                          background: 'rgba(126,205,249,0.12)',
                          color: WaselColors.teal,
                          borderColor: 'rgba(126,205,249,0.28)',
                        }}
                      >
                        {r.amount} {t.jod}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={walletActionsLocked}
                        onClick={() => handleClaimReward(r.id)}
                        className="text-xs"
                      >
                        {t.claim}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-4 space-y-4">
          <Suspense
            fallback={<LoadingSpinner text="Loading insights..." />}
          >
            <LazyInsightsTab insights={insights} isRTL={isRTL} t={t} />
          </Suspense>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <SettingsTab
            walletData={walletData}
            isRTL={isRTL}
            t={t}
            autoTopUpEnabled={autoTopUpEnabled}
            autoTopUpAmount={autoTopUpAmount}
            autoTopUpThreshold={autoTopUpThreshold}
            onAutoTopUpToggle={handleAutoTopUpToggle}
            onAutoTopUpAmountChange={setAutoTopUpAmount}
            onAutoTopUpThresholdChange={setAutoTopUpThreshold}
            onShowPinSetup={() => setShowPinSetup(true)}
            onAddPaymentMethod={handleAddPaymentMethod}
            onRemovePaymentMethod={handleRemovePaymentMethod}
            onSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
            actionsLocked={walletActionsLocked}
            actionsLockedMessage={walletActionsLockedMessage}
          />
        </TabsContent>
      </Tabs>

      <WalletActionModals
        actionLoading={actionLoading}
        actionsLocked={walletActionsLocked}
        actionsLockedMessage={walletActionsLockedMessage}
        balance={bal}
        isRTL={isRTL}
        pinValue={pinValue}
        sendAmount={sendAmount}
        sendNote={sendNote}
        sendRecipient={sendRecipient}
        setPinValue={setPinValue}
        setSendAmount={setSendAmount}
        setSendNote={setSendNote}
        setSendRecipient={setSendRecipient}
        setShowPinSetup={setShowPinSetup}
        setShowSend={setShowSend}
        setShowTopUp={setShowTopUp}
        setShowWithdraw={setShowWithdraw}
        setTopUpAmount={setTopUpAmount}
        setTopUpMethod={setTopUpMethod}
        setWithdrawAmount={setWithdrawAmount}
        setWithdrawBank={setWithdrawBank}
        setWithdrawMethod={setWithdrawMethod}
        showPinSetup={showPinSetup}
        showSend={showSend}
        showTopUp={showTopUp}
        showWithdraw={showWithdraw}
        t={t}
        topUpAmount={topUpAmount}
        topUpMethod={topUpMethod}
        walletData={walletData}
        withdrawAmount={withdrawAmount}
        withdrawBank={withdrawBank}
        withdrawMethod={withdrawMethod}
        onSend={handleSend}
        onSetPin={handleSetPin}
        onTopUp={handleTopUp}
        onWithdraw={handleWithdraw}
      />
      </div>
      </PageShell>
    </ErrorBoundary>
  );
}
