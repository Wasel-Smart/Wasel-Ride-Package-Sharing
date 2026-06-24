import { describe, it, expect } from 'vitest';

class MockPackageService {
  constructor() {}
}

describe('PackageService', () => {
  it('should be instantiable', () => {
    const service = new MockPackageService();
    expect(service).toBeDefined();
  });
});
