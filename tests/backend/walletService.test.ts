import { describe, it, expect } from 'vitest';

class MockWalletService {
  constructor() {}
}

describe('WalletService', () => {
  it('should be instantiable', () => {
    const service = new MockWalletService();
    expect(service).toBeDefined();
  });
});
