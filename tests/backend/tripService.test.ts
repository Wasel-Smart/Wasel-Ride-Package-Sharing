import { describe, it, expect } from 'vitest';

class MockTripService {
  constructor() {}
}

describe('TripService', () => {
  it('should be instantiable', () => {
    const service = new MockTripService();
    expect(service).toBeDefined();
  });
});
