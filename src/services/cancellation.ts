import { API_URL, createEdgeHeaders, fetchWithRetry, getAuthDetails } from './core';

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
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const auth = await getAuthDetails();
    const response = await fetchWithRetry(`${API_URL}${path}`, {
      ...options,
      headers: createEdgeHeaders(
        {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        auth.token,
      ),
    });

    if (!response.ok) {
      throw new Error(`Cancellation request failed: ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async cancelBooking({
    bookingId,
    reason,
    refundRequested = true,
  }: CancelBookingRequest): Promise<void> {
    await this.request<void>(`/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason, refundRequested }),
    });
  }

  async cancelTrip({ tripId, reason }: CancelTripRequest): Promise<void> {
    await this.request<void>(`/trips/${encodeURIComponent(tripId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async canCancelBooking(bookingId: string): Promise<{
    canCancel: boolean;
    reason?: string;
  }> {
    return this.request<{ canCancel: boolean; reason?: string }>(
      `/bookings/${encodeURIComponent(bookingId)}/cancellation-eligibility`,
    );
  }
}

export const cancellationService = new CancellationService();
