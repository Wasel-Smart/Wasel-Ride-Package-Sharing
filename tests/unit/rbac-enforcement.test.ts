import { describe, it, expect } from 'vitest';
import { hasPermission, assertPermission, resolveAccessRole, userHasPermission, getRolePermissions, getRolesWithPermission, type AccessRole, type AccessPermission } from '@/platform/rbac';

describe('rbac-enforcement.test.ts', () => {
  it('admin has all permissions', () => {
    const allPerms: AccessPermission[] = [
      'rides:read', 'rides:write', 'rides:assign', 'rides:cancel_any', 'rides:price_override',
      'packages:read', 'packages:write', 'packages:assign', 'packages:cancel_any',
      'payments:read', 'payments:write', 'payments:refund', 'payments:payout', 'payments:reconcile',
      'operations:read', 'operations:write', 'fleet:manage', 'corridors:manage',
      'trust:read', 'trust:moderate', 'trust:ban', 'identity:review',
      'disputes:read', 'disputes:write', 'support:read', 'support:write',
      'users:read', 'users:write', 'users:impersonate',
      'notifications:read', 'notifications:send',
      'bus:read', 'bus:write', 'bus:manage_schedules',
      'corporate:read', 'corporate:write',
      'school:read', 'school:write',
      'medical:read', 'medical:write',
      'analytics:read', 'analytics:export',
      'events:publish', 'events:consume',
      'config:read', 'config:write',
    ];

    for (const perm of allPerms) {
      expect(hasPermission('admin', perm)).toBe(true);
    }
  });

  it('hasPermission for each role returns valid boolean', () => {
    const roles: AccessRole[] = ['admin', 'finance', 'trust', 'support', 'operator', 'driver', 'user', 'corporate', 'school', 'medical', 'package_agent', 'bus_operator', 'guest', 'service'];
    const perms: AccessPermission[] = ['rides:read', 'payments:write', 'trust:ban', 'events:publish', 'users:impersonate'];

    for (const role of roles) {
      for (const perm of perms) {
        expect(typeof hasPermission(role, perm)).toBe('boolean');
      }
    }
  });

  it('assertPermission throws for unauthorized role', () => {
    expect(() => assertPermission('user', 'payments:write')).toThrow(
      "Role 'user' is not allowed to perform 'payments:write'",
    );
  });

  it('assertPermission passes for authorized role', () => {
    expect(() => assertPermission('admin', 'payments:write')).not.toThrow();
  });

  it('resolveAccessRole maps valid roles', () => {
    const validRoles = ['admin', 'finance', 'trust', 'support', 'operator', 'driver', 'user', 'corporate', 'school', 'medical', 'package_agent', 'bus_operator', 'guest', 'service'] as AccessRole[];
    for (const role of validRoles) {
      expect(resolveAccessRole(role)).toBe(role);
    }
  });

  it('resolveAccessRole falls back to guest for undefined', () => {
    expect(resolveAccessRole(undefined)).toBe('guest');
  });

  it('resolveAccessRole falls back to user for unknown role', () => {
    expect(resolveAccessRole('superadmin')).toBe('user');
  });

  it('userHasPermission treats undefined as guest', () => {
    expect(userHasPermission(undefined, 'payments:write')).toBe(false);
  });

  it('userHasPermission maps raw role strings', () => {
    expect(userHasPermission('driver', 'rides:read')).toBe(true);
    expect(userHasPermission('driver', 'payments:write')).toBe(false);
  });

  it('getRolePermissions returns correct permissions for role', () => {
    const perms = getRolePermissions('driver');
    expect(perms).toContain('rides:read');
    expect(perms).toContain('packages:read');
    expect(perms).not.toContain('payments:write');
  });

  it('getRolesWithPermission returns matching roles', () => {
    const roles = getRolesWithPermission('events:publish');
    expect(roles).toContain('admin');
    expect(roles).toContain('service');
  });

  it('privilege escalation: low-trust roles do not get sensitive permissions', () => {
    const sensitivePerms: AccessPermission[] = ['payments:write', 'trust:ban', 'users:impersonate', 'config:write', 'rides:price_override'];
    const lowTrustRoles: AccessRole[] = ['user', 'driver', 'guest', 'package_agent'];

    for (const role of lowTrustRoles) {
      for (const perm of sensitivePerms) {
        expect(hasPermission(role, perm)).toBe(false);
      }
    }
  });

  it('no low-trust role has any sensitive permission', () => {
    const sensitivePerms: AccessPermission[] = ['payments:write', 'trust:ban', 'users:impersonate', 'config:write', 'rides:price_override'];
    const lowTrustRoles: AccessRole[] = ['support', 'driver', 'user', 'guest', 'package_agent'];

    for (const role of lowTrustRoles) {
      for (const perm of sensitivePerms) {
        expect(hasPermission(role, perm)).toBe(false);
      }
    }
  });

  it('guest only has minimal permissions', () => {
    const guestPerms = getRolePermissions('guest');
    expect(guestPerms).toContain('rides:read');
    expect(guestPerms).toContain('bus:read');
    expect(guestPerms).toContain('config:read');
    expect(guestPerms).not.toContain('rides:write');
    expect(guestPerms).not.toContain('payments:read');
  });

  it('finance has payments and analytics but not rides:write', () => {
    expect(hasPermission('finance', 'payments:reconcile')).toBe(true);
    expect(hasPermission('finance', 'analytics:export')).toBe(true);
    expect(hasPermission('finance', 'rides:write')).toBe(false);
  });

  it('trust has moderation but not payments:write', () => {
    expect(hasPermission('trust', 'trust:ban')).toBe(true);
    expect(hasPermission('trust', 'identity:review')).toBe(true);
    expect(hasPermission('trust', 'payments:write')).toBe(false);
  });

  it('operator has fleet and corridors but not payments:write', () => {
    expect(hasPermission('operator', 'fleet:manage')).toBe(true);
    expect(hasPermission('operator', 'corridors:manage')).toBe(true);
    expect(hasPermission('operator', 'payments:write')).toBe(false);
  });

  it('driver has own rides and packages but not payments:write', () => {
    expect(hasPermission('driver', 'rides:write')).toBe(true);
    expect(hasPermission('driver', 'packages:read')).toBe(true);
    expect(hasPermission('driver', 'payments:write')).toBe(false);
  });

  it('service has events and config:read but not config:write', () => {
    expect(hasPermission('service', 'events:publish')).toBe(true);
    expect(hasPermission('service', 'events:consume')).toBe(true);
    expect(hasPermission('service', 'config:write')).toBe(false);
  });

  it('school and medical roles do not cross permissions', () => {
    expect(hasPermission('school', 'medical:write')).toBe(false);
    expect(hasPermission('medical', 'school:write')).toBe(false);
    expect(hasPermission('school', 'school:write')).toBe(true);
    expect(hasPermission('medical', 'medical:write')).toBe(true);
  });

  it('package_agent cannot access rides', () => {
    expect(hasPermission('package_agent', 'packages:write')).toBe(true);
    expect(hasPermission('package_agent', 'rides:write')).toBe(false);
  });

  it('bus_operator has bus:manage_schedules', () => {
    expect(hasPermission('bus_operator', 'bus:manage_schedules')).toBe(true);
    expect(hasPermission('bus_operator', 'payments:write')).toBe(false);
  });

  it('corporate has corporate:write and analytics:read', () => {
    expect(hasPermission('corporate', 'corporate:write')).toBe(true);
    expect(hasPermission('corporate', 'analytics:read')).toBe(true);
    expect(hasPermission('corporate', 'payments:write')).toBe(false);
  });
});
