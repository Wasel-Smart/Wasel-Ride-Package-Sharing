/**
 * Encryption Utilities Test Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateSecureId, hashData } from '@/utils/encryption';

describe('Secure ID Generation', () => {
  it('should generate IDs of correct length', () => {
    const id = generateSecureId(32);
    expect(id).toHaveLength(64); // 32 bytes = 64 hex characters
  });

  it('should generate unique IDs', () => {
    const id1 = generateSecureId();
    const id2 = generateSecureId();
    expect(id1).not.toBe(id2);
  });

  it('should only contain hex characters', () => {
    const id = generateSecureId();
    expect(id).toMatch(/^[0-9a-f]+$/);
  });
});

describe('Data Hashing', () => {
  it('should hash data consistently', async () => {
    const data = 'test-data';
    const hash1 = await hashData(data);
    const hash2 = await hashData(data);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different data', async () => {
    const hash1 = await hashData('data1');
    const hash2 = await hashData('data2');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce 64-character hex hash (SHA-256)', async () => {
    const hash = await hashData('test');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});
