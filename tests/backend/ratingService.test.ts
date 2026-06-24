import { describe, it, expect } from 'vitest';

class MockRatingService {
  constructor() {}
}

describe('RatingService', () => {
  it('should be instantiable', () => {
    const service = new MockRatingService();
    expect(service).toBeDefined();
  });
});
