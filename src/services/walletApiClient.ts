import api from '../utils/api';

export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
}

export async function getBalance() {
  const response = await api.get('/wallet/me/balance');
  return response as { data: WalletBalance };
}

export async function getTransactions(page = 1, limit = 20) {
  const response = await api.get(`/wallet/me/transactions?page=${page}&limit=${limit}`);
  return response as { data: WalletTransaction[]; meta: { total: number; page: number; limit: number } };
}

export async function topUp(amount: number, method = 'card') {
  const response = await api.post('/wallet/me/topup', { amount, method });
  return response as { data: WalletTransaction };
}
