/**
 * WalletDashboard — Enterprise Fintech Wallet for Wasel
 *
 * Premium fintech UI inspired by Apple Wallet / Revolut / PayPal.
 * Tabs: Overview, Transactions, Send, Rewards, Insights, Settings
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet, Plus, ArrowDownLeft, ArrowUpRight, Send, Gift, BarChart3,
  Settings, CreditCard, Shield, Eye, EyeOff, RefreshCw, ChevronRight,
  TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertTriangle,
  Lock, Crown, Zap, DollarSign, ArrowRight, Copy, Landmark, Smartphone,
  Star, Package, Car, Banknote, ShieldCheck, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalAuth, type WaselUser } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { walletApi, type WalletData, type InsightsData } from '../../services/walletApi';
import { WaselColors } from '../../tokens/wasel-tokens';
import { getConfig } from '../../utils/env';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { walletText } from './walletText';
import {
  TransactionRow as SharedTransactionRow,
  ActionModal as SharedActionModal,
} from './components/WalletShared';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { OverviewTab } from './components/OverviewTab';
import { InsightsTab } from './components/InsightsTab';
import { SettingsTab } from './components/SettingsTab';

// ── i18n texts ─────────────────────────────────────────────────────────────
const txt = {
  en: {
    walletTitle: 'Wasel Wallet',
    balance: 'Available Balance',
    pending: 'Pending',
    rewards: 'Rewards',
    hideBalance: 'Hide balance',
    showBalance: 'Show balance',
    addMoney: 'Add Money',
    withdraw: 'Withdraw',
    sendMoney: 'Send',
    overview: 'Overview',
    transactions: 'Transactions',
    send: 'Send',
    rewardsTab: 'Rewards',
    insights: 'Insights',
    settings: 'Settings',
    recentTransactions: 'Recent Transactions',
    viewAll: 'View All',
    noTransactions: 'No transactions yet',
    quickActions: 'Quick Actions',
    topUpAmount: 'Top-up Amount (JOD)',
    paymentMethod: 'Payment Method',
    card: 'Credit/Debit Card',
    applePay: 'Apple Pay',
    bankTransfer: 'Bank Transfer',
    cliq: 'CliQ',
    topUp: 'Top Up',
    withdrawAmount: 'Withdrawal Amount (JOD)',
    bankAccount: 'Bank Account / IBAN',
    instant: 'Instant',
    standard: 'Standard (1-3 days)',
    confirmWithdraw: 'Withdraw',
    recipientId: 'Recipient User ID',
    sendAmount: 'Amount (JOD)',
    noteOptional: 'Note (optional)',
    confirmSend: 'Send Money',
    activeRewards: 'Active Rewards',
    claimedRewards: 'Claimed Rewards',
    claim: 'Claim',
    expires: 'Expires',
    noRewards: 'No rewards available',
    spendingInsights: 'Spending Insights',
    thisMonth: 'This Month',
    vsLastMonth: 'vs last month',
    earned: 'Earned',
    spent: 'Spent',
    monthlyTrend: 'Monthly Trend',
    categoryBreakdown: 'Category Breakdown',
    securityPin: 'Wallet PIN',
    setPin: 'Set PIN',
    changePin: 'Change PIN',
    pinDescription: 'Protect transactions with a 4-digit PIN',
    autoTopUp: 'Auto Top-Up',
    autoTopUpDesc: 'Automatically add funds when balance drops below threshold',
    threshold: 'Threshold (JOD)',
    topUpAmountSetting: 'Top-up Amount (JOD)',
    subscription: 'Wasel Plus',
    subscribeNow: 'Subscribe Now',
    activeSubscription: 'Active Subscription',
    escrow: 'Active Escrows',
    held: 'Held',
    processing: 'Processing...',
    pinDigits: 'Enter 4-digit PIN',
    carbonSaved: 'CO₂ Saved',
    totalTx: 'Total Transactions',
    jod: 'JOD',
  },
  ar: {
    walletTitle: 'محفظة واصل',
    balance: 'الرصيد المتاح',
    pending: 'معلّق',
    rewards: 'المكافآت',
    hideBalance: 'إخفاء الرصيد',
    showBalance: 'إظهار الرصيد',
    addMoney: 'إضافة رصيد',
    withdraw: 'سحب',
    sendMoney: 'إرسال',
    overview: 'نظرة عامة',
    transactions: 'المعاملات',
    send: 'إرسال',
    rewardsTab: 'مكافآت',
    insights: 'تحليلات',
    settings: 'الإعدادات',
    recentTransactions: 'آخر المعاملات',
    viewAll: 'عرض الكل',
    noTransactions: 'لا يوجد معاملات بعد',
    quickActions: 'إجراءات سريعة',
    topUpAmount: 'مبلغ الشحن (دينار)',
    paymentMethod: 'طريقة الدفع',
    card: 'بطاقة ائتمان',
    applePay: 'Apple Pay',
    bankTransfer: 'تحويل بنكي',
    cliq: 'كليك',
    topUp: 'شحن',
    withdrawAmount: 'مبلغ السحب (دينار)',
    bankAccount: 'حساب البنك / IBAN',
    instant: 'فوري',
    standard: 'عادي (1-3 أيام)',
    confirmWithdraw: 'سحب',
    recipientId: 'معرّف المستلم',
    sendAmount: 'المبلغ (دينار)',
    noteOptional: 'ملاحظة (اختياري)',
    confirmSend: 'إرسال المال',
    activeRewards: 'مكافآت نشطة',
    claimedRewards: 'مكافآت مستلمة',
    claim: 'استلام',
    expires: 'ينتهي',
    noRewards: 'لا توجد مكافآت',
    spendingInsights: 'تحليلات الإنفاق',
    thisMonth: 'هذا الشهر',
    vsLastMonth: 'مقارنة بالشهر الماضي',
    earned: 'ربح',
    spent: 'إنفاق',
    monthlyTrend: 'الاتجاه الشهري',
    categoryBreakdown: 'تفصيل حسب الفئة',
    securityPin: 'رمز PIN للمحفظة',
    setPin: 'تعيين PIN',
    changePin: 'تغيير PIN',
    pinDescription: 'احمِ معاملاتك برمز من 4 أرقام',
    autoTopUp: 'شحن تلقائي',
    autoTopUpDesc: 'شحن الرصيد تلقائياً عند انخفاضه',
    threshold: 'الحد الأدنى (دينار)',
    topUpAmountSetting: 'مبلغ الشحن (دينار)',
    subscription: 'واصل بلس',
    subscribeNow: 'اشترك الآن',
    activeSubscription: 'اشتراك فعّال',
    escrow: 'ضمانات نشطة',
    held: 'محجوز',
    processing: 'جاري المعالجة...',
    pinDigits: 'أدخل رمز من 4 أرقام',
    carbonSaved: 'CO₂ وُفّر',
    totalTx: 'إجمالي المعاملات',
    jod: 'دينار',
  },
};

const TX_ICONS: Record<string, any> = {
  topup: { icon: Plus, color: WaselColors.success, bg: 'bg-green-500/10' },
  payment: { icon: CreditCard, color: WaselColors.error, bg: 'bg-red-500/10' },
  earning: { icon: TrendingUp, color: WaselColors.teal, bg: 'bg-teal-500/10' },
  withdrawal: { icon: ArrowUpRight, color: WaselColors.warning, bg: 'bg-orange-500/10' },
  refund: { icon: RefreshCw, color: WaselColors.info, bg: 'bg-blue-500/10' },
  send: { icon: Send, color: WaselColors.bronze, bg: 'bg-amber-500/10' },
  receive: { icon: ArrowDownLeft, color: WaselColors.success, bg: 'bg-green-500/10' },
  reward: { icon: Gift, color: '#A855F7', bg: 'bg-purple-500/10' },
  subscription: { icon: Crown, color: WaselColors.bronze, bg: 'bg-amber-500/10' },
  escrow_hold: { icon: Lock, color: WaselColors.warning, bg: 'bg-yellow-500/10' },
  escrow_release: { icon: CheckCircle, color: WaselColors.success, bg: 'bg-green-500/10' },
  cashback: { icon: Zap, color: '#A855F7', bg: 'bg-purple-500/10' },
};

const PIE_COLORS = ['#04ADBF', '#D9965B', '#22C55E', '#A855F7', '#3B82F6', '#F59E0B', '#EF4444'];

const WALLET_BACKEND_READY = Boolean(projectId && publicAnonKey);

function createDemoWalletData(user: WaselUser | null): WalletData {
  const baseBalance = typeof user?.balance === 'number' ? user.balance : 145.75;
  const createdAt = user?.joinedAt ? `${user.joinedAt}T09:00:00.000Z` : '2025-01-15T09:00:00.000Z';

  return {
    wallet: {
      id: `wallet-${user?.id ?? 'guest'}`,
      walletType: user?.role === 'driver' ? 'driver' : 'user',
      createdAt,
      autoTopUp: false,
      autoTopUpAmount: 20,
      autoTopUpThreshold: 5,
    },
    balance: baseBalance,
    pendingBalance: 30,
    rewardsBalance: 12.5,
    total_earned: 156.5,
    total_spent: 42,
    total_deposited: 175,
    currency: 'JOD',
    pinSet: false,
    autoTopUp: false,
    transactions: [
      { id: 'tx-demo-1', type: 'earning', description: 'Trip to Aqaba', amount: 25.5, createdAt: '2026-03-16T13:20:00.000Z' },
      { id: 'tx-demo-2', type: 'payment', description: 'Wasel delivery fee', amount: -8, createdAt: '2026-03-12T10:10:00.000Z' },
      { id: 'tx-demo-3', type: 'topup', description: 'Top up via CliQ', amount: 50, createdAt: '2026-03-08T18:40:00.000Z' },
      { id: 'tx-demo-4', type: 'reward', description: 'Ramadan cashback', amount: 6.25, createdAt: '2026-03-03T16:00:00.000Z' },
    ],
    activeEscrows: [
      { id: 'escrow-demo-1', type: 'ride', tripId: 'TRIP-948233', amount: 14 },
    ],
    activeRewards: [
      { id: 'reward-demo-1', description: '5 JOD loyalty cashback', amount: 5, expirationDate: '2026-04-15T00:00:00.000Z' },
    ],
    subscription: {
      planName: 'Wasel Plus',
      status: 'active',
      renewalDate: '2026-04-20T00:00:00.000Z',
    },
  };
}

function createDemoInsights(wallet: WalletData): InsightsData {
  return {
    thisMonthSpent: wallet.total_spent,
    lastMonthSpent: 36,
    thisMonthEarned: wallet.total_earned,
    changePercent: 17,
    categoryBreakdown: {
      rides: 21,
      delivery: 9,
      wallet_fees: 5,
      rewards: 7,
    },
    monthlyTrend: [
      { month: 'Nov', spent: 18, earned: 72 },
      { month: 'Dec', spent: 27, earned: 88 },
      { month: 'Jan', spent: 31, earned: 94 },
      { month: 'Feb', spent: 36, earned: 101 },
      { month: 'Mar', spent: wallet.total_spent, earned: wallet.total_earned },
    ],
    totalTransactions: wallet.transactions.length,
    carbonSaved: 42,
  };
}

function prependTransaction(wallet: WalletData, tx: Record<string, unknown>): WalletData {
  return {
    ...wallet,
    transactions: [tx, ...wallet.transactions],
  };
}

export function WalletDashboard() {
  const { user } = useAuth();
  const { user: localUser, updateUser } = useLocalAuth();
  const { language } = useLanguage();
  const { enableDemoAccount } = getConfig();
  const navigate = useIframeSafeNavigate();
  const isRTL = language === 'ar';
  const t = walletText[isRTL ? 'ar' : 'en'];
  const effectiveUserId = user?.id ?? localUser?.id ?? 'demo-wallet-user';
  const isDemoWallet = enableDemoAccount && Boolean(localUser) && (!WALLET_BACKEND_READY || localUser?.backendMode === 'demo');
  const walletUnavailable = !WALLET_BACKEND_READY && !enableDemoAccount;
  const shouldRedirectToAuth = !localUser;

  const [tab, setTab] = useState('overview');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);

  // Form states
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

  // Auto top-up
  const [autoTopUpEnabled, setAutoTopUpEnabled] = useState(false);
  const [autoTopUpAmount, setAutoTopUpAmount] = useState('20');
  const [autoTopUpThreshold, setAutoTopUpThreshold] = useState('5');

  const fetchWallet = useCallback(async () => {
    if (shouldRedirectToAuth) {
      setWalletData(null);
      setInsights(null);
      setLoading(false);
      return;
    }

    if (isDemoWallet) {
      const demoWallet = createDemoWalletData(localUser);
      setWalletData(demoWallet);
      setInsights(createDemoInsights(demoWallet));
      setAutoTopUpEnabled(demoWallet.wallet?.autoTopUp || false);
      setAutoTopUpAmount(String(demoWallet.wallet?.autoTopUpAmount || 20));
      setAutoTopUpThreshold(String(demoWallet.wallet?.autoTopUpThreshold || 5));
      setLoading(false);
      return;
    }

    try {
      const data = await walletApi.getWallet(effectiveUserId);
      setWalletData(data);
      setAutoTopUpEnabled(data.wallet?.autoTopUp || false);
      setAutoTopUpAmount(String(data.wallet?.autoTopUpAmount || 20));
      setAutoTopUpThreshold(String(data.wallet?.autoTopUpThreshold || 5));
    } catch (err) {
      console.error('[Wallet] fetch error:', err);
      if (enableDemoAccount) {
        const demoWallet = createDemoWalletData(localUser);
        setWalletData(demoWallet);
        setInsights(createDemoInsights(demoWallet));
      } else {
        setWalletData(null);
        setInsights(null);
        toast.error(isRTL ? 'تعذر تحميل المحفظة الآن' : 'Unable to load wallet right now');
      }
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, enableDemoAccount, isDemoWallet, isRTL, localUser, shouldRedirectToAuth]);

  const fetchInsights = useCallback(async () => {
    if (shouldRedirectToAuth) {
      setInsights(null);
      return;
    }

    if (isDemoWallet) {
      if (walletData) setInsights(createDemoInsights(walletData));
      return;
    }

    try {
      const data = await walletApi.getInsights(effectiveUserId);
      setInsights(data);
    } catch (err) {
      console.error('[Wallet] insights error:', err);
      if (enableDemoAccount && walletData) {
        setInsights(createDemoInsights(walletData));
      }
    }
  }, [effectiveUserId, enableDemoAccount, isDemoWallet, walletData, shouldRedirectToAuth]);

  useEffect(() => {
    if (shouldRedirectToAuth) {
      navigate('/app/auth?returnTo=/app/wallet');
    }
  }, [navigate, shouldRedirectToAuth]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);
  useEffect(() => { if (tab === 'insights') fetchInsights(); }, [tab, fetchInsights]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWallet();
    if (tab === 'insights' || isDemoWallet) await fetchInsights();
    setRefreshing(false);
    toast.success(isRTL ? 'تم التحديث' : 'Refreshed');
  };

  const handleTopUp = async () => {
    const amt = parseFloat(topUpAmount);
    if (!amt || amt <= 0) return toast.error(isRTL ? 'أدخل مبل�� صحيح' : 'Enter a valid amount');
    if (isDemoWallet) {
      setWalletData((prev) => {
        const current = prev ?? createDemoWalletData(localUser);
        const next = prependTransaction(
          {
            ...current,
            balance: current.balance + amt,
            total_deposited: current.total_deposited + amt,
          },
          {
            id: `tx-topup-${Date.now()}`,
            type: 'topup',
            description: `Top up via ${topUpMethod.replace('_', ' ')}`,
            amount: amt,
            createdAt: new Date().toISOString(),
          },
        );
        setInsights(createDemoInsights(next));
        updateUser({ balance: next.balance });
        return next;
      });
      toast.success(isRTL ? `تم شحن ${amt} دينار` : `JOD ${amt} added successfully`);
      setShowTopUp(false);
      setTopUpAmount('');
      return;
    }
    setActionLoading(true);
    try {
      await walletApi.topUp(effectiveUserId, amt, topUpMethod);
      toast.success(isRTL ? `تم شحن ${amt} دينار` : `JOD ${amt} added successfully`);
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
    if (!amt || amt <= 0) return toast.error(isRTL ? 'أدخل مبلغ صحيح' : 'Enter a valid amount');
    if (!withdrawBank.trim()) return toast.error(isRTL ? 'أدخل رقم الحساب' : 'Enter bank account');
    if (isDemoWallet) {
      if ((walletData?.balance ?? 0) < amt) {
        return toast.error(isRTL ? 'الرصيد غير كافٍ' : 'Insufficient balance');
      }
      setWalletData((prev) => {
        const current = prev ?? createDemoWalletData(localUser);
        const next = prependTransaction(
          {
            ...current,
            balance: current.balance - amt,
            total_spent: current.total_spent + amt,
            pendingBalance: current.pendingBalance + (withdrawMethod === 'instant' ? 0 : amt),
          },
          {
            id: `tx-withdraw-${Date.now()}`,
            type: 'withdrawal',
            description: withdrawMethod === 'instant' ? 'Instant withdrawal' : 'Withdrawal to bank',
            amount: -amt,
            createdAt: new Date().toISOString(),
          },
        );
        setInsights(createDemoInsights(next));
        updateUser({ balance: next.balance });
        return next;
      });
      toast.success(isRTL ? `تم سحب ${amt} دينار` : `JOD ${amt} withdrawn successfully`);
      setShowWithdraw(false);
      setWithdrawAmount('');
      setWithdrawBank('');
      return;
    }
    setActionLoading(true);
    try {
      await walletApi.withdraw(effectiveUserId, amt, withdrawBank, withdrawMethod);
      toast.success(isRTL ? `تم سحب ${amt} دينار` : `JOD ${amt} withdrawn successfully`);
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
    if (!amt || amt <= 0) return toast.error(isRTL ? 'أدخل مبلغ صحيح' : 'Enter a valid amount');
    if (!sendRecipient.trim()) return toast.error(isRTL ? 'أدخل معرّف المستلم' : 'Enter recipient ID');
    if (isDemoWallet) {
      if ((walletData?.balance ?? 0) < amt) {
        return toast.error(isRTL ? 'الرصيد غير كافٍ' : 'Insufficient balance');
      }
      setWalletData((prev) => {
        const current = prev ?? createDemoWalletData(localUser);
        const next = prependTransaction(
          {
            ...current,
            balance: current.balance - amt,
            total_spent: current.total_spent + amt,
          },
          {
            id: `tx-send-${Date.now()}`,
            type: 'send',
            description: sendNote || `Transfer to ${sendRecipient}`,
            amount: -amt,
            createdAt: new Date().toISOString(),
          },
        );
        setInsights(createDemoInsights(next));
        updateUser({ balance: next.balance });
        return next;
      });
      toast.success(isRTL ? `تم إرسال ${amt} دينار` : `JOD ${amt} sent successfully`);
      setShowSend(false);
      setSendAmount('');
      setSendRecipient('');
      setSendNote('');
      return;
    }
    setActionLoading(true);
    try {
      await walletApi.sendMoney(effectiveUserId, sendRecipient, amt, sendNote || undefined);
      toast.success(isRTL ? `تم إرسال ${amt} دينار` : `JOD ${amt} sent successfully`);
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
    if (pinValue.length !== 4 || !/^\d{4}$/.test(pinValue)) {
      return toast.error(isRTL ? 'الرمز يجب أن يكون 4 أرقام' : 'PIN must be 4 digits');
    }
    if (isDemoWallet) {
      setWalletData((prev) => prev ? { ...prev, pinSet: true } : prev);
      toast.success(isRTL ? 'تم تعيين PIN بنجاح' : 'PIN set successfully');
      setShowPinSetup(false);
      setPinValue('');
      return;
    }
    setActionLoading(true);
    try {
      await walletApi.setPin(effectiveUserId, pinValue);
      toast.success(isRTL ? 'تم تعيين PIN بنجاح' : 'PIN set successfully');
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
    if (isDemoWallet) {
      setWalletData((prev) => {
        if (!prev) return prev;
        const reward = prev.activeRewards.find((item: any) => item.id === rewardId);
        if (!reward) return prev;
        const next = prependTransaction(
          {
            ...prev,
            balance: prev.balance + reward.amount,
            rewardsBalance: Math.max(0, prev.rewardsBalance - reward.amount),
            activeRewards: prev.activeRewards.filter((item: any) => item.id !== rewardId),
          },
          {
            id: `tx-reward-${Date.now()}`,
            type: 'reward',
            description: reward.description,
            amount: reward.amount,
            createdAt: new Date().toISOString(),
          },
        );
        setInsights(createDemoInsights(next));
        updateUser({ balance: next.balance });
        return next;
      });
      toast.success(isRTL ? 'تم استلام المكافأة!' : 'Reward claimed!');
      return;
    }
    try {
      await walletApi.claimReward(effectiveUserId, rewardId);
      toast.success(isRTL ? 'تم استلام المكافأة!' : 'Reward claimed!');
      await fetchWallet();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAutoTopUpToggle = async (enabled: boolean) => {
    setAutoTopUpEnabled(enabled);
    if (isDemoWallet) {
      setWalletData((prev) => prev ? {
        ...prev,
        autoTopUp: enabled,
        wallet: {
          ...prev.wallet,
          autoTopUp: enabled,
          autoTopUpAmount: parseFloat(autoTopUpAmount),
          autoTopUpThreshold: parseFloat(autoTopUpThreshold),
        },
      } : prev);
      toast.success(isRTL ? (enabled ? 'تم تفعيل الشحن التلقائي' : 'تم إيقاف الشحن التلقائي') : (enabled ? 'Auto top-up enabled' : 'Auto top-up disabled'));
      return;
    }
    try {
      await walletApi.setAutoTopUp(effectiveUserId, enabled, parseFloat(autoTopUpAmount), parseFloat(autoTopUpThreshold));
      toast.success(isRTL ? (enabled ? 'تم تفعيل الشحن التلقائي' : 'تم إيقاف الشحن التلقائي') : (enabled ? 'Auto top-up enabled' : 'Auto top-up disabled'));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSubscribe = async () => {
    if (isDemoWallet) {
      setWalletData((prev) => prev ? {
        ...prev,
        subscription: {
          planName: 'Wasel Plus',
          status: 'active',
          renewalDate: '2026-04-20T00:00:00.000Z',
        },
      } : prev);
      toast.success(isRTL ? 'مبروك! تم الاشتراك في واصل بلس' : 'Welcome to Wasel Plus!');
      return;
    }
    setActionLoading(true);
    try {
      await walletApi.subscribe(effectiveUserId, 'Wasel Plus', 9.99);
      toast.success(isRTL ? 'مبروك! تم الاشتراك في واصل بلس' : 'Welcome to Wasel Plus!');
      await fetchWallet();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const bal = walletData?.balance ?? 0;
  const pending = walletData?.pendingBalance ?? 0;
  const rewardsBal = walletData?.rewardsBalance ?? 0;
  const walletSubtitle = isRTL
    ? 'Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª ÙˆØ§Ù„Ø±ØµÙŠØ¯ ÙˆØ§Ù„Ù…ÙƒØ§ÙØ¢Øª'
    : 'Payments, balance, and rewards';

  if (shouldRedirectToAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Lock className="w-12 h-12 text-muted-foreground/60" />
        <p className="text-muted-foreground text-sm">
          {isRTL ? 'جارٍ تحويلك إلى تسجيل الدخول...' : 'Redirecting to sign in...'}
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
            <WaselLogo size={44} theme="dark" variant="full" />
          </div>
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${WaselColors.teal}20` }}
          >
            <Wallet className="w-7 h-7" style={{ color: WaselColors.teal }} />
          </div>
          <div className="space-y-2">
            <p className="text-foreground text-lg font-semibold">
              {isRTL ? 'المحفظة قيد الإطلاق' : 'Wallet experience is being finalized'}
            </p>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-6">
              {isRTL
                ? 'نجهّز تدفق المدفوعات والأمان والتسوية. فعّل وضع العرض التجريبي أو أكمل إعداد الخلفية لرؤية التجربة كاملة.'
                : 'We are wiring payments, trust checks, and settlement flows. Enable demo mode or complete backend setup to preview the full wallet journey.'}
            </p>
          </div>
          <div
            className="mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground"
            style={{ borderColor: `${WaselColors.teal}22`, background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: WaselColors.success }} />
            {isRTL ? 'تجربة مالية أكثر تنسيقاً قريباً' : 'A more polished money experience is on the way'}
          </div>
        </div>
      </div>
    );
  }

  // ── Transaction Row ─────────────────────────────────────────────────────
  const TransactionRow = ({ tx }: { tx: any }) => {
    const txType = tx.type || 'payment';
    const iconCfg = TX_ICONS[txType] || TX_ICONS.payment;
    const Icon = iconCfg.icon;
    const amount = tx.amount ?? 0;
    const isPositive = amount > 0;
    const date = new Date(tx.createdAt || tx.created_at);

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconCfg.bg}`}>
          <Icon className="w-5 h-5" style={{ color: iconCfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
          <p className="text-xs text-muted-foreground">
            {date.toLocaleDateString(isRTL ? 'ar-JO' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={`text-sm font-bold tabular-nums ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{amount.toFixed(2)} {t.jod}
        </span>
      </motion.div>
    );
  };

  // ── Action Modal ────────────────────────────────────────────────────────
  const ActionModal = ({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: ReactNode }) => (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md rounded-2xl border border-border/50 p-6 space-y-4"
            style={{ background: WaselColors.navyCard }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WaselLogo size={42} showWordmark={false} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{t.walletTitle}</h1>
              <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">
                {isRTL ? 'نشط' : 'Live'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {walletSubtitle} • {walletData?.currency || 'JOD'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* ── Balance Card ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: `linear-gradient(135deg, ${WaselColors.navyCard} 0%, #1a2744 50%, #0d2137 100%)`,
          border: `1px solid ${WaselColors.teal}20`,
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-10" style={{ background: WaselColors.teal }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-5" style={{ background: WaselColors.bronze }} />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-400">{t.balance}</span>
            <button onClick={() => setBalanceVisible(!balanceVisible)} className="text-slate-400 hover:text-white transition-colors">
              {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-bold text-white tabular-nums tracking-tight">
              {balanceVisible ? bal.toFixed(2) : '••••••'}
            </span>
            <span className="text-lg text-slate-400 font-medium">{t.jod}</span>
          </div>

          <div className="flex gap-4 mb-6">
            {pending > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-yellow-400">{t.pending}: {balanceVisible ? pending.toFixed(2) : '••'} {t.jod}</span>
              </div>
            )}
            {rewardsBal > 0 && (
              <div className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs text-purple-400">{t.rewards}: {balanceVisible ? rewardsBal.toFixed(2) : '••'} {t.jod}</span>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={() => setShowTopUp(true)}
              className="rounded-xl h-12 font-semibold text-sm"
              style={{ background: WaselColors.teal }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {t.addMoney}
            </Button>
            <Button
              onClick={() => setShowWithdraw(true)}
              variant="outline"
              className="rounded-xl h-12 font-semibold text-sm border-slate-600 text-slate-200 hover:bg-slate-700/50"
            >
              <ArrowUpRight className="w-4 h-4 mr-1.5" />
              {t.withdraw}
            </Button>
            <Button
              onClick={() => setShowSend(true)}
              variant="outline"
              className="rounded-xl h-12 font-semibold text-sm border-slate-600 text-slate-200 hover:bg-slate-700/50"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {t.sendMoney}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-11 rounded-xl bg-card">
          <TabsTrigger value="overview" className="text-xs rounded-lg">{t.overview}</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs rounded-lg">{t.transactions}</TabsTrigger>
          <TabsTrigger value="rewards" className="text-xs rounded-lg">{t.rewardsTab}</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs rounded-lg">{t.insights}</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs rounded-lg">{t.settings}</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ──────────────────────────────────────────── */}
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

        {/* ── TRANSACTIONS TAB ──────────────────────────────────────── */}
        <TabsContent value="transactions" className="mt-4">
          <Card className="rounded-xl">
            <CardContent className="pt-4">
              {(!walletData?.transactions || walletData.transactions.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground text-sm">{t.noTransactions}</div>
              ) : (
                walletData.transactions.map((tx: any) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── REWARDS TAB ───────────────────────────────────────────── */}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRTL ? 'أكمل رحلات لربح مكافآت' : 'Complete trips to earn rewards'}
                  </p>
                </div>
              ) : (
                walletData.activeRewards.map((r: any) => (
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

        {/* ── INSIGHTS TAB ──────────────────────────────────────────── */}
        <TabsContent value="insights" className="mt-4 space-y-4">
          <InsightsTab insights={insights} isRTL={isRTL} t={t} />
        </TabsContent>

        {/* ── SETTINGS TAB ──────────────────────────────────────────── */}
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

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ACTION MODALS */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* Top-Up Modal */}
      <ActionModal show={showTopUp} onClose={() => setShowTopUp(false)} title={t.addMoney}>
        <div className="space-y-3">
          {/* Quick amounts */}
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 20, 50].map((amt) => (
              <Button
                key={amt}
                variant={topUpAmount === String(amt) ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTopUpAmount(String(amt))}
                className="rounded-lg text-sm"
              >
                {amt}
              </Button>
            ))}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.topUpAmount}</Label>
            <Input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="mt-1 rounded-lg" placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.paymentMethod}</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { id: 'card', label: t.card, icon: CreditCard },
                { id: 'apple_pay', label: t.applePay, icon: Smartphone },
                { id: 'bank_transfer', label: t.bankTransfer, icon: Landmark },
                { id: 'cliq', label: t.cliq, icon: Zap },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setTopUpMethod(m.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${topUpMethod === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-slate-500'}`}
                >
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleTopUp} disabled={actionLoading} className="w-full rounded-xl h-11 font-semibold" style={{ background: WaselColors.teal }}>
            {actionLoading ? t.processing : `${t.topUp} ${topUpAmount ? `${topUpAmount} ${t.jod}` : ''}`}
          </Button>
        </div>
      </ActionModal>

      {/* Withdraw Modal */}
      <ActionModal show={showWithdraw} onClose={() => setShowWithdraw(false)} title={t.withdraw}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t.withdrawAmount}</Label>
            <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="mt-1 rounded-lg" placeholder="0.00" />
            <p className="text-xs text-muted-foreground mt-1">{isRTL ? 'الرصيد المتاح' : 'Available'}: {bal.toFixed(2)} {t.jod}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.bankAccount}</Label>
            <Input value={withdrawBank} onChange={(e) => setWithdrawBank(e.target.value)} className="mt-1 rounded-lg" placeholder="JO12ABCD..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'instant', label: t.instant, fee: '0.50 JOD' },
              { id: 'bank_transfer', label: t.standard, fee: isRTL ? 'مجاني' : 'Free' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setWithdrawMethod(m.id)}
                className={`p-3 rounded-lg border text-left transition-all ${withdrawMethod === m.id ? 'border-primary bg-primary/10' : 'border-border hover:border-slate-500'}`}
              >
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.fee}</p>
              </button>
            ))}
          </div>
          <Button onClick={handleWithdraw} disabled={actionLoading} className="w-full rounded-xl h-11 font-semibold" style={{ background: WaselColors.bronze }}>
            {actionLoading ? t.processing : t.confirmWithdraw}
          </Button>
        </div>
      </ActionModal>

      {/* Send Money Modal */}
      <ActionModal show={showSend} onClose={() => setShowSend(false)} title={t.sendMoney}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t.recipientId}</Label>
            <Input value={sendRecipient} onChange={(e) => setSendRecipient(e.target.value)} className="mt-1 rounded-lg" placeholder={isRTL ? 'معرّف المستلم' : 'User ID'} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.sendAmount}</Label>
            <Input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} className="mt-1 rounded-lg" placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.noteOptional}</Label>
            <Input value={sendNote} onChange={(e) => setSendNote(e.target.value)} className="mt-1 rounded-lg" placeholder={isRTL ? 'ملاحظة...' : 'Note...'} />
          </div>
          <Button onClick={handleSend} disabled={actionLoading} className="w-full rounded-xl h-11 font-semibold" style={{ background: WaselColors.teal }}>
            {actionLoading ? t.processing : `${t.confirmSend} ${sendAmount ? `${sendAmount} ${t.jod}` : ''}`}
          </Button>
        </div>
      </ActionModal>

      {/* PIN Setup Modal */}
      <ActionModal show={showPinSetup} onClose={() => { setShowPinSetup(false); setPinValue(''); }} title={walletData?.pinSet ? t.changePin : t.setPin}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.pinDescription}</p>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${pinValue.length > i ? 'border-primary text-foreground' : 'border-border text-transparent'}`}
              >
                {pinValue[i] ? '•' : ''}
              </div>
            ))}
          </div>
          <Input
            type="tel"
            maxLength={4}
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="text-center text-2xl tracking-[1em] rounded-lg"
            placeholder="••••"
            autoFocus
          />
          <Button
            onClick={handleSetPin}
            disabled={actionLoading || pinValue.length !== 4}
            className="w-full rounded-xl h-11 font-semibold"
            style={{ background: WaselColors.teal }}
          >
            {actionLoading ? t.processing : t.setPin}
          </Button>
        </div>
      </ActionModal>
    </div>
  );
}
