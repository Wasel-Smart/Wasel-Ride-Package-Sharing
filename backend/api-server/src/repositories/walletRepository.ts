import { getDb } from '@wasel/backend-shared/db';
import { logger } from '@wasel/backend-shared/logging/logger';
import { NotFoundError, InternalError, ValidationError } from '@wasel/backend-shared/errors/app-errors';

export interface WalletRow {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  wallet_id: string;
  user_id: string | null;
  trip_id: string | null;
  type: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  payment_intent_id: string | null;
  stripe_charge_id: string | null;
  description: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

class WalletRepository {
  private db = getDb();

  /**
   * Get wallet for a user
   */
  async getWallet(userId: string): Promise<WalletRow | null> {
    try {
      const [wallet] = await this.db`
        SELECT
          id, user_id, balance, currency, is_active, created_at, updated_at
        FROM wallets
        WHERE user_id = ${userId}
      ` as unknown as WalletRow[];

      return wallet ?? null;
    } catch (error) {
      logger.error('Error getting wallet', error);
      throw new InternalError('Failed to get wallet');
    }
  }

  /**
   * Create a wallet for a user
   */
  async createWallet(userId: string): Promise<WalletRow> {
    try {
      const now = new Date().toISOString();
      const [wallet] = await this.db`
        INSERT INTO wallets (user_id, balance, currency, is_active, created_at, updated_at)
        VALUES (${userId}, 0, 'JOD', true, ${now}, ${now})
        RETURNING id, user_id, balance, currency, is_active, created_at, updated_at
      ` as unknown as WalletRow[];

      return wallet;
    } catch (error) {
      logger.error('Error creating wallet', error);
      throw new InternalError('Failed to create wallet');
    }
  }

  /**
   * Credit wallet (add funds)
   */
  async credit(
    userId: string,
    amount: number,
    type: string,
    refType?: string,
    refId?: string,
  ): Promise<TransactionRow> {
    try {
      const now = new Date().toISOString();

      const [result] = await this.db`
        WITH wallet_upsert AS (
          INSERT INTO wallets (user_id, balance, currency, is_active, created_at, updated_at)
          VALUES (${userId}, 0, 'JOD', true, ${now}, ${now})
          ON CONFLICT (user_id) DO UPDATE
          SET balance = wallets.balance + ${amount}, updated_at = ${now}
          RETURNING id
        )
        INSERT INTO transactions (
          wallet_id, user_id, amount, currency, type, payment_method,
          metadata, created_at, updated_at
        )
        SELECT
          id, ${userId}, ${amount}, 'JOD', ${type}, 'wallet',
          ${JSON.stringify({ reference_type: refType, reference_id: refId })}::jsonb,
          ${now}, ${now}
        FROM wallet_upsert
        RETURNING
          id, wallet_id, user_id, trip_id, type, amount, currency, status,
          payment_method, payment_intent_id, stripe_charge_id, description, metadata, created_at, updated_at
      ` as unknown as TransactionRow[];

      return result;
    } catch (error) {
      logger.error('Error crediting wallet', error);
      throw new InternalError('Failed to credit wallet');
    }
  }

  /**
   * Debit wallet (remove funds)
   */
  async debit(
    userId: string,
    amount: number,
    type: string,
    refType?: string,
    refId?: string,
  ): Promise<TransactionRow> {
    try {
      const now = new Date().toISOString();

      const [wallet] = await this.db`
        SELECT id, balance FROM wallets WHERE user_id = ${userId} FOR UPDATE
      ` as unknown as { id: string; balance: number }[];

      if (!wallet) {
        throw new NotFoundError('Wallet');
      }

      if (Number(wallet.balance) < amount) {
        throw new ValidationError('Insufficient balance');
      }

      await this.db`
        UPDATE wallets
        SET balance = balance - ${amount}, updated_at = ${now}
        WHERE id = ${wallet.id}
      `;

      const [transaction] = await this.db`
        INSERT INTO transactions (
          wallet_id, user_id, amount, currency, type, payment_method,
          metadata, created_at, updated_at
        )
        VALUES (
          ${wallet.id}, ${userId}, ${-amount}, 'JOD', ${type}, 'wallet',
          ${JSON.stringify({ reference_type: refType, reference_id: refId })}::jsonb,
          ${now}, ${now}
        )
        RETURNING
          id, wallet_id, user_id, trip_id, type, amount, currency, status,
          payment_method, payment_intent_id, stripe_charge_id, description, metadata, created_at, updated_at
      ` as unknown as TransactionRow[];

      return transaction;
    } catch (error) {
      logger.error('Error debiting wallet', error);
      throw error instanceof NotFoundError || error instanceof ValidationError
        ? error
        : new InternalError('Failed to debit wallet');
    }
  }

  /**
   * Get paginated transactions for a user
   */
  async getTransactions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: TransactionRow[]; meta: { total: number; page: number; limit: number } }> {
    try {
      const offset = (page - 1) * limit;

      const [countResult] = await this.db`
        SELECT COUNT(*) as total
        FROM transactions t
        JOIN wallets w ON t.wallet_id = w.id
        WHERE w.user_id = ${userId}
      ` as unknown as { total: number }[];

      const transactions = await this.db`
        SELECT
          t.id, t.wallet_id, t.user_id, t.trip_id, t.type, t.amount, t.currency, t.status,
          t.payment_method, t.payment_intent_id, t.stripe_charge_id, t.description, t.metadata,
          t.created_at, t.updated_at
        FROM transactions t
        JOIN wallets w ON t.wallet_id = w.id
        WHERE w.user_id = ${userId}
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as unknown as TransactionRow[];

      return {
        data: transactions,
        meta: {
          total: countResult?.total ?? 0,
          page,
          limit,
        },
      };
    } catch (error) {
      logger.error('Error getting transactions', error);
      throw new InternalError('Failed to get transactions');
    }
  }

  /**
   * Get current wallet balance for a user
   */
  async getBalance(userId: string): Promise<{ balance: number }> {
    try {
      const [result] = await this.db`
        SELECT COALESCE(balance, 0) as balance
        FROM wallets
        WHERE user_id = ${userId}
      ` as unknown as { balance: number }[];

      return { balance: Number(result?.balance ?? 0) };
    } catch (error) {
      logger.error('Error getting wallet balance', error);
      throw new InternalError('Failed to get wallet balance');
    }
  }
}

export const walletRepository = new WalletRepository();