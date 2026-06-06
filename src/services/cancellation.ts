import { API_URL, fetchWithRetry, getAuthDetails } from './core';

export interface CancelBookingRequest {
  bookingId: string;
  reason: string;
  refundRequested?: boolean;
}

export interface CancelTripRequest {
  tripId: string;
  reason: string;
}

class CancellationService {
  async cancelBooking(request: CancelBookingRequest): Promise<void> {
    const { token } = await getAuthDetails();
    const response = await fetchWithRetry(`${API_URL}/cancellations/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      timeout: 15_000,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(String(body.error ?? 'Failed to cancel booking'));
    }
  }

  async cancelTrip(request: CancelTripRequest): Promise<void> {
    const { token } = await getAuthDetails();
    const response = await fetchWithRetry(`${API_URL}/cancellations/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      timeout: 15_000,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(String(body.error ?? 'Failed to cancel trip'));
    }
  }

  async canCancelBooking(bookingId: string): Promise<{
    canCancel: boolean;
    reason?: string;
  }> {
    const { token } = await getAuthDetails();
    const response = await fetchWithRetry(
      `${API_URL}/cancellations/bookings/${encodeURIComponent(bookingId)}/eligibility`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10_000,
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { canCancel: false, reason: String(body.error ?? 'Unable to verify cancellation eligibility') };
    }

    return response.json() as Promise<{ canCancel: boolean; reason?: string }>;
  }
}

export const cancellationService = new CancellationService();
