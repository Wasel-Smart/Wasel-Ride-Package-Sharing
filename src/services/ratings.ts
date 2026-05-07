import { supabase } from '@/utils/supabase/client';

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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    if (submission.rating < 1 || submission.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('user_id, status')
      .eq('id', submission.bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.user_id !== user.id) {
      throw new Error('Unauthorized');
    }

    if (booking.status !== 'completed') {
      throw new Error('Can only rate completed trips');
    }

    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('booking_id', submission.bookingId)
      .eq('rider_id', user.id)
      .single();

    if (existingRating) {
      throw new Error('You have already rated this trip');
    }

    const { error: insertError } = await supabase
      .from('ratings')
      .insert({
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

    await supabase.from('notifications').insert({
      user_id: submission.driverId,
      type: 'rating_received',
      title: 'New Rating',
      body: `You received a ${submission.rating}-star rating`,
      data: { 
        bookingId: submission.bookingId, 
        tripId: submission.tripId,
        rating: submission.rating,
      },
    });
  }

  async getDriverRating(driverId: string): Promise<DriverRating> {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('average_rating, total_ratings')
      .eq('id', driverId)
      .single();

    if (profileError) {
      throw profileError;
    }

    const { data: recentReviews, error: reviewsError } = await supabase
      .from('ratings')
      .select('rating, review, tags, created_at')
      .eq('driver_id', driverId)
      .not('review', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsError) {
      throw reviewsError;
    }

    return {
      averageRating: profile.average_rating || 0,
      totalRatings: profile.total_ratings || 0,
      recentReviews: (recentReviews || []).map(r => ({
        rating: r.rating,
        review: r.review || '',
        tags: r.tags || [],
        createdAt: r.created_at,
      })),
    };
  }

  async canRateBooking(bookingId: string): Promise<{
    canRate: boolean;
    reason?: string;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { canRate: false, reason: 'Not authenticated' };
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('user_id, status')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { canRate: false, reason: 'Booking not found' };
    }

    if (booking.user_id !== user.id) {
      return { canRate: false, reason: 'Not your booking' };
    }

    if (booking.status !== 'completed') {
      return { canRate: false, reason: 'Trip not completed' };
    }

    const { data: existingRating } = await supabase
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
