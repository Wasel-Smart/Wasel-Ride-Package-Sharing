import { walletRepository } from '../repositories/walletRepository';
import { NotFoundError, ValidationError, InternalError } from '@wasel/backend-shared/errors/app-errors';

export class WalletService {
  async getBalance(userId: string) {
    return walletRepository.getBalance(userId);
  }

  async topUp(userId: string, amount: number, description: string) {
    if (amount <= 0 || amount > 10000) {
      throw new ValidationError('Top-up amount must be between 1 and 10,000 JOD');
    }

    return walletRepository.credit(userId, amount, 'topup', description);
  }

  async pay(userId: string, amount: number, description: string, refType?: string, refId?: string) {
    if (amount <= 0) {
      throw new ValidationError('Payment amount must be positive');
    }

    return walletRepository.debit(userId, amount, 'payment', description, refType, refId);
  }

  async refund(userId: string, amount: number, description: string, refType?: string, refId?: string) {
    if (amount <= 0) {
      throw new ValidationError('Refund amount must be positive');
    }

    return walletRepository.credit(userId, amount, 'refund', description, refType, refId);
  }

  async getTransactions(userId: string, page: number, limit: number) {
    return walletRepository.getTransactions(userId, page, limit);
  }
}

export const walletService = new WalletService();
