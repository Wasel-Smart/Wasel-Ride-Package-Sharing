import { busRepository } from '../repositories/busRepository.js';
import { NotFoundError, ValidationError } from '@wasel/backend-shared/errors/app-errors';
export class BusService {
    async searchRoutes(originCity, destinationCity) {
        return busRepository.findRoutes(originCity, destinationCity);
    }
    async getRouteSchedules(routeId, date) {
        const route = await busRepository.findRouteById(routeId);
        if (!route) {
            throw new NotFoundError('Bus route');
        }
        return busRepository.findSchedules(routeId, date);
    }
    async bookSeat(scheduleId, passengerId, seats) {
        if (seats < 1 || seats > 10) {
            throw new ValidationError('Number of seats must be between 1 and 10');
        }
        const booking = await busRepository.createBooking(scheduleId, passengerId, seats);
        return booking;
    }
    async cancelBooking(bookingId) {
        const booking = await busRepository.findBookingById(bookingId);
        if (!booking) {
            throw new NotFoundError('Bus booking');
        }
        if (booking.status !== 'confirmed') {
            throw new ValidationError('Booking cannot be cancelled at this stage');
        }
        return busRepository.updateBookingStatus(bookingId, 'cancelled');
    }
}
export const busService = new BusService();
