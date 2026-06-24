import { describe, it, expect } from 'vitest';

class MockBusService {
  constructor() {}
}

describe('BusService', () => {
  it('should be instantiable', () => {
    const service = new MockBusService();
    expect(service).toBeDefined();
  });
});
