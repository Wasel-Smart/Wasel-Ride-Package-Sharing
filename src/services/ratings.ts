import { API_URL, createEdgeHeaders, fetchWithRetry, getAuthDetails } from './core';

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
      throw new Error(`Ratings request failed: ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async submitRating(submission: RatingSubmission): Promise<void> {
    if (submission.rating < 1 || submission.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    await this.request<void>('/ratings', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  async getDriverRating(driverId: string): Promise<DriverRating> {
    return this.request<DriverRating>(`/drivers/${encodeURIComponent(driverId)}/rating`);
  }

  async canRateBooking(bookingId: string): Promise<{
    canRate: boolean;
    reason?: string;
  }> {
    return this.request<{ canRate: boolean; reason?: string }>(
      `/bookings/${encodeURIComponent(bookingId)}/rating-eligibility`,
    );
  }
}

export const ratingsService = new RatingsService();
