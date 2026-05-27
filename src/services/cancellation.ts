import { supabase } from '@/utils/supabase/client';
import { paymentService } from './payment';

const db = supabase as any;

type TripBookingRow = {
  id: string;
  passenger_id: string;
  payment_status: string | null;
};

type BookingWithTrip = {
  id: string;
  passenger_id: string;
  payment_status: string | null;
  status: string | null;
  trip_id: string;
  trips: {
    driver_id: string | null;
    departure_time: string | null;
  } | null;
};

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
  async cancelBooking({
    bookingId,
    reason,
    refundRequested = true,
  }: CancelBookingRequest): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: bookingData, error: fetchError } = await db
      .from('bookings')
      .select('id, passenger_id, payment_status, status, trip_id, trips(driver_id, departure_time)')
      .eq('id', bookingId)
      .single();

    const booking = bookingData as BookingWithTrip | null;

    if (fetchError || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.passenger_id !== user.id) {
      throw new Error('Unauthorized');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Booking already cancelled');
    }

    if (booking.status === 'completed') {
      throw new Error('Cannot cancel completed booking');
    }

    const { error: updateError } = await db
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', bookingId);

    if (updateError) {
      throw updateError;
    }

    if (refundRequested && booking.payment_status === 'succeeded') {
      try {
        await paymentService.processRefund({
          bookingId,
          reason,
        });
      } catch (refundError) {
        console.error('Refund failed:', refundError);
      }
    }

    if (booking.trips?.driver_id) {
      await db.from('notifications').insert({
        user_id: booking.trips.driver_id,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `A passenger cancelled their booking. Reason: ${reason}`,
        metadata: { bookingId, tripId: booking.trip_id },
        related_booking_id: bookingId,
        related_trip_id: booking.trip_id,
      });
    }
  }

  async cancelTrip({ tripId, reason }: CancelTripRequest): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: trip, error: fetchError } = await db
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !trip) {
      throw new Error('Trip not found');
    }

    if (trip.driver_id !== user.id) {
      throw new Error('Unauthorized');
    }

    if (trip.status === 'cancelled') {
      throw new Error('Trip already cancelled');
    }

    if (trip.status === 'completed') {
      throw new Error('Cannot cancel completed trip');
    }

    const { data: bookings } = await db
      .from('bookings')
      .select('*')
      .eq('trip_id', tripId)
      .in('status', ['pending', 'confirmed']);

    const { error: tripUpdateError } = await db
      .from('trips')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', tripId);

    if (tripUpdateError) {
      throw tripUpdateError;
    }

    const activeBookings = (bookings ?? []) as TripBookingRow[];

    if (activeBookings.length > 0) {
      const bookingIds = activeBookings.map(booking => booking.id);

      await db
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_by: user.id,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: `Trip cancelled by driver: ${reason}`,
        })
        .in('id', bookingIds);

      for (const booking of activeBookings) {
        if (booking.payment_status === 'succeeded') {
          try {
            await paymentService.processRefund({
              bookingId: booking.id,
              reason: `Trip cancelled: ${reason}`,
            });
          } catch (refundError) {
            console.error(`Refund failed for booking ${booking.id}:`, refundError);
          }
        }

        await db.from('notifications').insert({
          user_id: booking.passenger_id,
          type: 'trip_cancelled',
          title: 'Trip Cancelled',
          message: `Your trip has been cancelled by the driver. Reason: ${reason}`,
          metadata: { bookingId: booking.id, tripId },
          related_booking_id: booking.id,
          related_trip_id: tripId,
        });
      }
    }
  }

  async canCancelBooking(bookingId: string): Promise<{
    canCancel: boolean;
    reason?: string;
  }> {
    const { data: bookingData, error } = await db
      .from('bookings')
      .select('status, trips(departure_time)')
      .eq('id', bookingId)
      .single();

    const booking = bookingData as Pick<BookingWithTrip, 'status' | 'trips'> | null;

    if (error || !booking) {
      return { canCancel: false, reason: 'Booking not found' };
    }

    if (booking.status === 'cancelled') {
      return { canCancel: false, reason: 'Already cancelled' };
    }

    if (booking.status === 'completed') {
      return { canCancel: false, reason: 'Trip completed' };
    }

    const departureValue = booking.trips?.departure_time;
    if (!departureValue) {
      return { canCancel: false, reason: 'Departure time unavailable' };
    }

    const departureTime = new Date(departureValue);
    const now = new Date();
    const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 1) {
      return { canCancel: false, reason: 'Too close to departure time' };
    }

    return { canCancel: true };
  }
}

export const cancellationService = new CancellationService();
