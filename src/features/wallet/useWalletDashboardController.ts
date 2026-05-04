import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  getWalletCapabilities,
  walletApi,
  type InsightsData,
  type WalletData,
} from '../../services/walletApi';
import { setWaselPlusActive } from '../../services/movementMembership';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { walletText } from './walletText';
import { resolveWalletRuntimeMode } from './walletRuntime';

const WALLET_BACKEND_READY = Boolean(projectId && publicAnonKey);

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
  });
  const walletCapabilities = getWalletCapabilities();
  const [walletError, setWalletError] = useState<string | null>(null);
  const walletUnavailable = runtimeMode === 'unavailable' || walletError === 'unavailable';
  const shouldRedirectToAuth = runtimeMode === 'redirect';

  const [tab, setTab] = useState('overview');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
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
  const [actionLoading, setActionLoading] = useState(false);
  const [autoTopUpEnabled, setAutoTopUpEnabled] = useState(false);
  const [autoTopUpAmount, setAutoTopUpAmount] = useState('20');
  const [autoTopUpThreshold, setAutoTopUpThreshold] = useState('5');

  const fetchWallet = useCallback(async () => {
    if (shouldRedirectToAuth) {
      setWalletData(null);
      setInsights(null);
      setWalletError(null);
      setLoading(false);
      return;
    }

    if (!effectiveUserId) {
      setWalletData(null);
      setInsights(null);
      setWalletError('unavailable');
      setLoading(false);
      return;
    }

    try {
      setWalletError(null);
      const data = await walletApi.getWallet(effectiveUserId);
      setWaselPlusActive(Boolean(data.subscription));
      setWalletData(data);
      setAutoTopUpEnabled(data.wallet.autoTopUp || false);
      setAutoTopUpAmount(String(data.wallet.autoTopUpAmount || 20));
      setAutoTopUpThreshold(String(data.wallet.autoTopUpThreshold || 5));
    } catch (err) {
      console.error('[Wallet] fetch error:', err);
      setWalletData(null);
      setInsights(null);
      setWalletError('unavailable');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, shouldRedirectToAuth]);

  const fetchInsights = useCallback(async () => {
    if (shouldRedirectToAuth) {
      setInsights(null);
      return;
    }

    try {
      const data = await walletApi.getInsights(effectiveUserId);
      setInsights(data);
    } catch (err) {
      console.error('[Wallet] insights error:', err);
      setInsights(null);
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
    if (tab === 'insights') fetchInsights();
  }, [tab, fetchInsights]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentState = params.get('payment');
    const subscriptionState = params.get('subscription');
    if (paymentState === 'success') {
      toast.success('Payment completed. Wallet balance is refreshing.');
      void fetchWallet();
    }
    if (paymentState === 'cancelled') {
      toast.info('Payment was cancelled before completion.');
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
    setLoading(true);
    await fetchWallet();
    if (tab === 'insights') await fetchInsights();
    setRefreshing(false);
    if (!walletUnavailable) {
      toast.success(t.refreshed);
    }
  };

  const handleTopUp = async () => {
    if (!walletCapabilities.topUp) {
      toast.error(t.topUpUnavailableHint);
      return;
    }

    const amt = parseFloat(topUpAmount);
    if (!amt || amt <= 0) return toast.error(t.invalidAmount);

    setActionLoading(true);
    try {
      const result = (await walletApi.topUp(effectiveUserId, amt, topUpMethod)) as
        | { payment?: { checkoutUrl?: string | null; provider?: string } }
        | WalletData;

      const checkoutUrl =
        typeof result === 'object' && result && 'payment' in result
          ? (result.payment?.checkoutUrl ?? null)
          : null;

      if (checkoutUrl) {
        toast.success('Redirecting to secure payment checkout');
        setShowTopUp(false);
        window.location.assign(checkoutUrl);
        return;
      }

      toast.success(`JOD ${amt} added successfully`);
      setShowTopUp(false);
      setTopUpAmount('');
      await fetchWallet();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) return toast.error(t.invalidAmount);
    if (!withdrawBank.trim()) return toast.error(t.enterBankAccount);

    setActionLoading(true);
    try {
      await walletApi.withdraw(effectiveUserId, amt, withdrawBank, withdrawMethod);
      toast.success(`JOD ${amt} withdrawn successfully`);
      setShowWithdraw(false);
      setWithdrawAmount('');
      setWithdrawBank('');
      await fetchWallet();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    const amt = parseFloat(sendAmount);
    if (!amt || amt <= 0) return toast.error(t.invalidAmount);
    if (!sendRecipient.trim()) return toast.error(t.enterRecipientId);

    setActionLoading(true);
    try {
      await walletApi.sendMoney(effectiveUserId, sendRecipient, amt, sendNote || undefined);
      toast.success(`JOD ${amt} sent successfully`);
      setShowSend(false);
      setSendAmount('');
      setSendRecipient('');
      setSendNote('');
      await fetchWallet();
    } catch (err: any) {
      toast.error(err.message);
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

    setActionLoading(true);
    try {
      await walletApi.setPin(effectiveUserId, pinValue);
      toast.success(t.pinSetSuccess);
      setShowPinSetup(false);
      setPinValue('');
      await fetchWallet();
    } catch (err: any) {
      toast.error(err.message);
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
    } catch (err: any) {
      toast.error(err.message);
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
    } catch (err: any) {
      setAutoTopUpEnabled(!enabled);
      toast.error(err.message);
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
        window.location.assign(checkoutUrl);
        return;
      }

      toast.success(t.welcomeToPlus);
      await fetchWallet();
    } catch (err: any) {
      toast.error(err.message);
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
    walletSubtitle: t.walletSubtitle,
    walletUnavailable,
    withdrawAmount,
    withdrawBank,
    withdrawMethod,
  };
}
