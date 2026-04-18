import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  getMovementMembershipSnapshot,
  hydrateMovementMembershipFromWallet,
  refreshMovementMembership,
} from '../../services/movementMembership';
import {
  walletApi,
  type InsightsData,
  type WalletData,
  type WalletReliabilityMeta,
} from '../../services/walletApi';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { buildAuthPagePath } from '../../utils/authFlow';
import { walletText } from './walletText';
import {
  getWalletErrorMessage,
  runWalletAction,
} from './walletControllerUtils';
import { resolveWalletRuntimeMode } from './walletRuntime';

const WALLET_BACKEND_READY = Boolean(projectId && publicAnonKey);

export function useWalletDashboardController() {
  const { user } = useAuth();
  const { user: localUser, loading: localAuthLoading } = useLocalAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const isRTL = language === 'ar';
  const t = walletText[isRTL ? 'ar' : 'en'];
  const effectiveUserId = user?.id ?? localUser?.id ?? '';
  const runtimeMode = resolveWalletRuntimeMode({
    localUser,
    backendReady: WALLET_BACKEND_READY,
  });
  const walletUnavailable = !localAuthLoading && runtimeMode === 'unavailable';
  const shouldRedirectToAuth = !localAuthLoading && runtimeMode === 'redirect';
  const initialPersistedSnapshot = !localAuthLoading && effectiveUserId && !shouldRedirectToAuth
    ? walletApi.getPersistedWalletSnapshot(effectiveUserId)
    : null;

  const [tab, setTab] = useState('overview');
  const [walletData, setWalletData] = useState<WalletData | null>(initialPersistedSnapshot?.data ?? null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [walletHealth, setWalletHealth] = useState<WalletReliabilityMeta | null>(initialPersistedSnapshot?.meta ?? null);
  const [walletInsightsHealth, setWalletInsightsHealth] = useState<WalletReliabilityMeta | null>(null);
  const [loading, setLoading] = useState(() => !initialPersistedSnapshot);
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
  const [autoTopUpEnabled, setAutoTopUpEnabled] = useState(initialPersistedSnapshot?.data?.wallet?.autoTopUp || false);
  const [autoTopUpAmount, setAutoTopUpAmount] = useState(String(initialPersistedSnapshot?.data?.wallet?.autoTopUpAmount || 20));
  const [autoTopUpThreshold, setAutoTopUpThreshold] = useState(String(initialPersistedSnapshot?.data?.wallet?.autoTopUpThreshold || 5));
  const topUpErrorMessage = 'Unable to add wallet funds right now.';
  const withdrawErrorMessage = 'Unable to process this withdrawal right now.';
  const sendErrorMessage = 'Unable to send money right now.';
  const pinErrorMessage = 'Unable to update your wallet PIN right now.';
  const rewardErrorMessage = 'Unable to claim this reward right now.';
  const autoTopUpErrorMessage = 'Unable to update auto top-up settings right now.';
  const subscribeErrorMessage = 'Unable to activate Wasel Plus right now.';
  const membershipSnapshot = getMovementMembershipSnapshot();
  const walletDataRef = useRef<WalletData | null>(initialPersistedSnapshot?.data ?? null);
  const walletActionsLocked = Boolean(walletData) && (!walletHealth || walletHealth.degraded || walletHealth.source !== 'edge-api');
  const walletActionsLockedMessage = t.walletReadOnlyToast;

  useEffect(() => {
    walletDataRef.current = walletData;
  }, [walletData]);

  const memoizedWalletData = useMemo(() => walletData, [walletData]);
  const memoizedInsights = useMemo(() => insights, [insights]);

  const guardWalletActionsAvailable = useCallback(() => {
    if (walletActionsLocked) {
      toast.error(walletActionsLockedMessage);
      return false;
    }

    return true;
  }, [walletActionsLocked, walletActionsLockedMessage]);

  const fetchWallet = useCallback(async (): Promise<WalletData | null> => {
    if (localAuthLoading) {
      setLoading(true);
      return null;
    }

    if (shouldRedirectToAuth) {
      setWalletData(null);
      setInsights(null);
      setLoading(false);
      return null;
    }

    const persistedSnapshot = effectiveUserId
      ? walletApi.getPersistedWalletSnapshot(effectiveUserId)
      : null;
    const hasVisibleWalletData =
      walletDataRef.current?.wallet.userId === effectiveUserId
      || Boolean(persistedSnapshot);

    if (!hasVisibleWalletData) {
      setLoading(true);
    }

    try {
      const snapshot = await walletApi.getWalletSnapshot(effectiveUserId);
      setWalletData(snapshot.data);
      setWalletHealth(snapshot.meta);
      hydrateMovementMembershipFromWallet(snapshot.data);
      setAutoTopUpEnabled(snapshot.data.wallet.autoTopUp || false);
      setAutoTopUpAmount(String(snapshot.data.wallet.autoTopUpAmount || 20));
      setAutoTopUpThreshold(String(snapshot.data.wallet.autoTopUpThreshold || 5));
      return snapshot.data;
    } catch (error) {
      console.error('Wallet fetch error:', error);
      setInsights(null);
      setWalletInsightsHealth(null);
      if (!hasVisibleWalletData) {
        setWalletData(null);
        setWalletHealth(null);
      }
      toast.error(t.walletLoadError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, localAuthLoading, shouldRedirectToAuth, t.walletLoadError]);

  const fetchInsights = useCallback(async () => {
    if (localAuthLoading || shouldRedirectToAuth) {
      setInsights(null);
      return;
    }

    try {
      const snapshot = await walletApi.getInsightsSnapshot(effectiveUserId);
      setInsights(snapshot.data);
      setWalletInsightsHealth(snapshot.meta);
    } catch (error) {
      console.error('Insights fetch error:', error);
      setInsights(null);
      setWalletInsightsHealth(null);
    }
  }, [effectiveUserId, localAuthLoading, shouldRedirectToAuth]);

  useEffect(() => {
    if (shouldRedirectToAuth) {
      navigate(buildAuthPagePath('signin', '/app/wallet'));
    }
  }, [navigate, shouldRedirectToAuth]);

  useEffect(() => {
    if (localAuthLoading) {
      return;
    }

    if (shouldRedirectToAuth || !effectiveUserId) {
      setWalletData(null);
      setInsights(null);
      setWalletHealth(null);
      setWalletInsightsHealth(null);
      setLoading(false);
      return;
    }

    const persistedSnapshot = walletApi.getPersistedWalletSnapshot(effectiveUserId);
    if (!persistedSnapshot) {
      setLoading(true);
      return;
    }

    setWalletData(persistedSnapshot.data);
    setWalletHealth(persistedSnapshot.meta);
    hydrateMovementMembershipFromWallet(persistedSnapshot.data);
    setAutoTopUpEnabled(persistedSnapshot.data.wallet.autoTopUp || false);
    setAutoTopUpAmount(String(persistedSnapshot.data.wallet.autoTopUpAmount || 20));
    setAutoTopUpThreshold(String(persistedSnapshot.data.wallet.autoTopUpThreshold || 5));
    setLoading(false);
  }, [effectiveUserId, localAuthLoading, shouldRedirectToAuth]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    if (tab === 'insights') fetchInsights();
  }, [tab, fetchInsights]);

  const handleRefresh = async () => {
    await runWalletAction({
      action: async () => {
        await fetchWallet();
        if (tab === 'insights') {
          await fetchInsights();
        }
      },
      fallbackErrorMessage: t.walletLoadError,
      loadingSetter: setRefreshing,
      onSuccess: () => {
        toast.success(t.refreshed);
      },
    });
  };

  const handleTopUp = async () => {
    if (!guardWalletActionsAvailable()) {
      return;
    }

    const amt = parseFloat(topUpAmount);
    if (!amt || amt <= 0) {
      toast.error(t.invalidAmount);
      return;
    }

    await runWalletAction({
      action: async () => {
        return walletApi.topUp(effectiveUserId, amt, topUpMethod);
      },
      fallbackErrorMessage: topUpErrorMessage,
      loadingSetter: setActionLoading,
      onSuccess: (intent) => {
        void fetchWallet();
        toast.success(
          intent.status === 'succeeded'
            ? t.topUpSuccess.replace('{amount}', String(amt))
            : `Payment intent created. Status: ${intent.status}. Wallet balance will update after provider confirmation.`,
        );
        setShowTopUp(false);
        setTopUpAmount('');
      },
    });
  };

  const ensureWalletVerification = useCallback(async (purpose: 'transfer' | 'withdrawal' | 'payment_method') => {
    const pin = window.prompt(
      purpose === 'payment_method'
        ? 'Enter your 4-digit wallet PIN to manage payment methods.'
        : 'Enter your 4-digit wallet PIN.',
    )?.trim();

    if (!pin) {
      throw new Error('Wallet verification was cancelled.');
    }

    const challenge = await walletApi.verifyPin(effectiveUserId, pin, purpose);
    if (challenge.verified && challenge.verificationToken) {
      return challenge;
    }

    const otpCode = window.prompt('Enter the OTP sent to your verified email or phone.')?.trim();
    if (!otpCode) {
      throw new Error('OTP verification was cancelled.');
    }

    return walletApi.verifyPin(effectiveUserId, pin, purpose, otpCode, challenge.challengeId);
  }, [effectiveUserId]);

  const handleWithdraw = async () => {
    if (!guardWalletActionsAvailable()) {
      return;
    }

    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      toast.error(t.invalidAmount);
      return;
    }
    if (!withdrawBank.trim()) {
      toast.error(t.enterBankAccount);
      return;
    }
    if (amt > (walletData?.balance ?? 0)) {
      toast.error(t.insufficientBalance);
      return;
    }

    await runWalletAction({
      action: async () => {
        await ensureWalletVerification('withdrawal');
        await walletApi.withdraw(effectiveUserId, amt, withdrawBank, withdrawMethod);
        return fetchWallet();
      },
      fallbackErrorMessage: withdrawErrorMessage,
      loadingSetter: setActionLoading,
      onSuccess: () => {
        toast.success(t.withdrawSuccess.replace('{amount}', String(amt)));
        setShowWithdraw(false);
        setWithdrawAmount('');
        setWithdrawBank('');
      },
    });
  };

  const handleSend = async () => {
    if (!guardWalletActionsAvailable()) {
      return;
    }

    const amt = parseFloat(sendAmount);
    if (!amt || amt <= 0) {
      toast.error(t.invalidAmount);
      return;
    }
    if (!sendRecipient.trim()) {
      toast.error(t.enterRecipientId);
      return;
    }

    await runWalletAction({
      action: async () => {
        await ensureWalletVerification('transfer');
        await walletApi.sendMoney(effectiveUserId, sendRecipient, amt, sendNote || undefined);
        return fetchWallet();
      },
      fallbackErrorMessage: sendErrorMessage,
      loadingSetter: setActionLoading,
      onSuccess: () => {
        toast.success(t.sendSuccess.replace('{amount}', String(amt)));
        setShowSend(false);
        setSendAmount('');
        setSendRecipient('');
        setSendNote('');
      },
    });
  };

  const handleSetPin = async () => {
    if (!guardWalletActionsAvailable()) {
      return;
    }

    if (pinValue.length !== 4 || !/^\d{4}$/.test(pinValue)) {
      toast.error(t.pinMustBeFourDigits);
      return;
    }

    await runWalletAction({
      action: async () => {
        await walletApi.setPin(effectiveUserId, pinValue);
        return fetchWallet();
      },
      fallbackErrorMessage: pinErrorMessage,
      loadingSetter: setActionLoading,
      onSuccess: () => {
        toast.success(t.pinSetSuccess);
        setShowPinSetup(false);
        setPinValue('');
      },
    });
  };

  const handleClaimReward = async (rewardId: string) => {
    if (!guardWalletActionsAvailable()) {
      return;
    }

    await runWalletAction({
      action: async () => {
        await walletApi.claimReward(effectiveUserId, rewardId);
        return fetchWallet();
      },
      fallbackErrorMessage: rewardErrorMessage,
      onSuccess: () => {
        toast.success(t.rewardClaimed);
      },
    });
  };

  const handleAutoTopUpToggle = async (enabled: boolean) => {
    if (!guardWalletActionsAvailable()) {
      return;
    }

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
    } catch (error) {
      setAutoTopUpEnabled(!enabled);
      toast.error(getWalletErrorMessage(error, autoTopUpErrorMessage));
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!guardWalletActionsAvailable()) {
      return;
    }

    const typeInput = window.prompt('Enter payment method type: card, wallet, bank_transfer, or cliq.')?.trim() ?? 'card';
    const providerInput = window.prompt('Enter provider: stripe, wallet, cliq, or aman.')?.trim() ?? 'stripe';
    const providerReference = window.prompt('Enter the provider token or reference for this payment method.')?.trim();
    const label = window.prompt('Optional label for this payment method.')?.trim() ?? undefined;
    const last4 = window.prompt('Optional last 4 digits or identifier.')?.trim() ?? undefined;

    if (!providerReference) {
      toast.error('A provider reference is required to save a payment method.');
      return;
    }

    await runWalletAction({
      action: async () => {
        await ensureWalletVerification('payment_method');
        await walletApi.addPaymentMethod(effectiveUserId, {
          type: typeInput as 'card' | 'wallet' | 'bank_transfer' | 'cliq',
          provider: providerInput as 'stripe' | 'wallet' | 'cliq' | 'aman',
          providerReference,
          label,
          last4,
          isDefault: !(walletData?.wallet.paymentMethods?.length ?? 0),
        });
        return fetchWallet();
      },
      fallbackErrorMessage: 'Unable to add this payment method right now.',
      loadingSetter: setActionLoading,
      onSuccess: () => {
        toast.success('Payment method added.');
      },
    });
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!guardWalletActionsAvailable()) {
      return;
    }

    await runWalletAction({
      action: async () => {
        await ensureWalletVerification('payment_method');
        await walletApi.deletePaymentMethod(effectiveUserId, paymentMethodId);
        return fetchWallet();
      },
      fallbackErrorMessage: 'Unable to remove this payment method right now.',
      loadingSetter: setActionLoading,
      onSuccess: () => {
        toast.success('Payment method removed.');
      },
    });
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    if (!guardWalletActionsAvailable()) {
      return;
    }

    await runWalletAction({
      action: async () => {
        await ensureWalletVerification('payment_method');
        await walletApi.setDefaultPaymentMethod(effectiveUserId, paymentMethodId);
        return fetchWallet();
      },
      fallbackErrorMessage: 'Unable to update the default payment method right now.',
      loadingSetter: setActionLoading,
      onSuccess: () => {
        toast.success('Default payment method updated.');
      },
    });
  };

  const handleSubscribe = async () => {
    if (!guardWalletActionsAvailable()) {
      return;
    }

    const preferredCorridorId = walletData?.subscription?.corridorId
      ?? membershipSnapshot.dailyRouteId
      ?? membershipSnapshot.commuterPassRouteId
      ?? null;

    await runWalletAction({
      action: async () => {
        const intent = await walletApi.subscribe(
          effectiveUserId,
          preferredCorridorId ? 'Wasel Corridor Pass' : 'Wasel Plus',
          preferredCorridorId
            ? (membershipSnapshot.dailyRoute?.subscriptionPriceJod ?? 9.99)
            : 9.99,
          preferredCorridorId,
        );
        await fetchWallet();
        await refreshMovementMembership();
        return intent;
      },
      fallbackErrorMessage: subscribeErrorMessage,
      loadingSetter: setActionLoading,
      onSuccess: () => {
        toast.success(t.welcomeToPlus);
      },
    });
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
    handleRemovePaymentMethod,
    handleSend,
    handleSetDefaultPaymentMethod,
    handleSetPin,
    handleSubscribe,
    handleTopUp,
    handleWithdraw,
    handleAddPaymentMethod,
    insights: memoizedInsights,
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
    walletData: memoizedWalletData,
    walletHealth,
    walletInsightsHealth,
    walletSubtitle: t.walletSubtitle,
    walletUnavailable,
    withdrawAmount,
    withdrawBank,
    withdrawMethod,
  };
}
