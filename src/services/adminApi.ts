import api from '../utils/api';

export interface AdminMetrics {
  activeTrips: number;
  totalPackages: number;
  pendingDisputes: number;
  totalRevenueJOD: number;
  activeUsers: number;
}

export async function getAdminMetrics() {
  const response = await api.get('/v1/admin/dashboard/metrics');
  return response as { data: AdminMetrics };
}

export async function getActiveRides(status?: string, page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  const response = await api.get(`/v1/admin/rides/active?${params.toString()}`);
  return response as { data: unknown[]; meta: { total: number; page: number; limit: number } };
}

export async function getPendingPackages() {
  const response = await api.get('/v1/admin/packages/pending');
  return response as { data: unknown[] };
}

export async function getUsers(page = 1, limit = 20) {
  const response = await api.get(`/v1/admin/users?page=${page}&limit=${limit}`);
  return response as { data: unknown[]; meta: { total: number; page: number; limit: number } };
}

export async function setUserStatus(userId: string, status: 'active' | 'inactive') {
  const response = await api.patch(`/v1/admin/users/${userId}/status`, { status });
  return response as { data: unknown };
}

export async function getPaymentReconciliation(page = 1, limit = 20) {
  const response = await api.get(`/v1/admin/payments/reconciliation?page=${page}&limit=${limit}`);
  return response as { data: unknown[]; meta: { total: number; page: number; limit: number } };
}

export async function getDisputes(page = 1, limit = 20) {
  const response = await api.get(`/v1/admin/disputes?page=${page}&limit=${limit}`);
  return response as { data: unknown[]; meta: { total: number; page: number; limit: number } };
}

export async function resolveDispute(disputeId: string, resolution: string, action?: string) {
  const response = await api.patch(`/v1/admin/disputes/${disputeId}/resolve`, { resolution, action });
  return response as { data: unknown };
}

export async function dispatchRide(rideId: string, driverId: string) {
  const response = await api.patch(`/v1/admin/rides/${rideId}/dispatch`, { driverId });
  return response as { data: unknown };
}
