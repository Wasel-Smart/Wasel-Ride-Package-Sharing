import { bookingsAPI } from '../../services/bookings';
import { describe, it, expect } from 'vitest';

describe('booking service validation', () => {
  it('rejects creation with zero seats', async () => {
    await expect(
      bookingsAPI.createBooking({
        tripId: 'trip123',
        seatsRequested: 0,
      })
    ).rejects.toThrow('seatsRequested must be at least 1');
  });
});
