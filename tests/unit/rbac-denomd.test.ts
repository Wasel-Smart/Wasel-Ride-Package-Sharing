import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  assertPermission,
  resolveAccessRole,
  userHasPermission,
  getRolePermissions,
  getRolesWithPermission,
  type AccessRole,
  type AccessPermission,
} from '$deno/_shared/rbac.ts';

const ALL_ROLES: AccessRole[] = [
  'admin', 'finance', 'trust', 'support', 'operator', 'driver', 'user',
  'corporate', 'school', 'medical', 'package_agent', 'bus_operator', 'guest', 'service',
];

const SENSITIVE: AccessPermission[] = [
  'payments:write', 'payments:refund', 'payments:payout', 'payments:reconcile',
  'trust:ban', 'users:impersonate', 'config:write',
  'rides:price_override', 'rides:cancel_any',
];

const LOW_TRUST: AccessRole[] = ['guest', 'user', 'driver', 'package_agent'];

describe('RBAC (Deno) — role coverage', () => {
  it('defines exactly 14 roles', () => {
    expect(ALL_ROLES).toHaveLength(14);
  });

  it.each(ALL_ROLES)('role %s has at least one permission', (role) => {
    expect(getRolePermissions(role).length).toBeGreaterThan(0);
  });
});

describe('RBAC (Deno) — admin completeness', () => {
  it.each(SENSITIVE)('admin has sensitive permission %s', (perm) => {
    expect(hasPermission('admin', perm)).toBe(true);
  });

  it('admin has all payment permissions', () => {
    const paymentPerms: AccessPermission[] = [
      'payments:read', 'payments:write', 'payments:refund', 'payments:payout', 'payments:reconcile',
    ];
    for (const p of paymentPerms) {
      expect(hasPermission('admin', p)).toBe(true);
    }
  });
});

describe('RBAC (Deno) — sensitive permission isolation', () => {
  it.each(LOW_TRUST)('low-trust role %s has no payment:write', (role) => {
    expect(hasPermission(role, 'payments:write')).toBe(false);
  });

  it.each(LOW_TRUST)('low-trust role %s has no trust:ban', (role) => {
    expect(hasPermission(role, 'trust:ban')).toBe(false);
  });

  it.each(LOW_TRUST)('low-trust role %s has no users:impersonate', (role) => {
    expect(hasPermission(role, 'users:impersonate')).toBe(false);
  });

  it.each(LOW_TRUST)('low-trust role %s has no config:write', (role) => {
    expect(hasPermission(role, 'config:write')).toBe(false);
  });

  it.each(LOW_TRUST)('low-trust role %s has no rides:price_override', (role) => {
    expect(hasPermission(role, 'rides:price_override')).toBe(false);
  });
});

describe('RBAC (Deno) — guest role', () => {
  const WRITE_PERMS: AccessPermission[] = [
    'rides:write', 'packages:write', 'payments:write', 'operations:write',
    'trust:moderate', 'trust:ban', 'disputes:write', 'support:write',
    'users:write', 'notifications:send', 'bus:write', 'config:write',
  ];

  it.each(WRITE_PERMS)('guest does NOT have write permission %s', (perm) => {
    expect(hasPermission('guest', perm)).toBe(false);
  });

  it('guest can read rides', () => {
    expect(hasPermission('guest', 'rides:read')).toBe(true);
  });

  it('guest can read bus', () => {
    expect(hasPermission('guest', 'bus:read')).toBe(true);
  });
});

describe('RBAC (Deno) — service role', () => {
  const BLOCKED: AccessPermission[] = [
    'rides:write', 'packages:write', 'payments:write', 'trust:ban', 'users:write',
    'users:impersonate', 'config:write',
  ];

  it.each(BLOCKED)('service does NOT have user-facing write %s', (perm) => {
    expect(hasPermission('service', perm)).toBe(false);
  });

  it('service can publish events', () => {
    expect(hasPermission('service', 'events:publish')).toBe(true);
  });

  it('service can consume events', () => {
    expect(hasPermission('service', 'events:consume')).toBe(true);
  });
});

describe('RBAC (Deno) — finance role', () => {
  const BLOCKED: AccessPermission[] = [
    'trust:moderate', 'trust:ban', 'identity:review', 'users:impersonate',
    'rides:write', 'packages:write', 'operations:write',
  ];

  it.each(BLOCKED)('finance does NOT have %s', (perm) => {
    expect(hasPermission('finance', perm)).toBe(false);
  });

  it('finance can reconcile payments', () => {
    expect(hasPermission('finance', 'payments:reconcile')).toBe(true);
  });

  it('finance can export analytics', () => {
    expect(hasPermission('finance', 'analytics:export')).toBe(true);
  });
});

