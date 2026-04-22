import type { WalletData, WalletTransaction } from '../../services/walletApi';

export function getWalletErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed || fallback;
  }

  return fallback;
}

export function getLatestNewTransaction(
  previousWallet: WalletData | null | undefined,
  refreshedWallet: WalletData | null | undefined,
): WalletTransaction | null {
  if (!refreshedWallet) {
    return null;
  }

  const previousIds = new Set((previousWallet?.transactions ?? []).map((transaction) => transaction.id));
  return refreshedWallet.transactions.find((transaction) => !previousIds.has(transaction.id)) ?? null;
}
