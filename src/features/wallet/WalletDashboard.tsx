import { useState } from 'react';
import {
  ArrowRightLeft,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Wallet as WalletIcon,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { OperationalConfidencePanel } from '../../components/trust/OperationalConfidencePanel';
import { Input } from '../../components/ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { getWalletConfidenceSummary } from '../../domains/trust/operationalConfidence';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  ClarityBand,
  CoreExperienceBanner,
  PageShell,
  Protected,
  SectionHead,
} from '../shared/pageShared';
import { useWallet, type WalletSendDraft } from './useWallet';

function formatCurrency(value: number, currency = 'JOD', locale = 'en-JO') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

const WALLET_COPY = {
  en: {
    loading: 'Loading...',
    header: {
      title: 'Wallet',
      subtitle: 'Stored value, balance posture, and direct transfers in one surface.',
      refresh: 'Refresh wallet',
    },
    banner: {
      title: 'Stored value stays visible.',
      detail:
        'Balance, payouts, and person-to-person transfers stay close to trust, funding sources, and recent wallet movement.',
    },
    clarity: {
      title: 'See the live wallet picture before you move money.',
      detail:
        'Balance, pending value, and rewards stay visible together so the next action is obvious.',
    },
    metrics: {
      balance: 'Available balance',
      pending: 'Pending balance',
      rewards: 'Rewards',
    },
    liveBadge: 'Live wallet',
    loadingWallet: 'Loading wallet...',
    liveDescription:
      'Current balance, pending funds, and payment method posture update from the live wallet service.',
    pendingBalance: 'Pending balance',
    paymentMethods: 'Payment methods',
    noDefaultMethod: 'No default method',
    servicePosture: 'Service posture',
    updatedAt: 'Updated',
    waitingSync: 'Waiting for the latest wallet sync.',
    meta: {
      backup: 'Backup path active',
      primary: 'Primary edge sync',
      direct: 'Direct wallet service',
    },
    actions: {
      title: 'Wallet actions',
      description:
        'Top up, withdraw, or refresh your wallet state without leaving the stored-value surface.',
      addMoney: 'Add money',
      withdraw: 'Withdraw',
      refresh: 'Refresh wallet',
    },
    transfer: {
      title: 'Send money',
      description: 'Move value directly to another Wasel account with PIN and OTP protection.',
      recipient: 'Recipient user ID',
      recipientPlaceholder: 'user_123 or wallet handle',
      amount: 'Amount',
      amountPlaceholder: '25.00',
      note: 'Note',
      notePlaceholder: 'Add a short note',
      pin: 'Wallet PIN',
      pinPlaceholder: 'Enter your PIN',
      otp: 'One-time code',
      otpPlaceholder: 'Enter the verification code',
      verifyAction: 'Verify and send',
      submit: 'Send',
    },
    history: {
      title: 'Recent activity',
      summary: 'Showing {visible} of {total} wallet movements.',
      loading: 'Loading wallet activity...',
      empty: 'No wallet activity yet.',
      loadMore: 'Load more activity',
    },
  },
  ar: {
    loading: 'جارٍ التحميل...',
    header: {
      title: 'المحفظة',
      subtitle: 'القيمة المخزنة، حالة الرصيد، والتحويلات المباشرة في سطح واحد.',
      refresh: 'تحديث المحفظة',
    },
    banner: {
      title: 'القيمة المخزنة تبقى واضحة.',
      detail:
        'يبقى الرصيد والسحب والتحويل بين الأشخاص قريباً من الثقة ومصادر التمويل وحركة المحفظة الأخيرة.',
    },
    clarity: {
      title: 'شاهد صورة المحفظة المباشرة قبل تحريك المال.',
      detail:
        'يبقى الرصيد والقيمة المعلقة والمكافآت ظاهرة معاً حتى تكون الخطوة التالية واضحة.',
    },
    metrics: {
      balance: 'الرصيد المتاح',
      pending: 'الرصيد المعلّق',
      rewards: 'المكافآت',
    },
    liveBadge: 'محفظة مباشرة',
    loadingWallet: 'جارٍ تحميل المحفظة...',
    liveDescription:
      'يتم تحديث الرصيد الحالي والأموال المعلقة ووضع طرق الدفع من خدمة المحفظة المباشرة.',
    pendingBalance: 'الرصيد المعلّق',
    paymentMethods: 'طرق الدفع',
    noDefaultMethod: 'لا توجد طريقة افتراضية',
    servicePosture: 'حالة الخدمة',
    updatedAt: 'آخر تحديث',
    waitingSync: 'بانتظار آخر مزامنة للمحفظة.',
    meta: {
      backup: 'مسار احتياطي نشط',
      primary: 'مزامنة الحافة الأساسية',
      direct: 'خدمة المحفظة المباشرة',
    },
    actions: {
      title: 'إجراءات المحفظة',
      description:
        'أضف المال أو اسحب أو حدّث حالة المحفظة من دون مغادرة سطح القيمة المخزنة.',
      addMoney: 'إضافة المال',
      withdraw: 'سحب',
      refresh: 'تحديث المحفظة',
    },
    transfer: {
      title: 'إرسال المال',
      description: 'انقل القيمة مباشرة إلى حساب Wasel آخر مع حماية PIN ورمز التحقق.',
      recipient: 'معرّف المستخدم المستلم',
      recipientPlaceholder: 'user_123 أو اسم المحفظة',
      amount: 'المبلغ',
      amountPlaceholder: '25.00',
      note: 'ملاحظة',
      notePlaceholder: 'أضف ملاحظة قصيرة',
      pin: 'رقم PIN للمحفظة',
      pinPlaceholder: 'أدخل رقم PIN',
      otp: 'رمز لمرة واحدة',
      otpPlaceholder: 'أدخل رمز التحقق',
      verifyAction: 'تحقق وأرسل',
      submit: 'إرسال',
    },
    history: {
      title: 'النشاط الأخير',
      summary: 'عرض {visible} من أصل {total} من تحركات المحفظة.',
      loading: 'جارٍ تحميل نشاط المحفظة...',
      empty: 'لا يوجد نشاط للمحفظة بعد.',
      loadMore: 'تحميل المزيد من النشاط',
    },
  },
} as const;

