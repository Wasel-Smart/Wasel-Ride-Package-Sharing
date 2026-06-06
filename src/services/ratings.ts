import { API_URL, fetchWithRetry, getAuthDetails } from './core';

export interface RatingSubmission {
  bookingId: string;
  tripId: string;
  driverId: string;
  rating: number;
  review?: string;
  tags?: string[];
}

export interface DriverRating {
  averageRating: number;
  totalRatings: number;
  recentReviews: Array<{
    rating: number;
    review: string;
    tags: string[];
    createdAt: string;
  }>;
}

class RatingsService {
  async submitRating(submission: RatingSubmission): Promise<void> {
    if (submission.rating < 1 || submission.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const { token } = await getAuthDetails();
    const response = await fetchWithRetry(`${API_URL}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(submission),
      timeout: 10_000,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(String(body.error ?? 'Failed to submit rating'));
    }
  }

  async getDriverRating(driverId: string): Promise<DriverRating> {
    const { token } = await getAuthDetails();
    const response = await fetchWithRetry(`${API_URL}/ratings/drivers/${encodeURIComponent(driverId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(String(body.error ?? 'Failed to load driver rating'));
    }

    return response.json() as Promise<DriverRating>;
  }

  async canRateBooking(bookingId: string): Promise<{
    canRate: boolean;
    reason?: string;
  }> {
    const { token } = await getAuthDetails();
    const response = await fetchWithRetry(`${API_URL}/ratings/bookings/${encodeURIComponent(bookingId)}/eligibility`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { canRate: false, reason: String(body.error ?? 'Unable to verify rating eligibility') };
    }

    return response.json() as Promise<{ canRate: boolean; reason?: string }>;
  }
}

export const ratingsService = new RatingsService();
