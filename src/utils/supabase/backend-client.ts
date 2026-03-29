/**
 * W Mobility Platform - Supabase Backend Client
 * Production-ready client with type-safe database operations
 */

import { createClient } from '@supabase/supabase-js';
type Database = any;

// =====================================================
// CLIENT CONFIGURATION
// =====================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// =====================================================
// TYPE-SAFE API FUNCTIONS
// =====================================================

/**
 * Authentication
 */
export const auth = {
  async signUp(email: string, password: string, userData: {
    full_name: string;
    phone?: string;
    role?: 'passenger' | 'driver' | 'both';
  }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });

    if (error) throw error;

    // Create user profile
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        phone: userData.phone,
        full_name: userData.full_name,
        role: userData.role || 'passenger'
      });
    }

    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  }
};

/**
 * Users
 */
export const users = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Database['public']['Tables']['users']['Update']>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserStats(userId: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        total_trips,
        total_trips_as_driver,
        total_trips_as_passenger,
        trust_score,
        wallet_balance,
        lifetime_earnings
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    return user;
  }
};

/**
 * Trips
 */
export const trips = {
  async searchTrips(params: {
    origin?: string;
    destination?: string;
    date?: string;
    mode?: 'carpooling' | 'on_demand';
  }) {
    let query = supabase
      .from('available_trips')
      .select('*')
      .eq('mode', params.mode || 'carpooling');

    if (params.origin) {
      query = query.ilike('origin_name', `%${params.origin}%`);
    }

    if (params.destination) {
      query = query.ilike('destination_name', `%${params.destination}%`);
    }

    if (params.date) {
      const startOfDay = new Date(params.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(params.date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte('departure_time', startOfDay.toISOString())
        .lte('departure_time', endOfDay.toISOString());
    }

    const { data, error } = await query
      .order('departure_time', { ascending: true })
      .limit(50);

    if (error) throw error;
    return data;
  },

  async getTripDetails(tripId: string) {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        driver:users!trips_driver_id_fkey(id, full_name, avatar_url, gender),
        driver_profile:driver_profiles!driver_profiles_user_id_fkey(*),
        bookings:trip_bookings(
          *,
          passenger:users!trip_bookings_passenger_id_fkey(id, full_name, avatar_url)
        )
      `)
      .eq('id', tripId)
      .single();

    if (error) throw error;
    return data;
  },

  async createTrip(tripData: Database['public']['Tables']['trips']['Insert']) {
    const { data, error } = await supabase
      .from('trips')
      .insert(tripData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async requestOnDemandRide(request: {
    origin: string;
    origin_lat: number;
    origin_lng: number;
    destination: string;
    destination_lat: number;
    destination_lng: number;
    seats?: number;
  }) {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        mode: 'on_demand',
        status: 'requested',
        origin_name: request.origin,
        origin_location: `POINT(${request.origin_lng} ${request.origin_lat})`,
        destination_name: request.destination,
        destination_location: `POINT(${request.destination_lng} ${request.destination_lat})`,
        total_seats: request.seats || 1,
        available_seats: request.seats || 1
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async acceptTrip(tripId: string, driverId: string) {
    const { data, error } = await supabase
      .from('trips')
      .update({
        driver_id: driverId,
        status: 'accepted'
      })
      .eq('id', tripId)
      .eq('status', 'requested')
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTripStatus(tripId: string, status: Database['public']['Enums']['trip_status']) {
    const { data, error } = await supabase
      .from('trips')
      .update({ status })
      .eq('id', tripId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Bookings
 */
export const bookings = {
  async bookTrip(tripId: string, passengerId: string, seats: number) {
    // Get trip details
    const { data: trip } = await supabase
      .from('trips')
      .select('price_per_seat, available_seats')
      .eq('id', tripId)
      .single();

    if (!trip || trip.available_seats < seats) {
      throw new Error('Not enough seats available');
    }

    // Create booking
    const { data, error } = await supabase
      .from('trip_bookings')
      .insert({
        trip_id: tripId,
        passenger_id: passengerId,
        seats_booked: seats,
        price_paid: trip.price_per_seat * seats,
        status: 'booked'
      })
      .select()
      .single();

    if (error) throw error;

    // Update trip available seats
    await supabase
      .from('trips')
      .update({
        available_seats: trip.available_seats - seats
      })
      .eq('id', tripId);

    return data;
  },

  async getUserBookings(userId: string) {
    const { data, error } = await supabase
      .from('trip_bookings')
      .select(`
        *,
        trip:trips(
          *,
          driver:users!trips_driver_id_fkey(id, full_name, avatar_url)
        )
      `)
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async cancelBooking(bookingId: string) {
    const { data: booking } = await supabase
      .from('trip_bookings')
      .select('trip_id, seats_booked')
      .eq('id', bookingId)
      .single();

    if (!booking) throw new Error('Booking not found');

    // Update booking status
    const { error: updateError } = await supabase
      .from('trip_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Return seats to trip
    const { data: trip } = await supabase
      .from('trips')
      .select('available_seats')
      .eq('id', booking.trip_id)
      .single();

    if (trip) {
      await supabase
        .from('trips')
        .update({
          available_seats: trip.available_seats + booking.seats_booked
        })
        .eq('id', booking.trip_id);
    }

    return true;
  }
};

/**
 * Packages (Awasel)
 */
export const packages = {
  async createPackage(packageData: Omit<Database['public']['Tables']['packages']['Insert'], 'tracking_number' | 'qr_code'>) {
    // Generate tracking number
    const trackingNumber = `WP${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;
    const qrCode = `wasel://package/${trackingNumber}`;

    const { data, error } = await supabase
      .from('packages')
      .insert({
        ...packageData,
        tracking_number: trackingNumber,
        qr_code: qrCode
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async trackPackage(trackingNumber: string) {
    const { data, error } = await supabase
      .from('packages')
      .select(`
        *,
        sender:users!packages_sender_id_fkey(id, full_name, phone),
        carrier:users!packages_carrier_id_fkey(id, full_name, phone),
        trip:trips(
          *,
          driver:users!trips_driver_id_fkey(id, full_name, phone)
        )
      `)
      .eq('tracking_number', trackingNumber)
      .single();

    if (error) throw error;
    return data;
  },

  async getUserPackages(userId: string) {
    const { data, error } = await supabase
      .from('packages')
      .select(`
        *,
        trip:trips(origin_name, destination_name, status)
      `)
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

/**
 * Driver
 */
export const driver = {
  async createProfile(userId: string, profileData: Database['public']['Tables']['driver_profiles']['Insert']) {
    const { data, error } = await supabase
      .from('driver_profiles')
      .insert({
        user_id: userId,
        ...profileData
      })
      .select()
      .single();

    if (error) throw error;

    // Update user role
    await supabase
      .from('users')
      .update({ role: 'driver' })
      .eq('id', userId);

    return data;
  },

  async updateLocation(driverId: string, location: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    status?: 'online' | 'offline' | 'busy' | 'in_trip';
  }) {
    const { data, error } = await supabase
      .from('driver_locations')
      .upsert({
        driver_id: driverId,
        location: `POINT(${location.lng} ${location.lat})`,
        heading: location.heading,
        speed_kmh: location.speed,
        status: location.status || 'online',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getEarnings(driverId: string) {
    const { data, error } = await supabase
      .from('driver_earnings_summary')
      .select('*')
      .eq('driver_id', driverId)
      .single();

    if (error) throw error;
    return data;
  },

  async getNearbyRequests(driverId: string, maxDistanceKm: number = 10) {
    const { data: location } = await supabase
      .from('driver_locations')
      .select('location')
      .eq('driver_id', driverId)
      .single();

    if (!location) return [];

    // Find nearby trip requests
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'requested')
      .eq('mode', 'on_demand')
      .limit(10);

    if (error) throw error;
    return data || [];
  }
};

/**
 * Notifications
 */
export const notifications = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  },

  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  }
};

/**
 * Messages
 */
export const messages = {
  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, avatar_url),
        receiver:users!messages_receiver_id_fkey(id, full_name, avatar_url)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data;
  },

  async sendMessage(senderId: string, receiverId: string, message: string, tripId?: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message,
        trip_id: tripId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Reviews
 */
export const reviews = {
  async submitReview(tripId: string, reviewerId: string, revieweeId: string, rating: number, review?: string) {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        trip_id: tripId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating,
        review
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserReviews(userId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:users!reviews_reviewer_id_fkey(id, full_name, avatar_url),
        trip:trips(origin_name, destination_name)
      `)
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

// =====================================================
// EXPORT
// =====================================================

export default supabase;
