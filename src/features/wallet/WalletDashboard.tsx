import { useMemo, useState } from 'react';
import { ArrowRightLeft, CreditCard, LoaderCircle, RefreshCw, ShieldCheck, Wallet as WalletIcon } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { ClarityBand, CoreExperienceBanner, PageShell, Protected, SectionHead } from '../shared/pageShared';
import { useWallet, type WalletSendDraft } from './useWallet';

function formatCurrency(value: number, currency = 'JOD') {
  return new Intl.NumberFormat('en-JO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMetaSource(source: string, degraded: boolean) {
  if (degraded) {
    return 'Backup wallet path';
  }
  return source === 'edge-api' ? 'Primary wallet service' : 'Direct sync';
}

export function WalletDashboard() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const {
    error,
    hasMoreTransactions,
    loading,
    loadingMore,
    meta,
    refresh,
    sendMoney,
    setError,
    submittingTransfer,
    totalTransactions,
    transactions,
    transferChallenge,
    transferMessage,
    wallet,
    loadMoreTransactions,
  } = useWallet(user?.id ?? null);
  const [sendDraft, setSendDraft] = useState<WalletSendDraft>({
    recipientUserId: '',
    amount: '',
    note: '',
    pin: '',
    otpCode: '',
  });

  const paymentMethods = wallet?.wallet.paymentMethods ?? [];
  const defaultPaymentMethod = paymentMethods.find(method => method.isDefault) ?? null;
  const recentTransactions = useMemo(() => transactions.slice(0, transactions.length), [transactions]);

  async function handleSendMoney() {
    setError(null);
    try {
      const result = await sendMoney(sendDraft);
      if (result?.status === 'success') {
        setSendDraft({
          recipientUserId: '',
          amount: '',
          note: '',
          pin: '',
          otpCode: '',
        });
      }
    } catch {
      // The hook already normalizes and stores the user-facing error state.
    }
  }

  return (
    <PageShell>
      <Protected>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8 pt-4 md:px-6">
          <SectionHead
            emoji="💳"
            title="Wallet"
            sub="Server-backed balance, payment methods, and verified transfers."
            color="var(--accent)"
            action={{
              label: loading ? 'Loading...' : 'Refresh wallet',
              onClick: () => {
                void refresh();
              },
            }}
          />

          <CoreExperienceBanner
            title="This route now uses the real wallet domain instead of a shell surface."
            detail="Balance, payment methods, and transaction history are loaded from the wallet service. Transfers require PIN verification and refresh the ledger after settlement."
            tone="var(--accent)"
          />

          <ClarityBand
            title="Keep stored value and payment movement clearly separated."
            detail="Use Wallet for balance, history, and secure transfers. Use Payments when you need to create or confirm a payment intent."
            tone="var(--accent)"
            items={[
              { label: 'Balance', value: wallet ? formatCurrency(wallet.balance, wallet.currency) : 'Loading...' },
              { label: 'Pending', value: wallet ? formatCurrency(wallet.pendingBalance, wallet.currency) : 'Loading...' },
              { label: 'Rewards', value: wallet ? formatCurrency(wallet.rewardsBalance, wallet.currency) : 'Loading...' },
            ]}
          />

          <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-primary/15 bg-[linear-gradient(140deg,rgba(3,13,28,0.96),rgba(8,34,60,0.92))]">
              <CardHeader className="gap-3">
                <Badge className="w-fit border border-primary/20 bg-primary/10 text-primary">
                  Live wallet
                </Badge>
                <CardTitle className="flex items-center gap-3 text-2xl text-foreground">
                  <WalletIcon className="h-6 w-6 text-primary" />
                  {wallet ? formatCurrency(wallet.balance, wallet.currency) : 'Loading wallet...'}
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Stored value is read from the wallet service, not from auth profile fields. The refresh action invalidates local wallet caches before reloading the latest state.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pb-6 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    Pending balance
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {wallet ? formatCurrency(wallet.pendingBalance, wallet.currency) : '--'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Payment methods
                  </div>
                  <p className="text-2xl font-bold text-foreground">{paymentMethods.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {defaultPaymentMethod?.label ?? 'No default method configured'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Service posture
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {meta ? formatMetaSource(meta.source, meta.degraded) : 'Loading...'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {meta ? `Updated ${new Date(meta.fetchedAt).toLocaleString()}` : 'Waiting for first sync'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Wallet actions</CardTitle>
                <CardDescription className="text-sm leading-6 text-muted-foreground">
                  Use Payments for top-ups and payment intents. Use Settings for account-level preferences. This page only exposes actions backed by the wallet service.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="secondary" onClick={() => navigate('/app/payments')}>
                  Open payments
                </Button>
                <Button className="w-full" variant="secondary" onClick={() => navigate('/app/settings')}>
                  Open settings
                </Button>
                <Button
                  className="w-full"
                  disabled={loading}
                  onClick={() => {
                    void refresh();
                  }}
                >
                  {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Refresh balance and history
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Send money</CardTitle>
                <CardDescription>
                  Transfers use wallet PIN verification before the ledger move is submitted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">Recipient user ID</span>
                  <Input
                    value={sendDraft.recipientUserId}
                    onChange={(event) => setSendDraft(current => ({ ...current, recipientUserId: event.target.value }))}
                    placeholder="user_123"
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">Amount</span>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={sendDraft.amount}
                    onChange={(event) => setSendDraft(current => ({ ...current, amount: event.target.value }))}
                    placeholder="25.00"
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">Note</span>
                  <Input
                    value={sendDraft.note}
                    onChange={(event) => setSendDraft(current => ({ ...current, note: event.target.value }))}
                    placeholder="Trip reimbursement"
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">Wallet PIN</span>
                  <Input
                    type="password"
                    value={sendDraft.pin}
                    onChange={(event) => setSendDraft(current => ({ ...current, pin: event.target.value }))}
                    placeholder="Enter your wallet PIN"
                  />
                </label>

                {transferChallenge ? (
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium text-foreground">One-time verification code</span>
                    <Input
                      value={sendDraft.otpCode}
                      onChange={(event) => setSendDraft(current => ({ ...current, otpCode: event.target.value }))}
                      placeholder="Enter the OTP code"
                    />
                  </label>
                ) : null}

                {transferMessage ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                    {transferMessage}
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                <Button
                  className="w-full"
                  disabled={submittingTransfer || loading || !wallet}
                  onClick={() => {
                    void handleSendMoney();
                  }}
                >
                  {submittingTransfer ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                  {transferChallenge ? 'Verify and complete transfer' : 'Send money'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Transaction history</CardTitle>
                <CardDescription>
                  Showing {recentTransactions.length} of {totalTransactions} wallet transactions from the wallet service.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading && recentTransactions.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading transactions...
                  </div>
                ) : null}

                {!loading && recentTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-muted-foreground">
                    No wallet transactions have been recorded yet.
                  </div>
                ) : null}

                {recentTransactions.map((transaction) => {
                  const isCredit = transaction.amount >= 0;
                  return (
                    <div key={transaction.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.type.replace('_', ' ')} · {new Date(transaction.createdAt).toLocaleString()} · {transaction.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isCredit ? 'text-emerald-400' : 'text-foreground'}`}>
                          {isCredit ? '+' : '-'}
                          {formatCurrency(Math.abs(transaction.amount), wallet?.currency ?? 'JOD')}
                        </p>
                        <p className="text-xs text-muted-foreground">{transaction.id}</p>
                      </div>
                    </div>
                  );
                })}

                {hasMoreTransactions ? (
                  <Button
                    className="w-full"
                    disabled={loadingMore}
                    variant="secondary"
                    onClick={() => {
                      void loadMoreTransactions();
                    }}
                  >
                    {loadingMore ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Load more transactions
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </section>
        </div>
      </Protected>
    </PageShell>
  );
}
