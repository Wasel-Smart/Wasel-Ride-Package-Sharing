/**
 * Unified Ride Service
 * Consolidates ride creation, search, booking, and lifecycle management
 * Provides single source of truth for all ride operations
 */

import { logger } from '../utils/logger';
import { tripsAPI, type TripCreatePayload, type TripSearchResult } from './trips';
import { bookingsAPI } from './bookings';
import {
  createRideBooking,
  getRideBookings,
  updateRideBooking,
  hydrateRideBookings,
  type RideBookingRecord,
  type RideBookingStatus,
} from './rideLifecycle';

export interface RideSearchParams {
  from?: string;
  to?: string;
  date?: string;
  seats?: number;
}

export interface RideBookingParams {
  rideId: string;
  passengerId: string;
  passengerName: string;
  seatsRequested: number;
  from: string;
  to: string;
  date: string;
  time: string;
  driverName: string;
  pricePerSeat: number;
}

export interface RideOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class UnifiedRideService {
  /**
   * Search for available rides
   */
  async searchRides(params: RideSearchParams): Promise<RideOperationResult<TripSearchResult[]>> {
    try {
      logger.rideEvent('ride_search_started', params);

      const results = await tripsAPI.searchTrips(
        params.from,
        params.to,
        params.date,
        params.seats
      );

      logger.rideEvent('ride_search_completed', {
        ...params,
        resultCount: results.length,
      });

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      logger.error('Ride search failed', {
        params,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search rides',
      };
    }
  }

  /**
   * Get ride details by ID
   */
  async getRideById(rideId: string): Promise<RideOperationResult<TripSearchResult>> {
    try {
      logger.rideEvent('ride_fetch_started', { rideId });

      const ride = await tripsAPI.getTripById(rideId);

      logger.rideEvent('ride_fetch_completed', { rideId });

      return {
        success: true,
        data: ride,
      };
    } catch (error) {
      logger.error('Ride fetch failed', {
        rideId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ride',
      };
    }
  }

  /**
   * Create a new ride (driver offering)
   */
  async createRide(rideData: TripCreatePayload): Promise<RideOperationResult<TripSearchResult>> {
    try {
      logger.rideEvent('ride_creation_started', {
        from: rideData.from,
        to: rideData.to,
        date: rideData.date,
        seats: rideData.seats,
      });

      const ride = await tripsAPI.createTrip(rideData);

      logger.rideEvent('ride_creation_completed', {
        rideId: ride.id,
        from: rideData.from,
        to: rideData.to,
      });

      return {
        success: true,
        data: ride,
      };
    } catch (error) {
      logger.error('Ride creation failed', {
        rideData,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create ride',
      };
    }
  }

  /**
   * Book a ride (passenger booking)
   */
  async bookRide(params: RideBookingParams): Promise<RideOperationResult<RideBookingRecord>> {
    try {
      logger.rideEvent('ride_booking_started', {
        rideId: params.rideId,
        passengerId: params.passengerId,
        seatsRequested: params.seatsRequested,
      });

      // Create local booking record
      const booking = createRideBooking({
        rideId: params.rideId,
        passengerId: params.passengerId,
        from: params.from,
        to: params.to,
        date: params.date,
        time: params.time,
        driverName: params.driverName,
        passengerName: params.passengerName,
        seatsRequested: params.seatsRequested,
        pricePerSeatJod: params.pricePerSeat,
        routeMode: 'network_inventory',
      });

      // Sync with backend
      try {
        await bookingsAPI.createBooking(
          params.rideId,
          params.seatsRequested,
          params.from,
          params.to,
          {
            price_per_seat: params.pricePerSeat,
            total_price: params.pricePerSeat * params.seatsRequested,
          }
        );
      } catch (backendError) {
        logger.warn('Backend booking sync failed, using local record', {
          bookingId: booking.id,
          error: backendError instanceof Error ? backendError.message : String(backendError),
        });
      }

      logger.rideEvent('ride_booking_completed', {
        bookingId: booking.id,
        rideId: params.rideId,
        status: booking.status,
      });

      return {
        success: true,
        data: booking,
      };
    } catch (error) {
      logger.error('Ride booking failed', {
        params,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to book ride',
      };
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string,
    status: RideBookingStatus
  ): Promise<RideOperationResult<RideBookingRecord>> {
    try {
      logger.rideEvent('booking_status_update_started', {
        bookingId,
        status,
      });

      const updated = updateRideBooking(bookingId, { status });

      if (!updated) {
        throw new Error('Booking not found');
      }

      // Sync with backend
      try {
        const backendStatus = status === 'confirmed' ? 'accepted' : 
                             status === 'rejected' ? 'rejected' : 
                             status === 'cancelled' ? 'cancelled' : 'accepted';
        
        await bookingsAPI.updateBookingStatus(bookingId, backendStatus as any);
      } catch (backendError) {
        logger.warn('Backend status sync failed', {
          bookingId,
          error: backendError instanceof Error ? backendError.message : String(backendError),
        });
      }

      logger.rideEvent('booking_status_update_completed', {
        bookingId,
        status: updated.status,
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      logger.error('Booking status update failed', {
        bookingId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update booking',
      };
    }
  }

  /**
   * Get all bookings for a user
   */
  async getUserBookings(userId: string): Promise<RideOperationResult<RideBookingRecord[]>> {
    try {
      logger.rideEvent('user_bookings_fetch_started', { userId });

      // Hydrate from backend
      await hydrateRideBookings(userId);

      // Get local bookings
      const bookings = getRideBookings();

      logger.rideEvent('user_bookings_fetch_completed', {
        userId,
        bookingCount: bookings.length,
      });

      return {
        success: true,
        data: bookings,
      };
    } catch (error) {
      logger.error('User bookings fetch failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bookings',
      };
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<RideOperationResult<RideBookingRecord>> {
    return this.updateBookingStatus(bookingId, 'cancelled');
  }

  /**
   * Confirm a booking (driver accepting)
   */
  async confirmBooking(bookingId: string): Promise<RideOperationResult<RideBookingRecord>> {
    return this.updateBookingStatus(bookingId, 'confirmed');
  }

  /**
   * Reject a booking (driver declining)
   */
  async rejectBooking(bookingId: string): Promise<RideOperationResult<RideBookingRecord>> {
    return this.updateBookingStatus(bookingId, 'rejected');
  }

  /**
   * Complete a booking (ride finished)
   */
  async completeBooking(bookingId: string): Promise<RideOperationResult<RideBookingRecord>> {
    return this.updateBookingStatus(bookingId, 'completed');
  }

  /**
   * Get driver's trips
   */
  async getDriverTrips(): Promise<RideOperationResult<TripSearchResult[]>> {
    try {
      logger.rideEvent('driver_trips_fetch_started');

      const trips = await tripsAPI.getDriverTrips();

      logger.rideEvent('driver_trips_fetch_completed', {
        tripCount: trips.length,
      });

      return {
        success: true,
        data: trips,
      };
    } catch (error) {
      logger.error('Driver trips fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch driver trips',
      };
    }
  }

  /**
   * Delete a ride
   */
  async deleteRide(rideId: string): Promise<RideOperationResult<void>> {
    try {
      logger.rideEvent('ride_deletion_started', { rideId });

      await tripsAPI.deleteTrip(rideId);

      logger.rideEvent('ride_deletion_completed', { rideId });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Ride deletion failed', {
        rideId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete ride',
      };
    }
  }
}

export const unifiedRideService = new UnifiedRideService();
