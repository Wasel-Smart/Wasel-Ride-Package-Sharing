import { useCallback, useEffect, useMemo, useState } from 'react';
import { walletApi, type PaymentIntentConfirmationView, type WalletData, type WalletReliabilityMeta, type WalletTransaction } from '../../services/walletApi';

const DEFAULT_PAGE_SIZE = 12;

export interface WalletSendDraft {
  recipientUserId: string;
  amount: string;
  note: string;
  pin: string;
  otpCode: string;
}

export interface WalletTransferChallenge {
  challengeId?: string;
  deliveryChannel?: string;
  maskedDestination?: string | null;
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useWallet(userId: string | null, pageSize = DEFAULT_PAGE_SIZE) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [meta, setMeta] = useState<WalletReliabilityMeta | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [transferChallenge, setTransferChallenge] = useState<WalletTransferChallenge | null>(null);

  const hasMoreTransactions = transactions.length < totalTransactions;

  const loadTransactions = useCallback(
    async (targetUserId: string, targetPage: number, options?: { append?: boolean }) => {
      const response = await walletApi.getTransactions(targetUserId, targetPage, pageSize);
      setTotalTransactions(response.total);
      setPage(targetPage);
      setTransactions(current =>
        options?.append ? [...current, ...response.transactions] : response.transactions,
      );
    },
    [pageSize],
  );

  const refresh = useCallback(
    async (options?: { keepPage?: boolean; silent?: boolean }) => {
      if (!userId) {
        setWallet(null);
        setMeta(null);
        setTransactions([]);
        setTotalTransactions(0);
        setPage(1);
        setLoading(false);
        return;
      }

      const activePage = options?.keepPage ? page : 1;
      const setBusyState = options?.silent ? setRefreshing : setLoading;
      setBusyState(true);
      setError(null);

      try {
        await walletApi.invalidateWalletCache(userId);
        const [snapshot] = await Promise.all([
          walletApi.getWalletSnapshot(userId),
          loadTransactions(userId, activePage),
        ]);
        setWallet(snapshot.data);
        setMeta(snapshot.meta);
      } catch (caughtError) {
        setError(toErrorMessage(caughtError, 'Wallet data could not be loaded.'));
      } finally {
        setBusyState(false);
      }
    },
    [loadTransactions, page, userId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMoreTransactions = useCallback(async () => {
    if (!userId || loadingMore || !hasMoreTransactions) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      await loadTransactions(userId, page + 1, { append: true });
    } catch (caughtError) {
      setError(toErrorMessage(caughtError, 'More transactions could not be loaded.'));
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreTransactions, loadTransactions, loadingMore, page, userId]);

  const sendMoney = useCallback(
    async (draft: WalletSendDraft) => {
      if (!userId) {
        throw new Error('Sign in is required before using wallet transfers.');
      }

      const recipientUserId = draft.recipientUserId.trim();
      const note = draft.note.trim();
      const pin = draft.pin.trim();
      const otpCode = draft.otpCode.trim();
      const amount = Number(draft.amount);

      if (!recipientUserId) {
        throw new Error('Recipient user ID is required.');
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Enter a valid amount greater than zero.');
      }
      if (!pin) {
        throw new Error('Enter your wallet PIN to authorize this transfer.');
      }

      setSubmittingTransfer(true);
      setTransferMessage(null);
      setError(null);

      try {
        const verification = await walletApi.verifyPin(
          pin,
          'transfer',
          otpCode || undefined,
          transferChallenge?.challengeId,
        );

        if (!verification.verified) {
          setTransferChallenge({
            challengeId: verification.challengeId,
            deliveryChannel: verification.deliveryChannel,
            maskedDestination: verification.maskedDestination ?? null,
          });
          setTransferMessage(
            verification.otpRequired
              ? `Enter the verification code sent via ${verification.deliveryChannel ?? 'your secure channel'}${verification.maskedDestination ? ` to ${verification.maskedDestination}` : ''}.`
              : 'Additional verification is required before sending money.',
          );
          return { status: 'challenge' as const, verification };
        }

        await walletApi.sendMoney(recipientUserId, amount, note || undefined);
        await walletApi.invalidateWalletCache(userId);
        const [snapshot] = await Promise.all([
          walletApi.getWalletSnapshot(userId),
          loadTransactions(userId, 1),
        ]);

        setWallet(snapshot.data);
        setMeta(snapshot.meta);
        setTransferChallenge(null);
        setTransferMessage('Transfer completed and wallet history refreshed.');

        return {
          status: 'success' as const,
          confirmation: {
            id: `wallet-transfer-${Date.now()}`,
            settled: true,
            status: 'succeeded',
          } satisfies PaymentIntentConfirmationView,
        };
      } catch (caughtError) {
        const nextError = toErrorMessage(caughtError, 'Transfer could not be completed.');
        setError(nextError);
        throw caughtError instanceof Error ? caughtError : new Error(nextError);
      } finally {
        setSubmittingTransfer(false);
      }
    },
    [loadTransactions, transferChallenge?.challengeId, userId],
  );

  return useMemo(
    () => ({
      error,
      hasMoreTransactions,
      loading,
      loadingMore,
      meta,
      page,
      refreshing,
      refresh: () => refresh({ silent: true, keepPage: true }),
      sendMoney,
      setError,
      submittingTransfer,
      totalTransactions,
      transactions,
      transferChallenge,
      transferMessage,
      wallet,
      loadMoreTransactions,
    }),
    [
      error,
      hasMoreTransactions,
      loading,
      loadingMore,
      loadMoreTransactions,
      meta,
      page,
      refresh,
      refreshing,
      sendMoney,
      submittingTransfer,
      totalTransactions,
      transactions,
      transferChallenge,
      transferMessage,
      wallet,
    ],
  );
}
