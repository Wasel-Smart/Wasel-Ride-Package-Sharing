import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── RBAC Service Integration Tests ───────────────────────────────────────────

describe('RBAC Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports required RBAC functions', async () => {
    const rbac = await import('../../src/platform/rbac');

    expect(typeof rbac.hasPermission).toBe('function');
    expect(typeof rbac.assertPermission).toBe('function');
    expect(typeof rbac.resolveAccessRole).toBe('function');
    expect(typeof rbac.userHasPermission).toBe('function');
  });

  it('resolveAccessRole maps known roles correctly', async () => {
    const { resolveAccessRole } = await import('../../src/platform/rbac');

    expect(resolveAccessRole('admin')).toBe('admin');
    expect(resolveAccessRole('driver')).toBe('driver');
    expect(resolveAccessRole('guest')).toBe('guest');
    // Unknown roles fail closed to 'guest' (least privilege) — see the
    // fail-closed comment on resolveAccessRole in src/platform/rbac.ts.
    expect(resolveAccessRole('unknown_role')).toBe('guest');
    // Undefined falls back to 'guest'
    expect(resolveAccessRole(undefined)).toBe('guest');
  });

  it('getRolesWithPermission returns roles for permission', async () => {
    const { getRolesWithPermission } = await import('../../src/platform/rbac');

    const roles = getRolesWithPermission('rides:read');
    expect(roles.length).toBeGreaterThan(0);
    expect(roles).toContain('admin');
  });

  it('hasPermission checks role permissions correctly', async () => {
    const { hasPermission } = await import('../../src/platform/rbac');

    expect(hasPermission('admin', 'rides:write')).toBe(true);
    expect(hasPermission('guest', 'rides:write')).toBe(false);
    expect(hasPermission('driver', 'rides:read')).toBe(true);
  });
});
