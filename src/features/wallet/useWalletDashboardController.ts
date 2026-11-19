import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getWalletCapabilities, walletApi } from '../../services/wallet/walletApi';
import type { InsightsData, WalletData } from '../../services/wallet/walletTypes';
import { setWaselPlusActive } from '../../services/movementMembership';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { walletText } from './walletText';
import { resolveWalletRuntimeMode } from './walletRuntime';

const WALLET_BACKEND_READY = Boolean(projectId && publicAnonKey);
const WALLET_LOCAL_FALLBACK_READY = typeof window !== 'undefined';

export const walletLocation = {
  assign: (url: string) => {
    window.location.assign(url);
  },
};

function describeWalletPinError(err: unknown, t: Record<string, string>): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/too many/i.test(message)) {
    return t.walletPinTooManyAttempts ?? message;
  }
  return message;
}

export function useWalletDashboardController() {
  const location = useLocation();
  const { user } = useAuth();
  const { user: localUser } = useLocalAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const isRTL = language === 'ar';
  const t: Record<string, string> = walletText[isRTL ? 'ar' : 'en'] as Record<string, string>;
  const effectiveUserId = localUser?.id ?? user?.id ?? '';
  const runtimeMode = resolveWalletRuntimeMode({
    hasUser: Boolean(localUser || user),
    backendReady: WALLET_BACKEND_READY,
    localFallbackReady: WALLET_LOCAL_FALLBACK_READY,
  });
  const walletCapabilities = getWalletCapabilities();
  const [walletError, setWalletError] = useState<string | null>(null);
  // Only a hard runtime-mode failure is unrecoverable; a failed fetch keeps the
  // dashboard mounted so the Refresh action stays reachable and can clear it.
  const walletUnavailable = runtimeMode === 'unavailable';
  const shouldRedirectToAuth = runtimeMode === 'redirect';

  const [tab, setTab] = useState('overview');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsError, setInsightsError] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState('card');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank_transfer');
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [pinValue, setPinValue] = useState('');
  const [currentPinValue, setCurrentPinValue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [autoTopUpEnabled, setAutoTopUpEnabled] = useState(false);
  const [autoTopUpAmount, setAutoTopUpAmount] = useState('20');
  const [autoTopUpThreshold, setAutoTopUpThreshold] = useState('5');

  const fetchWallet = useCallback(async (): Promise<boolean> => {
    if (shouldRedirectToAuth) {
      setWalletData(null);
      setInsights(null);
      setInsightsError(false);
      setWalletError(null);
      setLoading(false);
      return true;
    }

    if (!effectiveUserId) {
      setWalletData(null);
      setInsights(null);
      setInsightsError(false);
      setWalletError('unavailable');
      setLoading(false);
      return false;
    }

    try {
      setWalletError(null);
      const data = await walletApi.getWallet(effectiveUserId);
      setWaselPlusActive(Boolean(data.subscription));
      setWalletData(data);
      setAutoTopUpEnabled(data.wallet.autoTopUp || false);
      // `??` keeps a legitimately configured 0 instead of coercing it to a default.
      setAutoTopUpAmount(String(data.wallet.autoTopUpAmount ?? 20));
      setAutoTopUpThreshold(String(data.wallet.autoTopUpThreshold ?? 5));
      return true;
    } catch (err) {
      console.error('[Wallet] fetch error:', err);
      setWalletData(null);
      setInsights(null);
      setInsightsError(false);
      setWalletError('unavailable');
      return false;
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, shouldRedirectToAuth]);

  const fetchInsights = useCallback(async (): Promise<boolean> => {
    if (shouldRedirectToAuth) {
      setInsights(null);
      setInsightsError(false);
      return false;
    }

    setInsightsLoading(true);
    try {
      const data = await walletApi.getInsights(effectiveUserId);
      setInsights(data);
      setInsightsError(false);
      return true;
    } catch (err) {
      console.error('[Wallet] insights error:', err);
      setInsights(null);
      setInsightsError(true);
      return false;
    } finally {
      setInsightsLoading(false);
    }
  }, [effectiveUserId, shouldRedirectToAuth]);

  useEffect(() => {
    if (shouldRedirectToAuth) {
      navigate('/app/auth?returnTo=/app/wallet');
    }
  }, [navigate, shouldRedirectToAuth]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    if (tab === 'insights') {fetchInsights();}
  }, [tab, fetchInsights]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentState = params.get('payment');
    const subscriptionState = params.get('subscription');
    if (paymentState === 'success') {
      toast.success(t.paymentCompleted);
      void fetchWallet();
    }
    if (paymentState === 'cancelled') {
      toast.info(t.paymentCancelled);
    }
    if (subscriptionState === 'success') {
      toast.success(
        t.subscriptionCheckoutCompleted ??
          'Subscription checkout completed. Membership is refreshing.',
      );
      void fetchWallet();
    }
    if (subscriptionState === 'cancelled') {
      toast.info(
        t.subscriptionCheckoutCancelled ?? 'Subscription checkout was cancelled before completion.',
      );
    }
  }, [fetchWallet, location.search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // `refreshing` covers the in-flight state; flipping `loading` here would
    // unmount the Refresh button we are retrying from.
    const succeeded = await fetchWallet();
    if (tab === 'insights') {await fetchInsights();}
    setRefreshing(false);
    if (succeeded) {
      toast.success(t.refreshed);
    } else {
      toast.error(t.walletLoadError);
    }
  };

  const handleTopUp = async () => {
    if (!walletCapabilities.topUp) {
      toast.error(t.topUpUnavailableHint);
      return;
    }

    const amt = parseFloat(topUpAmount);
    if (!amt || amt <= 0) {return toast.error(t.invalidAmount);}

    setActionLoading(true);
    try {
      const result = (await walletApi.topUp(effectiveUserId, amt, topUpMethod)) as
        { payment?: { checkoutUrl?: string | null; provider?: string } } | WalletData;

      const checkoutUrl =
        typeof result === 'object' && result && 'payment' in result
          ? (result.payment?.checkoutUrl ?? null)
          : null;

      if (checkoutUrl) {
        toast.success(t.redirectingToPaymentCheckout);
        setShowTopUp(false);
        walletLocation.assign(checkoutUrl);
        return;
      }

      toast.success((t.toppedUpSuccess ?? 'JOD {amount} added successfully').replace('{amount}', String(amt)));
      setShowTopUp(false);
      setTopUpAmount('');
      await fetchWallet();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!walletCapabilities.withdraw) {
      return toast.error(t.withdrawUnavailableHint ?? 'Withdrawals are temporarily unavailable.');
    }
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {return toast.error(t.invalidAmount);}
    if (amt > (walletData?.balance ?? 0)) {return toast.error(t.insufficientBalance);}
    if (!withdrawBank.trim()) {return toast.error(t.enterBankAccount);}
    const pinRequired = Boolean(walletData?.pinSet);
    if (pinRequired && !/^\d{4}$/.test(pinValue)) {
      return toast.error(t.walletPinRequired ?? t.pinMustBeFourDigits);
    }

    setActionLoading(true);
    try {
      // The server enforces the PIN; it is only sent when the wallet has one.
      if (pinRequired) {
        await walletApi.withdraw(effectiveUserId, amt, withdrawBank, { method: withdrawMethod, pin: pinValue });
      } else {
        await walletApi.withdraw(effectiveUserId, amt, withdrawBank, { method: withdrawMethod });
      }
      toast.success((t.withdrawnSuccess ?? 'Withdrawal request for JOD {amount} submitted — pending operator review.').replace('{amount}', String(amt)));
      setShowWithdraw(false);
      setWithdrawAmount('');
      setWithdrawBank('');
      setPinValue('');
      await fetchWallet();
    } catch (err) {
      setPinValue('');
      toast.error(describeWalletPinError(err, t));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    const amt = parseFloat(sendAmount);
    if (!amt || amt <= 0) {return toast.error(t.invalidAmount);}
    if (!sendRecipient.trim()) {return toast.error(t.enterRecipientId);}
    const pinRequired = Boolean(walletData?.pinSet);
    if (pinRequired && !/^\d{4}$/.test(pinValue)) {
      return toast.error(t.walletPinRequired ?? t.pinMustBeFourDigits);
    }

    setActionLoading(true);
    try {
      if (pinRequired) {
        await walletApi.sendMoney(effectiveUserId, sendRecipient, amt, { note: sendNote || undefined, pin: pinValue });
      } else {
        await walletApi.sendMoney(effectiveUserId, sendRecipient, amt, { note: sendNote || undefined });
      }
      toast.success((t.sentSuccess ?? 'JOD {amount} sent successfully').replace('{amount}', String(amt)));
      setShowSend(false);
      setSendAmount('');
      setSendRecipient('');
      setSendNote('');
      setPinValue('');
      await fetchWallet();
    } catch (err) {
      setPinValue('');
      toast.error(describeWalletPinError(err, t));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (!walletCapabilities.pin) {
      toast.error(t.pinUnavailableHint);
      return;
    }

    if (pinValue.length !== 4 || !/^\d{4}$/.test(pinValue)) {
      return toast.error(t.pinMustBeFourDigits);
    }

    // Replacing an existing PIN requires the current one; the server enforces this too.
    const changingExistingPin = Boolean(walletData?.pinSet);
    if (changingExistingPin && !/^\d{4}$/.test(currentPinValue)) {
      return toast.error(t.walletPinRequired ?? t.pinMustBeFourDigits);
    }

    setActionLoading(true);
    try {
      if (changingExistingPin) {
        await walletApi.setPin(effectiveUserId, pinValue, currentPinValue);
      } else {
        await walletApi.setPin(effectiveUserId, pinValue);
      }
      toast.success(t.pinSetSuccess);
      setShowPinSetup(false);
      setPinValue('');
      setCurrentPinValue('');
      await fetchWallet();
    } catch (err) {
      setCurrentPinValue('');
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimReward = async (rewardId: string) => {
    if (!walletCapabilities.rewardClaim) {
      toast.error(t.rewardClaimUnavailableHint);
      return;
    }

    try {
      await walletApi.claimReward(effectiveUserId, rewardId);
      toast.success(t.rewardClaimed);
      await fetchWallet();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAutoTopUpToggle = async (enabled: boolean) => {
    setAutoTopUpEnabled(enabled);

    try {
      await walletApi.setAutoTopUp(
        effectiveUserId,
        enabled,
        parseFloat(autoTopUpAmount),
        parseFloat(autoTopUpThreshold),
      );
      toast.success(enabled ? t.autoTopUpEnabledToast : t.autoTopUpDisabledToast);
      await fetchWallet();
    } catch (err: unknown) {
      setAutoTopUpEnabled(!enabled);
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSubscribe = async () => {
    if (!walletCapabilities.subscription) {
      toast.error(t.subscriptionUnavailableHint);
      return;
    }

    setActionLoading(true);
    try {
      const result = (await walletApi.subscribe(effectiveUserId, 'Wasel Plus', 9.99)) as
        | { subscription?: { checkoutUrl?: string | null; provider?: string } }
        | { payment?: { checkoutUrl?: string | null; provider?: string } };

      const checkoutUrl =
        typeof result === 'object' && result
          ? 'subscription' in result
            ? (result.subscription?.checkoutUrl ?? null)
            : 'payment' in result
              ? (result.payment?.checkoutUrl ?? null)
              : null
          : null;

      if (checkoutUrl) {
        toast.success(
          t.redirectingToSubscriptionCheckout ?? 'Redirecting to secure subscription checkout',
        );
        walletLocation.assign(checkoutUrl);
        return;
      }

      toast.success(t.welcomeToPlus);
      await fetchWallet();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  return {
    actionLoading,
    autoTopUpAmount,
    autoTopUpEnabled,
    autoTopUpThreshold,
    balanceVisible,
    currentPinValue,
    effectiveUserId,
    fetchInsights,
    fetchWallet,
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
    walletSubtitle: t.walletSubtitle,
    walletUnavailable,
    withdrawAmount,
    withdrawBank,
    withdrawMethod,
  };
}
