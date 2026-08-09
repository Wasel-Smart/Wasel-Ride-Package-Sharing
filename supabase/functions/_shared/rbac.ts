/**
 * Wasel RBAC — 14-role security model (Deno-compatible)
 *
 * Roles map to the platform's actual actor surfaces:
 *   Riders, Drivers, Operators, Admins, Finance, Trust, Support,
 *   Corporate, School, Medical, Package, Bus, Guest, and Service accounts.
 *
 * Every permission is additive — no role inherits from another at runtime.
 * Use resolveAccessRole() to map raw DB strings to canonical AccessRole values.
 */

export type AccessRole =
  | 'admin'
  | 'finance'
  | 'trust'
  | 'support'
  | 'operator'
  | 'driver'
  | 'user'
  | 'corporate'
  | 'school'
  | 'medical'
  | 'package_agent'
  | 'bus_operator'
  | 'guest'
  | 'service';

export type AccessPermission =
  | 'rides:read'
  | 'rides:write'
  | 'rides:assign'
  | 'rides:cancel_any'
  | 'rides:price_override'
  | 'packages:read'
  | 'packages:write'
  | 'packages:assign'
  | 'packages:cancel_any'
  | 'payments:read'
  | 'payments:write'
  | 'payments:refund'
  | 'payments:payout'
  | 'payments:reconcile'
  | 'operations:read'
  | 'operations:write'
  | 'fleet:manage'
  | 'corridors:manage'
  | 'trust:read'
  | 'trust:moderate'
  | 'trust:ban'
  | 'identity:review'
  | 'disputes:read'
  | 'disputes:write'
  | 'support:read'
  | 'support:write'
  | 'users:read'
  | 'users:write'
  | 'users:impersonate'
  | 'notifications:read'
  | 'notifications:send'
  | 'bus:read'
  | 'bus:write'
  | 'bus:manage_schedules'
  | 'corporate:read'
  | 'corporate:write'
  | 'school:read'
  | 'school:write'
  | 'medical:read'
  | 'medical:write'
  | 'analytics:read'
  | 'analytics:export'
  | 'events:publish'
  | 'events:consume'
  | 'config:read'
  | 'config:write';

const ROLE_PERMISSIONS: Record<AccessRole, readonly AccessPermission[]> = {
  admin: [
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
  ],

  finance: [
    'payments:read', 'payments:write', 'payments:refund', 'payments:payout', 'payments:reconcile',
    'rides:read', 'packages:read', 'bus:read',
    'users:read',
    'analytics:read', 'analytics:export',
    'notifications:read',
    'config:read',
  ],

  trust: [
    'trust:read', 'trust:moderate', 'trust:ban', 'identity:review',
    'users:read', 'users:write',
    'rides:read', 'packages:read',
    'disputes:read', 'disputes:write',
    'support:read',
    'notifications:read', 'notifications:send',
    'analytics:read',
  ],

  support: [
    'rides:read', 'packages:read', 'bus:read',
    'payments:read',
    'disputes:read', 'disputes:write',
    'support:read', 'support:write',
    'users:read',
    'trust:read',
    'notifications:read',
  ],

  operator: [
    'rides:read', 'rides:assign',
    'packages:read', 'packages:assign',
    'payments:read',
    'operations:read', 'operations:write',
    'fleet:manage', 'corridors:manage',
    'trust:read', 'trust:moderate',
    'bus:read', 'bus:write',
    'notifications:read', 'notifications:send',
    'analytics:read',
  ],

  driver: [
    'rides:read', 'rides:write',
    'packages:read', 'packages:write',
    'payments:read',
    'notifications:read',
  ],

  user: [
    'rides:read', 'rides:write',
    'packages:read', 'packages:write',
    'payments:read',
    'bus:read',
    'notifications:read',
  ],

  corporate: [
    'rides:read', 'rides:write',
    'packages:read', 'packages:write',
    'payments:read',
    'bus:read',
    'corporate:read', 'corporate:write',
    'notifications:read',
    'analytics:read',
  ],

  school: [
    'rides:read', 'rides:write',
    'school:read', 'school:write',
    'payments:read',
    'notifications:read',
  ],

  medical: [
    'rides:read', 'rides:write',
    'medical:read', 'medical:write',
    'payments:read',
    'notifications:read',
  ],

  package_agent: [
    'packages:read', 'packages:write',
    'payments:read',
    'notifications:read',
  ],

  bus_operator: [
    'bus:read', 'bus:write', 'bus:manage_schedules',
    'rides:read',
    'payments:read',
    'operations:read',
    'notifications:read',
  ],

  guest: [
    'rides:read',
    'bus:read',
    'config:read',
  ],

  service: [
    'events:publish', 'events:consume',
    'rides:read', 'packages:read',
    'payments:read',
    'notifications:send',
    'config:read',
  ],
};

export function hasPermission(role: AccessRole, permission: AccessPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertPermission(role: AccessRole, permission: AccessPermission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Role '${role}' is not allowed to perform '${permission}'`);
  }
}

export function resolveAccessRole(role: string | undefined): AccessRole {
  const VALID: readonly string[] = [
    'admin', 'finance', 'trust', 'support', 'operator', 'driver', 'user',
    'corporate', 'school', 'medical', 'package_agent', 'bus_operator', 'guest', 'service',
  ];
  if (!role) return 'guest';
  if ((VALID as string[]).includes(role)) return role as AccessRole;
  return 'user';
}

export function userHasPermission(
  role: string | undefined,
  permission: AccessPermission,
): boolean {
  return hasPermission(resolveAccessRole(role), permission);
}

export function getRolePermissions(role: AccessRole): readonly AccessPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function getRolesWithPermission(permission: AccessPermission): AccessRole[] {
  return (Object.keys(ROLE_PERMISSIONS) as AccessRole[]).filter((role) =>
    ROLE_PERMISSIONS[role].includes(permission),
  );
}
