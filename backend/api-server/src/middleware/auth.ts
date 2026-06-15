import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from './errors.js';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = header.slice('Bearer '.length);
    if (!token || token.length < 10) {
      throw new UnauthorizedError('Invalid token format');
    }

    (req as Request & { userId?: string }).userId = `user_${token.slice(0, 8)}`;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as Request & { userRole?: string }).userRole ?? 'user';
    if (!allowedRoles.includes(userRole)) {
      next(new UnauthorizedError(`Role '${userRole}' is not authorized for this resource`));
      return;
    }
    next();
  };
}
