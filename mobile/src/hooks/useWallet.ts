import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  category: 'ride' | 'package' | 'topup' | 'withdrawal' | 'transfer' | 'refund' | 'bonus';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  reference?: string;
}

export interface UseWalletResult {
  balance: number;
  transactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CATEGORY_ICON: Record<WalletTransaction['category'], string> = {
  ride:       'car',
  package:    'cube',
  topup:      'add-circle',
  withdrawal: 'arrow-up-circle',
  transfer:   'swap-horizontal',
  refund:     'refresh-circle',
  bonus:      'gift',
};

export { CATEGORY_ICON };

export function useWallet(userId: string | undefined): UseWalletResult {
  const [balance,      setBalance]      = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [profileResult, txResult] = await Promise.allSettled([
        supabase.from('profiles').select('wallet_balance').eq('id', userId).single(),
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(40),
      ]);

      if (profileResult.status === 'fulfilled' && profileResult.value.data) {
        setBalance(Number(profileResult.value.data.wallet_balance) || 0);
      }

      if (txResult.status === 'fulfilled' && txResult.value.data) {
        setTransactions(txResult.value.data as WalletTransaction[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void fetchWallet(); }, [fetchWallet]);

  return { balance, transactions, loading, error, refresh: fetchWallet };
}
