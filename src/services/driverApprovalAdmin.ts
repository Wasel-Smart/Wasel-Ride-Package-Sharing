import { API_URL, fetchWithRetry, getAuthDetails } from './core';

export type PendingDriverApproval = {
  driverId: string;
  userId: string;
  authUserId: string | null;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  driverStatus: string;
  verificationLevel: string;
  sanadStatus: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  readyForApproval: boolean;
};

function requireAdminApi() {
  if (!API_URL) {
    throw new Error('Admin approval requires the secure backend API.');
  }
}

async function authHeaders() {
  const { token } = await getAuthDetails();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export const driverApprovalAdminAPI = {
  async listPending(): Promise<PendingDriverApproval[]> {
    requireAdminApi();
    const response = await fetchWithRetry(`${API_URL}/admin/drivers/pending`, {
      headers: await authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to load pending drivers.' }));
      throw new Error(String(error.error ?? 'Failed to load pending drivers.'));
    }

    const payload = await response.json().catch(() => ({ pendingDrivers: [] }));
    return Array.isArray(payload.pendingDrivers) ? payload.pendingDrivers as PendingDriverApproval[] : [];
  },

  async approve(driverId: string): Promise<PendingDriverApproval> {
    requireAdminApi();
    const response = await fetchWithRetry(`${API_URL}/admin/drivers/${driverId}/approve`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to approve driver.' }));
      throw new Error(String(error.error ?? 'Failed to approve driver.'));
    }

    const payload = await response.json().catch(() => ({}));
    if (!payload.driver || typeof payload.driver !== 'object') {
      throw new Error('Approval completed but the updated driver record was missing.');
    }

    return payload.driver as PendingDriverApproval;
  },
};
