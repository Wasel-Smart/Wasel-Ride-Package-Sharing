import { API_URL, fetchWithRetry, getAuthDetails } from './core';

export const bookingsAPI = {
  async createBooking(
    tripId: string,
    seatsRequested: number,
    pickup?: string,
    dropoff?: string,
    metadata?: Record<string, unknown>,
  ) {
    const { token } = await getAuthDetails();

    const response = await fetchWithRetry(`${API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        trip_id: tripId,
        seats_requested: seatsRequested,
        pickup_stop: pickup,
        dropoff_stop: dropoff,
        ...metadata,
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create booking');
    }

    return await response.json();
  },

  async getUserBookings() {
    const { token, userId } = await getAuthDetails();

    const response = await fetchWithRetry(`${API_URL}/bookings/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch bookings');
    }

    return await response.json();
  },

  async getTripBookings(tripId: string) {
    const { token } = await getAuthDetails();

    const response = await fetchWithRetry(`${API_URL}/trips/${tripId}/bookings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch trip bookings');
    }

    return await response.json();
  },

  async updateBookingStatus(bookingId: string, status: 'accepted' | 'rejected' | 'cancelled') {
    const { token } = await getAuthDetails();

    const response = await fetchWithRetry(`${API_URL}/bookings/${bookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
       const error = await response.json();
       throw new Error(error.error || 'Failed to update booking');
    }
    return await response.json();
  }
};
