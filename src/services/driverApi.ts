import api from '../utils/api';

export interface DriverEarnings {
  totalEarnings: number;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    description: string | null;
    created_at: string;
  }>;
}

export async function getDriverTrips(status?: string, page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  const response = await api.get(`/v1/driver/trips?${params.toString()}`);
  return response as { data: unknown[]; meta: { total: number; page: number; limit: number } };
}

export async function getDriverEarnings() {
  const response = await api.get('/v1/driver/earnings');
  return response as { data: DriverEarnings };
}

export async function getDriverPackageAssignments() {
  const response = await api.get('/v1/driver/packages/assignments');
  return response as { data: unknown[] };
}

export async function confirmPackagePickup(packageId: string) {
  const response = await api.post(`/v1/driver/packages/${packageId}/confirm-pickup`, {});
  return response as { data: unknown };
}

export async function confirmPackageDelivery(packageId: string) {
  const response = await api.post(`/v1/driver/packages/${packageId}/confirm-delivery`, {});
  return response as { data: unknown };
}

export async function getDriverRatings(page = 1, limit = 10) {
  const response = await api.get(`/v1/driver/ratings?page=${page}&limit=${limit}`);
  return response as { data: unknown[]; meta: { total: number; page: number; limit: number } };
}
