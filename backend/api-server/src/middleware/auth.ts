import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@wasel/backend-shared/errors/app-errors';
import jwt from 'jsonwebtoken';
import { loadConfig } from '@wasel/backend-shared/config';
import { getDb } from '@wasel/backend-shared/db';

const config = loadConfig();

// Supabase JWTs carry the app role in app_metadata.role (or user_metadata.role).
// The top-level `role` claim is always "authenticated" for logged-in users.
interface JWTPayload {
  sub: string;
  role: string;
  app_metadata?: { role?: string };
  user_metadata?: { role?: string };
  iat: number;
  exp: number;
}

const allowedRoles = new Set(['passenger', 'driver', 'operator', 'admin']);

function extractAppRole(payload: JWTPayload): string {
  // Prefer app_metadata.role (set server-side), fall back to user_metadata.role,
  // then fall back to the top-level role claim for non-Supabase tokens.
  return (
    payload.app_metadata?.role ??
    payload.user_metadata?.role ??
    (payload.role !== 'authenticated' ? payload.role : '')
  );
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Missing or invalid authorization header'));
    }

    const token = header.slice('Bearer '.length);
    if (!token) {
      return next(new UnauthorizedError('Empty token'));
    }

    // Try JWT_SECRET first (own tokens), then SUPABASE_JWT_SECRET (Supabase-issued tokens).
    // Set SUPABASE_JWT_SECRET to the value from Supabase Dashboard → Settings → API → JWT Secret.
    const secrets = [
      config.jwt.secret,
      ...(process.env.SUPABASE_JWT_SECRET ? [process.env.SUPABASE_JWT_SECRET] : []),
    ];

    let payload: JWTPayload | null = null;
    for (const secret of secrets) {
      try {
        payload = jwt.verify(token, secret) as JWTPayload;
        break;
      } catch {
        // Try next secret.
      }
    }

    if (!payload) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }

    if (!payload.sub) {
      return next(new UnauthorizedError('Invalid token claims'));
    }

    const db = getDb();
    const users = await db.unsafe(
      'SELECT id, role, is_active FROM users WHERE id = $1 LIMIT 1',
      [payload.sub],
    );
    const user = users[0] as { id: string; role: string; is_active: boolean | null } | undefined;
    if (!user || user.is_active === false) {
      return next(new UnauthorizedError('User is not active'));
    }

    // For Supabase tokens the app role lives in metadata, not the top-level claim.
    // Only enforce role freshness when the token explicitly carries an app role.
    const tokenRole = extractAppRole(payload);
    if (tokenRole && allowedRoles.has(tokenRole) && user.role !== tokenRole) {
      return next(new UnauthorizedError('Token role is stale'));
    }

    (req as unknown as { user: { id: string; role: string } }).user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as unknown as { user?: { id: string; role: string } }).user;
    if (!user) {
      return next(new UnauthorizedError('No user context'));
    }
    if (!roles.includes(user.role)) {
      return next(new ForbiddenError(`Role '${user.role}' is not authorized`));
    }
    next();
  };
}
