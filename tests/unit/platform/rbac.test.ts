import { describe, expect, it } from 'vitest';
import { assertPermission, hasPermission } from '../../../src/platform/rbac';

describe('rbac', () => {
  it('allows admin capabilities across the platform surface', () => {
    expect(hasPermission('admin', 'rides:assign')).toBe(true);
    expect(hasPermission('admin', 'trust:moderate')).toBe(true);
  });

  it('restricts standard users from ops-only permissions', () => {
    expect(hasPermission('user', 'operations:read')).toBe(false);
    expect(() => assertPermission('user', 'operations:read')).toThrow();
  });
});
