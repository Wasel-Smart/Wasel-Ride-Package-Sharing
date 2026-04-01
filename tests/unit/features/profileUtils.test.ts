import { describe, expect, it } from 'vitest';
import {
  buildProfileExportPayload,
  getProfileInitials,
  normalizeProfilePhone,
} from '@/features/profile/profileUtils';

describe('profileUtils', () => {
  it('builds initials safely from profile names', () => {
    expect(getProfileInitials('Lina Khatib')).toBe('LK');
    expect(getProfileInitials('  wasel  ')).toBe('W');
    expect(getProfileInitials('')).toBe('WU');
  });

  it('normalizes valid profile phone input', () => {
    expect(normalizeProfilePhone('+962 79 123 4567')).toBe('+962791234567');
    expect(normalizeProfilePhone('0791234567')).toBe('+0791234567');
  });

  it('rejects invalid phone input', () => {
    expect(normalizeProfilePhone('abc')).toBeNull();
    expect(normalizeProfilePhone('123')).toBeNull();
  });

  it('builds a stable export payload with defaults', () => {
    expect(buildProfileExportPayload({ name: 'Sara' })).toEqual({
      name: 'Sara',
      email: '',
      phone: '',
      role: 'rider',
      trips: 0,
      rating: 0,
      joinedAt: '',
      verificationLevel: 'level_0',
      trustScore: 0,
      walletStatus: 'active',
    });
  });
});
