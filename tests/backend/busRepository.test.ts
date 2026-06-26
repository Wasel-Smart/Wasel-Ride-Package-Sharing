import { describe, it, expect, vi } from 'vitest';
import { busRepository } from '../../backend/api-server/src/repositories/busRepository';

describe('BusRepository', () => {
  it('should be instantiable', () => {
    expect(busRepository).toBeDefined();
  });

  it('should have findRoutes method', () => {
    expect(typeof busRepository.findRoutes).toBe('function');
  });

  it('should have findRouteById method', () => {
    expect(typeof busRepository.findRouteById).toBe('function');
  });

  it('should have findSchedules method', () => {
    expect(typeof busRepository.findSchedules).toBe('function');
  });

  it('should have createBooking method', () => {
    expect(typeof busRepository.createBooking).toBe('function');
  });

  it('should have findBookingById method', () => {
    expect(typeof busRepository.findBookingById).toBe('function');
  });

  it('should have updateBookingStatus method', () => {
    expect(typeof busRepository.updateBookingStatus).toBe('function');
  });
});
