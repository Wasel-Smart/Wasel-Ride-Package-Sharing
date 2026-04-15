import { describe, it, expect } from 'vitest';

describe('import.meta.env check', () => {
  it('import.meta.env is defined', () => {
    expect(import.meta.env).toBeDefined();
    expect(import.meta.env.MODE).toBe('test');
  });
});
