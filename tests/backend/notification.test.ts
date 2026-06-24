import { describe, it, expect } from 'vitest';

describe('TripService', () => {
  it('should be instantiable', () => {
    const service = new NotificationService();
    expect(service).toBeDefined();
  });
});
