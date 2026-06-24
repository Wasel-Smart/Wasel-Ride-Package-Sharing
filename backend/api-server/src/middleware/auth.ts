import type { Request, Response, NextFunction } from 'express';
import { j base = createJWTAuthMiddleware(config.jwt.secret);
const authenticateMiddleware = base.authenticate as (req: Request, res: Response, next: NextFunction) => void;

export function authenticate(req: Request, res: Response, next: NextFunction) {
  return authenticateMiddleware(req, res, (err?: Error) => {
    if (err) {
      return next(new UnauthorizedError(err.message));
    }
    next();
  });
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
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
