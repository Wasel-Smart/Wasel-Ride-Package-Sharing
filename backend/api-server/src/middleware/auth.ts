import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@wasel/backend-shared/errors/app-errors';
import jwt from 'jsonwebtoken';
import { loadConfig } from '@wasel/backend-shared/config';
import { getDb } from '@wasel/backend-shared/db';

const config = loadConfig();

interface JWTPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

const allowedRoles = new Set(['passenger', 'driver', 'operator', 'admin']);

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

    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch {
      return next(new UnauthorizedError('Invalid or expired token'));
    }

    if (!payload.sub || !allowedRoles.has(payload.role)) {
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

    if (user.role !== payload.role) {
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

export function requireRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as unknown as { user?: { id: string; role: string } }).user;
    if (!user) {
      return next(new UnauthorizedError('No user context'));
    }
    if (!allowedRoles.includes(user.role)) {
      return next(new ForbiddenError(`Role '${user.role}' is not authorized`));
    }
    next();
  };
}
