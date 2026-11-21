/**
 * WalletDashboard
 *
 * Render-focused wallet screen. Runtime mode selection, demo/live data
 * handling, and wallet mutations now live in `useWalletDashboardController`.
 */

import { Suspense, lazy, useState } from 'react';
import { Activity, AlertCircle, Gift, Lock, RefreshCw, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { WaselStateCard } from '../../components/system/WaselStateCard';
import { WaselEmptyState, WaselStatsGrid } from '../../components/wasel-ui';
import { WaselButton } from '../../components/wasel-ui/WaselButton';
import type { WalletTransaction, RewardItem } from '../../services/wallet/walletTypes';
import {
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
    currentPinValue,
    fetchInsights,
    handleAutoTopUpToggle,
    handleClaimReward,
    handleRefresh,
    handleSend,
    handleSetPin,
    handleSubscribe,
    handleTopUp,
    handleWithdraw,
    insights,
    insightsError,
    insightsLoading,
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
    setCurrentPinValue,
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
    walletError,
    walletSubtitle,
    walletUnavailable,
    withdrawAmount,
    withdrawBank,
    withdrawMethod,
  } = useWalletDashboardController();

  const [txSearch, setTxSearch] = useState('');
  const bal = walletData?.balance ?? 0;
  const pending = walletData?.pendingBalance ?? 0;
  const rewardsBal = walletData?.rewardsBalance ?? 0;
  const transactionCount = walletData?.transactions?.length ?? 0;
  const walletIsLocal = walletData?.source === 'local';
  const displayCapabilities = walletIsLocal
    ? {
      ...walletCapabilities,
      topUp: false,
      rewardClaim: false,
      subscription: false,
      pin: false,
      send: false,
      withdraw: false,
      autoTopUp: false,
    }
    : walletCapabilities;
  const walletTitle = t.walletTitle ?? 'Wallet';
  const activeLabel = t.activeLabel ?? 'Active';
  const walletUnavailableDescription =
    t.walletUnavailableDescription ?? 'Wallet access is not available right now.';
  const loadingTitle = t.loadingTitle ?? 'Loading wallet';
  const loadingDescription = t.loadingDescription ?? 'Fetching balance, movements, and rewards.';
  const walletUnavailableTitle = t.walletUnavailableTitle ?? 'Wallet unavailable';
  const jodLabel = t.jod ?? 'JOD';
  const currencyCode = walletData?.currency || 'JOD';
  const refreshLabel = t.refresh ?? 'Refresh';
  const heroCopy = t.heroDescription ?? 'Balance, transfers, and rewards in one clear surface.';
  const heroDescription = `${heroCopy} ${currencyCode}`;
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
        {walletIsLocal ? (
          <Card role="status" className="mb-4 rounded-xl border-amber-500/40 bg-amber-500/10">
            <CardContent className="flex items-center gap-2 py-4 text-sm text-amber-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {t.walletLocalDataWarning ?? 'Showing saved wallet data. This balance is not confirmed by the server; refresh when online before making payment decisions.'}
            </CardContent>
          </Card>
        ) : null}
        {walletError ? (
          <Card className="mb-4 rounded-xl border-destructive/40 bg-destructive/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <span className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {t.walletLoadError ?? 'Unable to load wallet right now'}
              </span>
              <Button
                variant="outline"
                onClick={() => { void handleRefresh(); }}
                disabled={refreshing}
                className="shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshLabel}
              </Button>
            </CardContent>
          </Card>
        ) : null}
        <PageHero
          eyebrow={t.paymentsEyebrow ?? 'Payments'}
          icon={<StatusBadge label={activeLabel} accent={C.green} />}
          title={walletTitle}
          description={heroDescription}
          accent={'var(--primary)'}
          actions={
            <>
              {displayCapabilities.topUp ? (
                <Button
                  onClick={() => { void setShowTopUp(true); }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t.topUp}
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => { void handleRefresh(); }}
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
                <StatusBadge label={currencyCode} accent={'var(--primary)'} />
                <StatusBadge
                  label={
                    autoTopUpEnabled
                      ? (t.autoTopUpOn ?? 'Auto top-up on')
                      : (t.manualTopUp ?? 'Manual top-up')
                  }
                  accent={autoTopUpEnabled ? C.green : C.gold}
                />
              </div>
              <div style={{ color: 'var(--muted-foreground)', fontSize: '0.88rem', lineHeight: 1.7 }}>
                {heroCopy}
              </div>
            </div>
          }
        />

        <WaselStatsGrid
          stats={[
            {
              value: `${currencyCode} ${balanceVisible ? bal.toFixed(2) : t.maskedBalance}`,
              label: t.availableLabel ?? 'Available',
              icon: <Wallet size={18} />,
              sublabel: walletSubtitle,
              accent: 'var(--primary)',
            },
            {
              value: `${currencyCode} ${balanceVisible ? pending.toFixed(2) : t.maskedShort}`,
              label: t.pending ?? 'Pending',
              icon: <RefreshCw size={18} />,
              sublabel: t.pendingSublabel ?? 'Funds waiting for settlement or withdrawal.',
              accent: C.gold,
            },
            {
              value: `${currencyCode} ${balanceVisible ? rewardsBal.toFixed(2) : t.maskedShort}`,
              label: t.rewards ?? 'Rewards',
              icon: <Gift size={18} />,
              sublabel: t.rewardsSublabel ?? 'Reward value available in the current cycle.',
              accent: C.green,
            },
            {
              value: transactionCount,
              label: t.transactions ?? 'Transactions',
              icon: <Activity size={18} />,
              sublabel: t.transactionsSublabel ?? 'Visible transaction count right now.',
              accent: C.blue,
            },
          ]}
        />

        <div className="space-y-6 pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
          <WalletHeroCard
            balanceVisible={balanceVisible}
            balance={bal}
            canTopUp={displayCapabilities.topUp}
            canSend={displayCapabilities.send}
            canWithdraw={displayCapabilities.withdraw}
            pendingBalance={pending}
            rewardsBalance={rewardsBal}
            t={t}
            onToggleBalance={() => setBalanceVisible(!balanceVisible)}
            onShowTopUp={() => setShowTopUp(true)}
            onShowWithdraw={() => setShowWithdraw(true)}
            onShowSend={() => setShowSend(true)}
          />

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList
              className="w-full grid grid-cols-5 h-11 rounded-xl bg-card overflow-x-auto"
              style={{ overflowX: 'auto', display: 'flex' }}
            >
              <TabsTrigger value="overview" className="text-xs rounded-lg whitespace-nowrap">
                {t.overview}
              </TabsTrigger>
              <TabsTrigger value="transactions" className="text-xs rounded-lg whitespace-nowrap">
                {t.transactions}
              </TabsTrigger>
              <TabsTrigger value="rewards" className="text-xs rounded-lg whitespace-nowrap">
                {t.rewardsTab}
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs rounded-lg whitespace-nowrap">
                {t.insights}
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs rounded-lg whitespace-nowrap">
                {t.settings}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <OverviewTab
                walletData={walletData}
                canSubscribe={displayCapabilities.subscription}
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
                  {/* Transaction search */}
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="search"
                      value={txSearch}
                      onChange={e => setTxSearch(e.target.value)}
                      placeholder={t.searchTransactions ?? 'Search transactions...'}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: `1px solid ${'var(--border)'}`,
                        background: 'var(--secondary)',
                        color: 'var(--foreground)',
                        fontSize: '0.84rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                    {!walletData?.transactions || walletData.transactions.length === 0 ? (
                      <WaselEmptyState
                        icon={<Wallet size={32} />}
                          title={t.noTransactions ?? 'No transactions'}
                        description="Your transaction history will appear here once you start using your wallet."
                        action={
                          <WaselButton
                            variant="primary"
                            size="sm"
                            onClick={() => { void setShowTopUp(true); }}
                          >
                            {t.topUp ?? 'Top Up'}
                          </WaselButton>
                        }
                        accent={'var(--primary)'}
                      />
                    ) : (
                    walletData.transactions
                      .filter(
                        (tx: WalletTransaction) =>
                          !txSearch ||
                          JSON.stringify(tx).toLowerCase().includes(txSearch.toLowerCase()),
                      )
                      .map((tx: WalletTransaction) => (
                        <SharedTransactionRow
                          key={tx.id}
                          tx={tx}
                          isRTL={isRTL}
                          jodLabel={jodLabel}
                        />
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
                    <WaselEmptyState
                      icon={<Gift size={32} />}
                      title={t.noRewards ?? 'No rewards'}
                      description={t.rewardsEmptyHint}
                      action={
                        <WaselButton
                          variant="primary"
                          size="sm"
                          onClick={() => { setTab('overview'); }}
                        >
                          {t.bookRideToEarnRewards ?? 'Book a ride to earn rewards'}
                        </WaselButton>
                      }
                      accent={C.orange}
                    />
                  ) : (
                    <>
                      {!displayCapabilities.rewardClaim ? (
                        <p className="mb-3 text-xs text-muted-foreground">
                          {t.rewardClaimUnavailableHint}
                        </p>
                      ) : null}
                      {walletData.activeRewards.map((r: RewardItem) => (
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
                              onClick={() => { void handleClaimReward(r.id); }}
                              disabled={!displayCapabilities.rewardClaim}
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
                <InsightsTab
                  insights={insights}
                  insightsError={insightsError}
                  insightsLoading={insightsLoading}
                  isRTL={isRTL}
                  onRetryInsights={() => { void fetchInsights(); }}
                  t={t}
                />
              </Suspense>
            </TabsContent>

            <TabsContent value="settings" className="mt-4 space-y-4">
              <SettingsTab
                walletData={walletData}
                canManagePin={displayCapabilities.pin}
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
            canWithdraw={displayCapabilities.withdraw}
            isRTL={isRTL}
            pinValue={pinValue}
            currentPinValue={currentPinValue}
            setCurrentPinValue={setCurrentPinValue}
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