describe('RBAC (Deno) — trust role', () => {
  it('trust can ban users', () => {
    expect(hasPermission('trust', 'trust:ban')).toBe(true);
  });

  it('trust can review identity', () => {
    expect(hasPermission('trust', 'identity:review')).toBe(true);
  });

  it('trust cannot write payments', () => {
    expect(hasPermission('trust', 'payments:write')).toBe(false);
  });

  it('trust cannot impersonate users', () => {
    expect(hasPermission('trust', 'users:impersonate')).toBe(false);
  });
});

describe('RBAC (Deno) — operator role', () => {
  it('operator can manage fleet', () => {
    expect(hasPermission('operator', 'fleet:manage')).toBe(true);
  });

  it('operator can manage corridors', () => {
    expect(hasPermission('operator', 'corridors:manage')).toBe(true);
  });

  it('operator cannot write payments', () => {
    expect(hasPermission('operator', 'payments:write')).toBe(false);
  });

  it('operator cannot ban users', () => {
    expect(hasPermission('operator', 'trust:ban')).toBe(false);
  });
});

describe('RBAC (Deno) — specialised roles', () => {
  it('school role has school:write', () => {
    expect(hasPermission('school', 'school:write')).toBe(true);
  });

  it('school role cannot access medical', () => {
    expect(hasPermission('school', 'medical:write')).toBe(false);
  });

  it('medical role has medical:write', () => {
    expect(hasPermission('medical', 'medical:write')).toBe(true);
  });

  it('medical role cannot access school', () => {
    expect(hasPermission('medical', 'school:write')).toBe(false);
  });

  it('package_agent cannot book rides', () => {
    expect(hasPermission('package_agent', 'rides:write')).toBe(false);
  });

  it('bus_operator can manage schedules', () => {
    expect(hasPermission('bus_operator', 'bus:manage_schedules')).toBe(true);
  });

  it('bus_operator cannot write payments', () => {
    expect(hasPermission('bus_operator', 'payments:write')).toBe(false);
  });

  it('corporate has corporate:write', () => {
    expect(hasPermission('corporate', 'corporate:write')).toBe(true);
  });

  it('corporate can read analytics', () => {
    expect(hasPermission('corporate', 'analytics:read')).toBe(true);
  });
});

describe('RBAC (Deno) — assertPermission', () => {
  it('does not throw when permission is granted', () => {
    expect(() => assertPermission('admin', 'payments:write')).not.toThrow();
  });

  it('throws when permission is denied', () => {
    expect(() => assertPermission('guest', 'payments:write')).toThrow(
      "Role 'guest' is not allowed to perform 'payments:write'",
    );
  });

  it('throws with correct message format', () => {
    expect(() => assertPermission('driver', 'trust:ban')).toThrow(/Role 'driver'/);
  });
});

describe('RBAC (Deno) — resolveAccessRole', () => {
  it('returns guest for undefined', () => {
    expect(resolveAccessRole(undefined)).toBe('guest');
  });

  it('returns guest for empty string', () => {
    expect(resolveAccessRole('')).toBe('guest');
  });

  it('fails closed to guest for an unrecognised role string', () => {
    // Fail-closed by design: an unmapped role string must never silently
    // inherit 'user' write permissions. See rbac.ts resolveAccessRole().
    expect(resolveAccessRole('superuser')).toBe('guest');
    expect(resolveAccessRole('moderator')).toBe('guest');
  });

  it.each(ALL_ROLES)('passes through valid role %s unchanged', (role) => {
    expect(resolveAccessRole(role)).toBe(role);
  });
});

describe('RBAC (Deno) — userHasPermission', () => {
  it('returns false for undefined role on sensitive permission', () => {
    expect(userHasPermission(undefined, 'payments:write')).toBe(false);
  });

  it('returns true for admin on any permission', () => {
    expect(userHasPermission('admin', 'users:impersonate')).toBe(true);
  });

  it('returns false for unknown role on sensitive permission', () => {
    expect(userHasPermission('hacker', 'payments:write')).toBe(false);
  });

  it('returns true for user on rides:read', () => {
    expect(userHasPermission('user', 'rides:read')).toBe(true);
  });
});

