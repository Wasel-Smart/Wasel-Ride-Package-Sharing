import { getDb } from '@wasel/backend-shared/db';
import { logger } from '@wasel/backend-shared/logging/logger';
import { NotFoundError, ValidationError, InternalError } from '@wasel/backend-shared/errors/app-errors';

export interface WalletRow {
  wallet_id: string;
  user_id: string;
  balance_jod: number;
  currency_code: string;
  wallet_status: string;
  auto_topup_enabled: boolean;
  auto_topup_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  wallet_id: string;
  user_id: string;
  type: 'topup' | 'payment' | 'refund' | 'payout' | 'commission' | 'adjustment' | 'credit';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference_type: string | null;
  reference_id: string | null;
  provider: string | null;
  provider_txn_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export class WalletRepository {
  private db = getDb();

  async getWallet(userId: string): Promise<WalletRow | null> {
    const result = await this.db.unsafe('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    return (result[0] as unknown as WalletRow) || null;
  }

  async getOrCreateWallet(userId: string): Promise<WalletRow> {
    let wallet = await this.getWallet(userId);
    if (!wallet) {
      const result = await this.db.unsafe(
        `INSERT INTO wallets (user_id, balance_jod, currency_code, wallet_status)
         VALUES ($1, 0.00, 'JOD', 'active')
         RETURNING *`,
        [userId]
      );
      wallet = result[0] as unknown as WalletRow;
    }
    return wallet;
  }

  async getBalance(userId: string): Promise<{ balance: number; currency: string }> {
    const wallet = await this.getOrCreateWallet(userId);
    return { balance: wallet.balance_jod, currency: wallet.currency_code };
  }

  async credit(
    userId: string,
    amount: number,
    type: 'topup' | 'refund' | 'credit' | 'payout',
    description: string,
    refType?: string,
    refId?: string
  ): Promise<TransactionRow> {
    if (amount <= 0) {
      throw new ValidationError('Credit amount must be positive');
    }

    const wallet = await this.getOrCreateWallet(userId);

    try {
      const txResult = await this.db.unsafe(
        `INSERT INTO transactions (wallet_id, user_id, type, amount, currency, status, reference_type, reference_id, description)
         VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8)
         RETURNING *`,
        [wallet.wallet_id, userId, type, amount, wallet.currency_code, refType || null, refId || null, description]
      );

      await this.db.unsafe(
        'UPDATE wallets SET balance_jod = balance_jod + $1, updated_at = NOW() WHERE wallet_id = $2',
        [amount, wallet.wallet_id]
      );

      return txResult[0] as unknown as TransactionRow;
    } catch (error) {
      logger.error({ error, userId, amount, type }, 'Failed to credit wallet');
      throw new InternalError('Failed to credit wallet', error as Error);
    }
  }

  async debit(
    userId: string,
    amount: number,
    type: 'payment' | 'commission' | 'adjustment',
    description: string,
    refType?: string,
    refId?: string
  ): Promise<TransactionRow> {
    if (amount <= 0) {
      throw new ValidationError('Debit amount must be positive');
    }

    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.balance_jod < amount) {
      throw new ValidationError('Insufficient wallet balance');
    }

    try {
      const txResult = await this.db.unsafe(
        `INSERT INTO transactions (wallet_id, user_id, type, amount, currency, status, reference_type, reference_id, description)
         VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8)
         RETURNING *`,
        [wallet.wallet_id, userId, type, -amount, wallet.currency_code, refType || null, refId || null, description]
      );

      await this.db.unsafe(
        'UPDATE wallets SET balance_jod = balance_jod - $1, updated_at = NOW() WHERE wallet_id = $2',
        [amount, wallet.wallet_id]
      );

      return txResult[0] as unknown as TransactionRow;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      logger.error({ error, userId, amount, type }, 'Failed to debit wallet');
      throw new InternalError('Failed to debit wallet', error as Error);
    }
  }

  async getTransactions(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ data: TransactionRow[]; meta: { total: number; page: number; limit: number } }> {
    const offset = (page - 1) * limit;

    const countResult = await this.db.unsafe(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = $1',
      [userId]
    );
    const total = Number(countResult[0]?.total || 0);

    const data = await this.db.unsafe(
      `SELECT * FROM transactions WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      data: data as unknown as TransactionRow[],
      meta: { total, page, limit },
    };
  }
}

export const walletRepository = new WalletRepository();
