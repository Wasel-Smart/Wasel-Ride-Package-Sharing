import api, { getSessionUserId } from '../utils/api';

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

async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

export async function getBalance() {
  const userId = await requireUserId();
  const response = await api.get(`/wallet/${userId}/balance`);
  return response as { data: WalletBalance };
}

export async function getTransactions(page = 1, limit = 20) {
  const userId = await requireUserId();
  const response = await api.get(`/wallet/${userId}/transactions?page=${page}&limit=${limit}`);
  return response as { data: WalletTransaction[]; meta: { total: number; page: number; limit: number } };
}

export async function topUp(amount: number) {
  const userId = await requireUserId();
  const response = await api.post(`/wallet/${userId}/topup`, { amount });
  return response as { data: WalletTransaction };
}