describe('RBAC (Deno) — getRolesWithPermission', () => {
  it('only admin has users:impersonate', () => {
    expect(getRolesWithPermission('users:impersonate')).toEqual(['admin']);
  });

  it('only admin has config:write', () => {
    expect(getRolesWithPermission('config:write')).toEqual(['admin']);
  });

  it('only admin has rides:price_override', () => {
    expect(getRolesWithPermission('rides:price_override')).toEqual(['admin']);
  });

  it('multiple roles have rides:read', () => {
    const roles = getRolesWithPermission('rides:read');
    expect(roles.length).toBeGreaterThan(5);
    expect(roles).toContain('admin');
    expect(roles).toContain('driver');
    expect(roles).toContain('user');
    expect(roles).not.toContain('package_agent');
  });

  it('finance and admin have payments:reconcile', () => {
    const roles = getRolesWithPermission('payments:reconcile');
    expect(roles).toContain('admin');
    expect(roles).toContain('finance');
    expect(roles).not.toContain('driver');
    expect(roles).not.toContain('user');
  });
});

describe('RBAC (Deno) — no privilege escalation', () => {
  it('no low-trust role has any sensitive permission', () => {
    for (const role of LOW_TRUST) {
      for (const perm of SENSITIVE) {
        expect(
          hasPermission(role, perm),
          `${role} should NOT have ${perm}`,
        ).toBe(false);
      }
    }
  });

  it('support role cannot escalate to payment writes', () => {
    const paymentWrites: AccessPermission[] = [
      'payments:write', 'payments:refund', 'payments:payout', 'payments:reconcile',
    ];
    for (const p of paymentWrites) {
      expect(hasPermission('support', p)).toBe(false);
    }
  });

  it('driver cannot access operations or trust', () => {
    const blocked: AccessPermission[] = [
      'operations:read', 'operations:write', 'fleet:manage',
      'trust:moderate', 'trust:ban', 'identity:review',
    ];
    for (const p of blocked) {
      expect(hasPermission('driver', p)).toBe(false);
    }
  });
});

describe('RBAC (Deno) — backend enforcement patterns', () => {
  it('admin can manage user profiles via users:write', () => {
    expect(hasPermission(resolveAccessRole('admin'), 'users:write')).toBe(true);
    expect(hasPermission(resolveAccessRole('user'), 'users:write')).toBe(false);
  });

  it('admin can cancel rides via rides:cancel_any', () => {
    expect(hasPermission(resolveAccessRole('admin'), 'rides:cancel_any')).toBe(true);
    expect(hasPermission(resolveAccessRole('user'), 'rides:cancel_any')).toBe(false);
  });

  it('trust can moderate ratings via trust:moderate', () => {
    expect(hasPermission(resolveAccessRole('trust'), 'trust:moderate')).toBe(true);
    expect(hasPermission(resolveAccessRole('user'), 'trust:moderate')).toBe(false);
  });

  it('finance has payments:read for wallet access', () => {
    expect(hasPermission(resolveAccessRole('finance'), 'payments:read')).toBe(true);
  });

  it('admin has users:impersonate for admin routes', () => {
    expect(hasPermission(resolveAccessRole('admin'), 'users:impersonate')).toBe(true);
    expect(hasPermission(resolveAccessRole('support'), 'users:impersonate')).toBe(false);
  });

  it('admin can cancel packages via packages:cancel_any', () => {
    expect(hasPermission(resolveAccessRole('admin'), 'packages:cancel_any')).toBe(true);
    expect(hasPermission(resolveAccessRole('user'), 'packages:cancel_any')).toBe(false);
  });
});

describe('RBAC (Deno) — backward compatibility for unknown roles', () => {
  it('unknown role defaults to guest-level (read-only) permissions', () => {
    expect(hasPermission(resolveAccessRole('superadmin'), 'rides:read')).toBe(true);
    expect(hasPermission(resolveAccessRole('superadmin'), 'payments:write')).toBe(false);
  });

  it('undefined role defaults to guest permissions', () => {
    expect(hasPermission(resolveAccessRole(undefined), 'rides:read')).toBe(true);
    expect(hasPermission(resolveAccessRole(undefined), 'payments:write')).toBe(false);
  });

  it('case-sensitive role matching', () => {
    // Role matching is case-sensitive; 'ADMIN'/'Admin' are unrecognised
    // strings and must fail closed to 'guest', not silently pass as admin
    // or fall open to 'user'.
    expect(resolveAccessRole('ADMIN')).toBe('guest');
    expect(resolveAccessRole('Admin')).toBe('guest');
    expect(resolveAccessRole('admin')).toBe('admin');
  });
});
