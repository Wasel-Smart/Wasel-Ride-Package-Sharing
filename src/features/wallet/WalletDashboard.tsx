/**
 * WalletDashboard
 *
 * Render-focused wallet screen. Runtime mode selection, demo/live data
 * handling, and wallet mutations now live in `useWalletDashboardController`.
 */

import { Suspense, lazy } from 'react';
import { Activity, Gift, Lock, RefreshCw, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { WaselStateCard } from '../../components/system/WaselStateCard';
import {
  MetricCard,
  PageHero,
  PageShell,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { C, SPACE } from '../../utils/wasel-ds';
import { useWalletDashboardController } from './useWalletDashboardController.js';
import { OverviewTab } from './components/OverviewTab';
import { SettingsTab } from './components/SettingsTab';
import { WalletActionModals } from './components/WalletActionModals';
import { TransactionRow as SharedTransactionRow } from './components/WalletShared';
import { WalletHeroCard } from './components/WalletHeroCard';

const InsightsTab = lazy(async () => {
  const mod = await import('./components/InsightsTab');
  return { default: mod.InsightsTab };
});

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
    walletCapabilities,
    walletSubtitle,
    walletUnavailable,
    withdrawAmount,
    withdrawBank,
    withdrawMethod,
  } = useWalletDashboardController();

  const bal = walletData?.balance ?? 0;
  const pending = walletData?.pendingBalance ?? 0;
  const rewardsBal = walletData?.rewardsBalance ?? 0;
  const transactionCount = walletData?.transactions?.length ?? 0;
  const walletTitle = t.walletTitle ?? 'Wallet';
  const activeLabel = t.activeLabel ?? 'Active';
  const walletUnavailableDescription =
    t.walletUnavailableDescription ?? 'Wallet access is not available right now.';
  const loadingTitle = t.loadingTitle ?? 'Loading wallet';
  const loadingDescription =
    t.loadingDescription ?? 'Fetching balance, movements, and rewards.';
  const walletUnavailableTitle = t.walletUnavailableTitle ?? 'Wallet unavailable';
  const jodLabel = t.jod ?? 'JOD';
  const refreshLabel = isRTL ? 'تحديث' : 'Refresh';
  const heroDescription = isRTL
    ? `الرصيد والتحويلات والمكافآت تظهر في سطح واحد واضح. ${walletData?.currency || 'JOD'}`
    : `Balance, transfers, and rewards in one clear surface. ${walletData?.currency || 'JOD'}`;
  const insightsFallback = (
    <Card className="rounded-xl">
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {t.processing}
      </CardContent>
    </Card>
  );

  if (shouldRedirectToAuth) {
    return (
      <WaselStateCard
        eyebrow={walletTitle}
        title={t.redirectingToSignIn ?? 'Redirecting to sign in'}
        description={walletUnavailableDescription}
        icon={Lock}
        tone="warning"
        minHeight="60vh"
      />
    );
  }

  if (loading) {
    return (
      <WaselStateCard
        eyebrow={walletTitle}
        title={loadingTitle}
        description={loadingDescription}
        icon={Wallet}
        loading
        minHeight="60vh"
        footer={activeLabel}
      />
    );
  }

  if (walletUnavailable) {
    return (
      <WaselStateCard
        eyebrow={walletTitle}
        title={walletUnavailableTitle}
        description={walletUnavailableDescription}
        icon={Wallet}
        tone="warning"
        minHeight="60vh"
        footer={t.walletUnavailableHint}
      />
    );
  }

  return (
    <PageShell maxWidth={1120} dir={isRTL ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow={isRTL ? 'محفظة واصل' : 'Wasel Wallet'}
          icon={<StatusBadge label={activeLabel} accent={C.green} />}
          title={walletTitle}
          description={heroDescription}
          accent={C.cyan}
          actions={
            <>
              {walletCapabilities.topUp ? (
                <Button
                  onClick={() => setShowTopUp(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t.topUp}
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshLabel}
              </Button>
            </>
          }
          aside={
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge label={walletData?.currency || 'JOD'} accent={C.cyan} />
                <StatusBadge
                  label={
                    autoTopUpEnabled
                      ? isRTL
                        ? 'شحن تلقائي'
                        : 'Auto top-up on'
                      : isRTL
                        ? 'شحن يدوي'
                        : 'Manual top-up'
                  }
                  accent={autoTopUpEnabled ? C.green : C.gold}
                />
              </div>
              <div style={{ color: '#FFFFFF', fontSize: '1.8rem', fontWeight: 900 }}>
                JOD {bal.toFixed(2)}
              </div>
              <div style={{ color: C.textMuted, fontSize: '0.88rem', lineHeight: 1.7 }}>
                {isRTL
                  ? 'الأهم فوق: الرصيد المتاح والمعلق والمكافآت بدون شرح زائد.'
                  : 'The key numbers stay above the fold: available, pending, and rewards.'}
              </div>
            </div>
          }
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: SPACE[4],
            marginBottom: SPACE[6],
          }}
        >
          <MetricCard
            label={isRTL ? 'الرصيد المتاح' : 'Available'}
            value={`JOD ${bal.toFixed(2)}`}
            detail={walletSubtitle}
            icon={<Wallet size={18} />}
            accent={C.cyan}
          />
          <MetricCard
            label={isRTL ? 'المعلق' : 'Pending'}
            value={`JOD ${pending.toFixed(2)}`}
            detail={
              isRTL ? 'أموال تنتظر التسوية أو السحب.' : 'Funds waiting for settlement or withdrawal.'
            }
            icon={<RefreshCw size={18} />}
            accent={C.gold}
          />
          <MetricCard
            label={isRTL ? 'المكافآت' : 'Rewards'}
            value={`JOD ${rewardsBal.toFixed(2)}`}
            detail={
              isRTL ? 'مكافآت متاحة داخل الدورة الحالية.' : 'Reward value available in the current cycle.'
            }
            icon={<Gift size={18} />}
            accent={C.green}
          />
          <MetricCard
            label={isRTL ? 'الحركات' : 'Transactions'}
            value={transactionCount}
            detail={isRTL ? 'عدد الحركات الظاهرة حالياً.' : 'Visible transaction count right now.'}
            icon={<Activity size={18} />}
            accent={C.blue}
          />
        </div>

        <div className="space-y-6 pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
          <WalletHeroCard
            balanceVisible={balanceVisible}
            balance={bal}
            canTopUp={walletCapabilities.topUp}
            pendingBalance={pending}
            rewardsBalance={rewardsBal}
            t={t}
            onToggleBalance={() => setBalanceVisible(!balanceVisible)}
            onShowTopUp={() => setShowTopUp(true)}
            onShowWithdraw={() => setShowWithdraw(true)}
            onShowSend={() => setShowSend(true)}
          />

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full grid grid-cols-5 h-11 rounded-xl bg-card">
              <TabsTrigger value="overview" className="text-xs rounded-lg">
                {t.overview}
              </TabsTrigger>
              <TabsTrigger value="transactions" className="text-xs rounded-lg">
                {t.transactions}
              </TabsTrigger>
              <TabsTrigger value="rewards" className="text-xs rounded-lg">
                {t.rewardsTab}
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs rounded-lg">
                {t.insights}
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs rounded-lg">
                {t.settings}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <OverviewTab
                walletData={walletData}
                canSubscribe={walletCapabilities.subscription}
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
                  {!walletData?.transactions || walletData.transactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      {t.noTransactions}
                    </div>
                  ) : (
                    walletData.transactions.map((tx: any) => (
                      <SharedTransactionRow key={tx.id} tx={tx} isRTL={isRTL} jodLabel={jodLabel} />
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
                  {!walletData?.activeRewards || walletData.activeRewards.length === 0 ? (
                    <div className="text-center py-8">
                      <Gift className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-sm">{t.noRewards}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t.rewardsEmptyHint}</p>
                    </div>
                  ) : (
                    <>
                      {!walletCapabilities.rewardClaim ? (
                        <p className="mb-3 text-xs text-muted-foreground">
                          {t.rewardClaimUnavailableHint}
                        </p>
                      ) : null}
                      {walletData.activeRewards.map((r: any) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-medium">{r.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {t.expires}:{' '}
                              {new Date(r.expirationDate).toLocaleDateString(
                                isRTL ? 'ar-JO' : 'en-US',
                                { month: 'short', day: 'numeric' },
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold">
                              {r.amount} {t.jod}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleClaimReward(r.id)}
                              disabled={!walletCapabilities.rewardClaim}
                              className="text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10 disabled:opacity-60"
                            >
                              {t.claim}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="mt-4 space-y-4">
              <Suspense fallback={insightsFallback}>
                <InsightsTab insights={insights} isRTL={isRTL} t={t} />
              </Suspense>
            </TabsContent>

            <TabsContent value="settings" className="mt-4 space-y-4">
              <SettingsTab
                walletData={walletData}
                canManagePin={walletCapabilities.pin}
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
      </div>
    </PageShell>
  );
}
