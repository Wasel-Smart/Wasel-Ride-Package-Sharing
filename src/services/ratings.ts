import { supabase, unsafeSupabase } from '@/utils/supabase/client';

type DriverReviewRow = {
  rating: number | null;
  review: string | null;
  tags: string[] | null;
  created_at: string;
};

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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    if (submission.rating < 1 || submission.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const { data: booking, error: bookingError } = await unsafeSupabase
      .from('bookings')
      .select('passenger_id, status')
      .eq('id', submission.bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.passenger_id !== user.id) {
      throw new Error('Unauthorized');
    }

    if (booking.status !== 'completed') {
      throw new Error('Can only rate completed trips');
    }

    const { data: existingRating } = await unsafeSupabase
      .from('ratings')
      .select('id')
      .eq('booking_id', submission.bookingId)
      .eq('rider_id', user.id)
      .single();

    if (existingRating) {
      throw new Error('You have already rated this trip');
    }

    const { error: insertError } = await unsafeSupabase.from('ratings').insert({
      booking_id: submission.bookingId,
      trip_id: submission.tripId,
      rider_id: user.id,
      driver_id: submission.driverId,
      rating: submission.rating,
      review: submission.review,
      tags: submission.tags || [],
    });

    if (insertError) {
      throw insertError;
    }

    await unsafeSupabase.from('notifications').insert({
      user_id: submission.driverId,
      type: 'rating_received',
      title: 'New Rating',
      message: `You received a ${submission.rating}-star rating`,
      metadata: {
        bookingId: submission.bookingId,
        tripId: submission.tripId,
        rating: submission.rating,
      },
      related_booking_id: submission.bookingId,
      related_trip_id: submission.tripId,
    });
  }

  async getDriverRating(driverId: string): Promise<DriverRating> {
    const { data: profile, error: profileError } = await unsafeSupabase
      .from('profiles')
      .select('average_rating, total_ratings')
      .eq('id', driverId)
      .single();

    if (profileError) {
      throw profileError;
    }

    const { data: recentReviews, error: reviewsError } = await unsafeSupabase
      .from('ratings')
      .select('rating, review, tags, created_at')
      .eq('driver_id', driverId)
      .not('review', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsError) {
      throw reviewsError;
    }

    const reviewRows = (recentReviews ?? []) as DriverReviewRow[];

    return {
      averageRating: profile.average_rating || 0,
      totalRatings: profile.total_ratings || 0,
      recentReviews: reviewRows.map(review => ({
        rating: review.rating ?? 0,
        review: review.review || '',
        tags: review.tags || [],
        createdAt: review.created_at,
      })),
    };
  }

  async canRateBooking(bookingId: string): Promise<{
    canRate: boolean;
    reason?: string;
  }> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { canRate: false, reason: 'Not authenticated' };
    }

    const { data: booking, error } = await unsafeSupabase
      .from('bookings')
      .select('passenger_id, status')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { canRate: false, reason: 'Booking not found' };
    }

    if (booking.passenger_id !== user.id) {
      return { canRate: false, reason: 'Not your booking' };
    }

    if (booking.status !== 'completed') {
      return { canRate: false, reason: 'Trip not completed' };
    }

    const { data: existingRating } = await unsafeSupabase
      .from('ratings')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('rider_id', user.id)
      .single();

    if (existingRating) {
      return { canRate: false, reason: 'Already rated' };
    }

    return { canRate: true };
  }
}

export const ratingsService = new RatingsService();
