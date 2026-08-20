import { supabase } from '@/utils/supabase/client';
import { paymentService } from './payment';

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
    if (!supabase) throw new Error('Supabase not configured');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

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
      } catch {
        // Refund failure is non-fatal; cancellation proceeds regardless.
      }
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('driver_id')
      .eq('id', booking.trip_id)
      .single();

    if (tripError) {
      throw tripError;
    }

    const driverId = trip.driver_id;

    await supabase.from('notifications').insert({
      user_id: driverId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      body: `A passenger cancelled their booking. Reason: ${reason}`,
      data: { bookingId, tripId: booking.trip_id },
    });
  }

  async cancelTrip({ tripId, reason }: CancelTripRequest): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

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

    const activeBookings = bookings ?? [];

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
          } catch {
            // Refund failure is non-fatal; cancellation proceeds regardless.
          }
        }

        await supabase.from('notifications').insert({
          user_id: booking.passenger_id,
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
    if (!supabase) throw new Error('Supabase not configured');

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('status, trip_id')
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

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('departure_time')
      .eq('id', booking.trip_id)
      .single();

    if (tripError || !trip) {
      return { canCancel: false, reason: 'Trip not found' };
    }

    const departureTime = new Date(trip.departure_time ?? '');
    const now = new Date();
    const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 1) {
      return { canCancel: false, reason: 'Too close to departure time' };
    }

    return { canCancel: true };
  }
}

export const cancellationService = new CancellationService();
