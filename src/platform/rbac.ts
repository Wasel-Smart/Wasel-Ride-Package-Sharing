export type AccessRole = 'admin' | 'driver' | 'user' | 'operator';

export type AccessPermission =
  | 'rides:read'
  | 'rides:write'
  | 'rides:assign'
  | 'packages:read'
  | 'packages:write'
  | 'packages:assign'
  | 'payments:read'
  | 'payments:write'
  | 'operations:read'
  | 'trust:moderate';

const ROLE_PERMISSIONS: Record<AccessRole, readonly AccessPermission[]> = {
  admin: [
    'rides:read',
    'rides:write',
    'rides:assign',
    'packages:read',
    'packages:write',
    'packages:assign',
    'payments:read',
    'payments:write',
    'operations:read',
    'trust:moderate',
  ],
  driver: [
    'rides:read',
    'rides:write',
    'packages:read',
    'packages:write',
    'payments:read',
  ],
  user: [
    'rides:read',
    'rides:write',
    'packages:read',
    'packages:write',
    'payments:read',
  ],
  operator: [
    'rides:read',
    'rides:assign',
    'packages:read',
    'packages:assign',
    'payments:read',
    'operations:read',
    'trust:moderate',
  ],
};

export function hasPermission(role: AccessRole, permission: AccessPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertPermission(role: AccessRole, permission: AccessPermission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Role ${role} is not allowed to perform ${permission}`);
  }
}