function formatMetaSource(
  source: string,
  degraded: boolean,
  copy: { backup: string; primary: string; direct: string },
) {
  if (degraded) {
    return copy.backup;
  }
  return source === 'edge-api' ? copy.primary : copy.direct;
}

function formatTransactionMeta(
  transaction: { createdAt: string; status: string; type: string },
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string,
) {
  return [
    transaction.type.replace(/_/g, ' '),
    formatDate(transaction.createdAt, { dateStyle: 'medium', timeStyle: 'short' }),
    transaction.status,
  ].join(' • ');
}

export function WalletDashboard() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const { formatDate, language, locale } = useLanguage();
  const copy = WALLET_COPY[language];
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
  const recentTransactions = transactions;
  const walletConfidence = getWalletConfidenceSummary({
    wallet,
    meta,
    transferChallenge,
    totalTransactions,
    defaultPaymentMethodLabel: defaultPaymentMethod?.label ?? null,
    formatMoney: (value, currency) => formatCurrency(value, currency, locale),
  });

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
      // Errors are normalized and surfaced by the wallet hook.
    }
  }

  return (
    <PageShell>
      <Protected>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8 pt-4 md:px-6">
          <SectionHead
            emoji={<WalletIcon aria-hidden="true" className="h-5 w-5" />}
            title={copy.header.title}
            sub={copy.header.subtitle}
            color="var(--accent)"
            action={{
              label: loading ? copy.loading : copy.header.refresh,
              onClick: () => {
                void refresh();
              },
            }}
          />

          <CoreExperienceBanner
            title={copy.banner.title}
            detail={copy.banner.detail}
            tone="var(--accent)"
          />

          <ClarityBand
            title={copy.clarity.title}
            detail={copy.clarity.detail}
            tone="var(--accent)"
            items={[
              {
                label: copy.metrics.balance,
                value: wallet
                  ? formatCurrency(wallet.balance, wallet.currency, locale)
                  : copy.loading,
              },
              {
                label: copy.metrics.pending,
                value: wallet
                  ? formatCurrency(wallet.pendingBalance, wallet.currency, locale)
                  : copy.loading,
              },
              {
                label: copy.metrics.rewards,
                value: wallet
                  ? formatCurrency(wallet.rewardsBalance, wallet.currency, locale)
                  : copy.loading,
              },
            ]}
          />

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-primary/15 bg-[linear-gradient(140deg,rgba(3,13,28,0.96),rgba(8,34,60,0.92))]">
              <CardHeader className="gap-3">
                <Badge className="w-fit border border-primary/20 bg-primary/10 text-primary">
                  {copy.liveBadge}
                </Badge>
                <CardTitle className="flex items-center gap-3 text-2xl text-foreground">
                  <WalletIcon className="h-6 w-6 text-primary" />
                  {wallet
                    ? formatCurrency(wallet.balance, wallet.currency, locale)
                    : copy.loadingWallet}
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  {copy.liveDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pb-6 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    {copy.pendingBalance}
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {wallet ? formatCurrency(wallet.pendingBalance, wallet.currency, locale) : '--'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CreditCard className="h-4 w-4 text-primary" />
                    {copy.paymentMethods}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{paymentMethods.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {defaultPaymentMethod?.label ?? copy.noDefaultMethod}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {copy.servicePosture}
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {meta ? formatMetaSource(meta.source, meta.degraded, copy.meta) : copy.loading}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {meta
                      ? `${copy.updatedAt} ${formatDate(meta.fetchedAt, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}`
                      : copy.waitingSync}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <OperationalConfidencePanel summary={walletConfidence} variant="detail" />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">{copy.actions.title}</CardTitle>
                  <CardDescription className="text-sm leading-6 text-muted-foreground">
                    {copy.actions.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => navigate('/app/payments?purpose=deposit')}
                  >
                    {copy.actions.addMoney}
                  </Button>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => navigate('/app/settings')}
                  >
                    {copy.actions.withdraw}
                  </Button>
                  <Button
                    className="w-full"
                    disabled={loading}
                    onClick={() => {
                      void refresh();
                    }}
                  >
                    {loading ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {copy.actions.refresh}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">{copy.transfer.title}</CardTitle>
                <CardDescription>{copy.transfer.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">{copy.transfer.recipient}</span>
                  <Input
                    value={sendDraft.recipientUserId}
                    onChange={event =>
                      setSendDraft(current => ({ ...current, recipientUserId: event.target.value }))
                    }
                    placeholder={copy.transfer.recipientPlaceholder}
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">{copy.transfer.amount}</span>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={sendDraft.amount}
                    onChange={event =>
                      setSendDraft(current => ({ ...current, amount: event.target.value }))
                    }
                    placeholder={copy.transfer.amountPlaceholder}
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">{copy.transfer.note}</span>
                  <Input
                    value={sendDraft.note}
                    onChange={event =>
                      setSendDraft(current => ({ ...current, note: event.target.value }))
                    }
                    placeholder={copy.transfer.notePlaceholder}
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">{copy.transfer.pin}</span>
                  <Input
                    type="password"
                    value={sendDraft.pin}
                    onChange={event =>
                      setSendDraft(current => ({ ...current, pin: event.target.value }))
                    }
                    placeholder={copy.transfer.pinPlaceholder}
                  />
                </label>

                {transferChallenge ? (
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium text-foreground">{copy.transfer.otp}</span>
                    <Input
                      value={sendDraft.otpCode}
                      onChange={event =>
                        setSendDraft(current => ({ ...current, otpCode: event.target.value }))
                      }
                      placeholder={copy.transfer.otpPlaceholder}
                    />
                  </label>
                ) : null}

                {transferMessage ? (
                  <div
                    aria-live="polite"
                    className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary"
                    role="status"
                  >
                    {transferMessage}
                  </div>
                ) : null}

                {error ? (
                  <div
                    className="rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
                    role="alert"
                  >
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
                  {submittingTransfer ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                  )}
                  {transferChallenge
                    ? copy.transfer.verifyAction
                    : copy.transfer.submit}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">{copy.history.title}</CardTitle>
                <CardDescription>
                  {copy.history.summary
                    .replace('{visible}', String(recentTransactions.length))
                    .replace('{total}', String(totalTransactions))}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading && recentTransactions.length === 0 ? (
                  <div
                    aria-live="polite"
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground"
                    role="status"
                  >
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {copy.history.loading}
                  </div>
                ) : null}

                {!loading && recentTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-muted-foreground">
                    {copy.history.empty}
                  </div>
                ) : null}

                {recentTransactions.map(transaction => {
                  const isCredit = transaction.amount >= 0;
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTransactionMeta(transaction, formatDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${isCredit ? 'text-emerald-400' : 'text-foreground'}`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(
                            Math.abs(transaction.amount),
                            wallet?.currency ?? 'JOD',
                            locale,
                          )}
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
                    {copy.history.loadMore}
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
