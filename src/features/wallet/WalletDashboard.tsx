/**
 * WalletDashboard
 *
 * Render-focused wallet screen. Runtime mode selection, demo/live data
 * handling, and wallet mutations now live in `useWalletDashboardController`.
 */

import { Wallet, Gift, RefreshCw, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { WaselColors } from '../../tokens/wasel-tokens';
import { useWalletDashboardController } from './useWalletDashboardController.js';
import { TransactionRow as SharedTransactionRow } from './components/WalletShared';
import { OverviewTab } from './components/OverviewTab';
import { InsightsTab } from './components/InsightsTab';
import { SettingsTab } from './components/SettingsTab';
import { WalletHeroCard } from './components/WalletHeroCard';
import { WalletActionModals } from './components/WalletActionModals';
import type { RewardItem, WalletTransaction } from '../../services/walletApi';

export function WalletDashboard() {
  const {
    actionLoading,
    autoTopUpAmount,
    autoTopUpEnabled,
    autoTopUpThreshold,
    balanceVisible,
    handleAutoTopUpToggle,
    handleClaimReward,
    handleRefresh,
    handleSend,
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
    walletData,
    walletHealth,
    walletInsightsHealth,
    walletUnavailable,
    withdrawAmount,
    withdrawBank,
    withdrawMethod,
  } = useWalletDashboardController();

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
  if (shouldRedirectToAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Lock className="w-12 h-12 text-muted-foreground/60" />
        <p className="text-muted-foreground text-sm">
          {t.redirectingToSignIn}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        <p className="text-muted-foreground text-sm">{t.processing}</p>
      </div>
    );
  }

  if (walletUnavailable) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div
          className="w-full max-w-xl rounded-3xl border text-center p-8 md:p-10"
          style={{
            background: `linear-gradient(180deg, ${WaselColors.navyCard} 0%, rgba(4,12,24,0.98) 100%)`,
            borderColor: `${WaselColors.teal}25`,
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
            style={{ borderColor: `${WaselColors.teal}22`, background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: WaselColors.success }} />
            {t.walletUnavailableHint}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WaselLogo size={34} showWordmark={false} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{t.walletTitle}</h1>
              <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">
                {t.activeLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{t.walletSubtitle}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {walletStatusLabel && (
        <Card className="rounded-xl border-primary/10 bg-card/70">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">
                  {walletStatusLabel}
                </Badge>
                {insightsStatusLabel && (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500">
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

      <WalletHeroCard
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
        <TabsList className="w-full grid grid-cols-5 h-11 rounded-xl bg-card">
          <TabsTrigger value="overview" className="text-xs rounded-lg">{t.overview}</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs rounded-lg">{t.transactions}</TabsTrigger>
          <TabsTrigger value="rewards" className="text-xs rounded-lg">{t.rewardsTab}</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs rounded-lg">{t.insights}</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs rounded-lg">{t.settings}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <OverviewTab
            walletData={walletData}
            isRTL={isRTL}
            t={t}
            onSetTab={setTab}
            onSubscribe={handleSubscribe}
            actionLoading={actionLoading}
          />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card className="rounded-xl">
            <CardContent className="pt-4">
              {(!walletData?.transactions || walletData.transactions.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground text-sm">{t.noTransactions}</div>
              ) : (
                walletData.transactions.map((tx: WalletTransaction) => (
                  <SharedTransactionRow key={tx.id} tx={tx} isRTL={isRTL} jodLabel={t.jod} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="mt-4 space-y-4">
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-400" />
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
                      <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold">
                        {r.amount} {t.jod}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => handleClaimReward(r.id)} className="text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
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
          <InsightsTab insights={insights} isRTL={isRTL} t={t} />
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
          />
        </TabsContent>
      </Tabs>

      <WalletActionModals
        actionLoading={actionLoading}
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
  );
}
