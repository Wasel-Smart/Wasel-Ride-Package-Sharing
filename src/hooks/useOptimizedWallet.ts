import { useMemo, useCallback } from 'react';
import type { WalletData, WalletTransaction } from '../services/walletApi';

const MAX_TRANSACTIONS_DISPLAY = 100;

export function useOptimizedWallet(walletData: WalletData | null) {
  const optimizedTransactions = useMemo(() => {
    if (!walletData?.transactions) return [];
    
    // Limit transactions for performance
    return walletData.transactions
      .slice(0, MAX_TRANSACTIONS_DISPLAY)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [walletData?.transactions]);

  const walletSummary = useMemo(() => {
    if (!walletData) return null;
    
    return {
      balance: walletData.balance,
      pendingBalance: walletData.pendingBalance,
      rewardsBalance: walletData.rewardsBalance,
      totalTransactions: walletData.transactions.length,
      recentTransactions: optimizedTransactions.slice(0, 5),
    };
  }, [walletData, optimizedTransactions]);

  const getTransactionsByType = useCallback((type: string) => {
    return optimizedTransactions.filter(tx => tx.type === type);
  }, [optimizedTransactions]);

  const getTransactionsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return optimizedTransactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      return txDate >= startDate && txDate <= endDate;
    });
  }, [optimizedTransactions]);

  return {
    optimizedTransactions,
    walletSummary,
    getTransactionsByType,
    getTransactionsByDateRange,
  };
}

export function useWalletValidation() {
  const validateAmount = useCallback((amount: string, balance?: number): { isValid: boolean; error?: string } => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return { isValid: false, error: 'Please enter a valid amount' };
    }
    
    if (balance !== undefined && numAmount > balance) {
      return { isValid: false, error: 'Insufficient balance' };
    }
    
    if (numAmount > 10000) {
      return { isValid: false, error: 'Amount exceeds maximum limit' };
    }
    
    return { isValid: true };
  }, []);

  const validatePin = useCallback((pin: string): { isValid: boolean; error?: string } => {
    if (!/^\d{4}$/.test(pin)) {
      return { isValid: false, error: 'PIN must be exactly 4 digits' };
    }
    
    return { isValid: true };
  }, []);

  const validateRecipient = useCallback((recipient: string): { isValid: boolean; error?: string } => {
    if (!recipient.trim()) {
      return { isValid: false, error: 'Please enter recipient information' };
    }
    
    // Basic validation - could be enhanced based on requirements
    if (recipient.length < 3) {
      return { isValid: false, error: 'Recipient information too short' };
    }
    
    return { isValid: true };
  }, []);

  return {
    validateAmount,
    validatePin,
    validateRecipient,
  };
}