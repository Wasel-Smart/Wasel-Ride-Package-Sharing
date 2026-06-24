import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from './errors.js';
import jwt from 'jsonwebtoken';
import { config } from '@wasel/backend-shared/config';

interface JWTPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
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

    (req as unknown as { user: { id: string; role: string } }).user = {
      id: payload.sub,
      role: payload.role,
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
