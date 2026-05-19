import { supabase } from '@/utils/supabase/client';
import { paymentService } from './payment';

type TripBookingRow = {
  id: string;
  user_id: string;
  payment_status: string | null;
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

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*, trips(*)')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.user_id !== user.id) {
      throw new Error('Unauthorized');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Booking already cancelled');
    }

    if (booking.status === 'completed') {
      throw new Error('Cannot cancel completed booking');
    }

    const { error: updateError } = await supabase
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

    await supabase.from('notifications').insert({
      user_id: booking.trips.driver_id,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      body: `A passenger cancelled their booking. Reason: ${reason}`,
      data: { bookingId, tripId: booking.trip_id },
    });
  }

  async cancelTrip({ tripId, reason }: CancelTripRequest): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: trip, error: fetchError } = await supabase
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

    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('trip_id', tripId)
      .in('status', ['pending', 'confirmed']);

    const { error: tripUpdateError } = await supabase
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

      await supabase
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

        await supabase.from('notifications').insert({
          user_id: booking.user_id,
          type: 'trip_cancelled',
          title: 'Trip Cancelled',
          body: `Your trip has been cancelled by the driver. Reason: ${reason}`,
          data: { bookingId: booking.id, tripId },
        });
      }
    }
  }

  async canCancelBooking(bookingId: string): Promise<{
    canCancel: boolean;
    reason?: string;
  }> {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('status, trips(departure_time)')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { canCancel: false, reason: 'Booking not found' };
    }

    if (booking.status === 'cancelled') {
      return { canCancel: false, reason: 'Already cancelled' };
    }

    if (booking.status === 'completed') {
      return { canCancel: false, reason: 'Trip completed' };
    }

    const departureTime = new Date(booking.trips.departure_time);
    const now = new Date();
    const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 1) {
      return { canCancel: false, reason: 'Too close to departure time' };
    }

    return { canCancel: true };
  }
}

export const cancellationService = new CancellationService();
