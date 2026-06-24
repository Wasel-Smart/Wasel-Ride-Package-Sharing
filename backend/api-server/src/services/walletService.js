import { walletRepository } from '../repositories/walletRepository.js';
import { ValidationError } from '@wasel/backend-shared/errors/app-errors';
export class WalletService {
    async getBalance(userId) {
        return walletRepository.getBalance(userId);
    }
    async topUp(userId, amount, description) {
        if (amount <= 0 || amount > 10000) {
            throw new ValidationError('Top-up amount must be between 1 and 10,000 JOD');
        }
        return walletRepository.credit(userId, amount, 'topup', description);
    }
    async pay(userId, amount, description, refType, refId) {
        if (amount <= 0) {
            throw new ValidationError('Payment amount must be positive');
        }
        return walletRepository.debit(userId, amount, 'payment', description, refType, refId);
    }
    async refund(userId, amount, description, refType, refId) {
        if (amount <= 0) {
            throw new ValidationError('Refund amount must be positive');
        }
        return walletRepository.credit(userId, amount, 'refund', description, refType, refId);
    }
    async getTransactions(userId, page, limit) {
        return walletRepository.getTransactions(userId, page, limit);
    }
}
export const walletService = new WalletService();
