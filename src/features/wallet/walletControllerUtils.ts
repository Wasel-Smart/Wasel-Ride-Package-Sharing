import { toast } from 'sonner';
import type { WalletData, WalletTransaction } from '../../services/walletApi';

type WalletActionOptions<T> = {
  action: () => Promise<T>;
  fallbackErrorMessage: string;
  loadingSetter?: (value: boolean) => void;
  onSuccess?: (result: T) => Promise<void> | void;
};

export function getWalletErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    return message || fallbackMessage;
  }

  if (typeof error === 'string') {
    const message = error.trim();
    return message || fallbackMessage;
  }

  return fallbackMessage;
}

export function getLatestNewTransaction(
  previousWallet: WalletData | null,
  refreshedWallet: WalletData | null,
): WalletTransaction | null {
  const previousTransactionIds = new Set(
    (previousWallet?.transactions ?? []).map((transaction) => transaction.id),
  );

  return (
    refreshedWallet?.transactions.find(
      (transaction) => !previousTransactionIds.has(transaction.id),
    ) ?? null
  );
}

export async function runWalletAction<T>({
  action,
  fallbackErrorMessage,
  loadingSetter,
  onSuccess,
}: WalletActionOptions<T>): Promise<T | null> {
  loadingSetter?.(true);

  try {
    const result = await action();
    await onSuccess?.(result);
    return result;
  } catch (error) {
    toast.error(getWalletErrorMessage(error, fallbackErrorMessage));
    return null;
  } finally {
    loadingSetter?.(false);
  }
}
