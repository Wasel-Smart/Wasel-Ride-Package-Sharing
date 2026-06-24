import { tripRepository } from '../repositories/tripRepository.js';
import { packageRepository } from '../repositories/packageRepository.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  InternalError,
} from '@wasel/backend-shared/errors/app-errors';

export class TripService {
  async searchTrips(filters: {
    originCity?: string;
    destinationCity?: string;
    departureDate?: string;
    seats?: number;
    page: number;
    limit: number;
  }) {
    return tripRepository.findAvailableTrips(filters);
  }

  async getTripDetails(tripId: string) {
    const trip = await tripRepository.findTripById(tripId);
    if (!trip) {
      throw new NotFoundError('Trip');
    }
    const bookings = await tripRepository.findBookingsByTripId(tripId);
    return { ...trip, bookings };
  }

  async createTrip(input: {
    mode: string;
    driverId?: string;
    createdBy: string;
    originCity: string;
    originCoords: { lat: number; lng: number };
    destinationCity: string;
    destinationCoords: { lat: number; lng: number };
    departureTime: string;
    availableSeats: number;
    pricePerSeat?: number;
    allowPackages?: boolean;
    packageCapacityKg?: number;
    notes?: string;
  }) {
    if (input.departureTime < new Date().toISOString()) {
      throw new ValidationError('Departure time must be in the future');
    }

    if (input.availableSeats < 1 || input.availableSeats > 8) {
      throw new ValidationError('Available seats must be between 1 and 8');
    }

    const trip = await tripRepository.createTrip({
      mode: input.mode as 'carpooling' | 'on_demand' | 'scheduled' | 'package' | 'return',
      driverId: input.driverId,
      createdBy: input.createdBy,
      originCity: input.originCity,
      originCoords: input.originCoords,
      destinationCity: input.destinationCity,
      destinationCoords: input.destinationCoords,
      departureTime: input.departureTime,
      availableSeats: input.availableSeats,
      pricePerSeat: input.pricePerSeat,
      allowPackages: input.allowPackages,
      packageCapacityKg: input.packageCapacityKg,
      notes: input.notes,
    });

    return trip;
  }

  async bookTrip(tripId: string, passengerId: string, seatsBooked: number, pricePaid: number) {
    if (seatsBooked < 1) {
      throw new ValidationError('At least one seat must be booked');
    }

    const booking = await tripRepository.createBooking({
      tripId,
      passengerId,
      seatsBooked,
      pricePaid,
    });

    return booking;
  }

  async updateTripStatus(tripId: string, driverId: string, status: string) {
    const trip = await tripRepository.findTripById(tripId);
    if (!trip) {
      throw new NotFoundError('Trip');
    }

    if (trip.driver_id !== driverId && trip.created_by !== driverId) {
      throw new ValidationError('Only the trip owner can update status');
    }

    const allowedTransitions: Record<string, string[]> = {
      posted: ['open', 'cancelled'],
      open: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
    };

    const validStatuses = allowedTransitions[trip.status] || [];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Cannot transition from ${trip.status} to ${status}`);
    }

    return tripRepository.updateTripStatus(tripId, status, driverId);
  }

  async cancelBooking(bookingId: string, userId: string) {
    const booking = await tripRepository.findBookingById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.passenger_id !== userId) {
      throw new ValidationError('Only the passenger can cancel their booking');
    }

    if (booking.status !== 'booked' && booking.status !== 'confirmed') {
      throw new ValidationError('Booking cannot be cancelled at this stage');
    }

    const cancelledBooking = await tripRepository.updateBookingStatus(bookingId, 'cancelled');

    return cancelledBooking;
  }
}

export const tripService = new TripService();
