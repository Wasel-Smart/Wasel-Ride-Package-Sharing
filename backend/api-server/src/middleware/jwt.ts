import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

export function createJWTAuthMiddleware(secret: string) {
  return function authenticate(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next(new Error('Missing authorization header'));
    }

    const token = header.slice('Bearer '.length);
    if (!token) {
      return next(new Error('Empty token'));
    }

    try {
      const payload = jwt.verify(token, secret) as JWTPayload;
      (req as unknown as { user: { id: string; role: string } }).user = {
        id: payload.sub,
        role: payload.role,
      };
      next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  };
}

export function generateTokens(userId: string, role: string, secret: string, accessExpiry: number, refreshExpiry: number) {
  const accessToken = jwt.sign({ sub: userId, role }, secret, { expiresIn: `${accessExpiry}s` });
  const refreshToken = jwt.sign({ sub: userId, role }, secret, { expiresIn: `${refreshExpiry}s` });
  return { accessToken, refreshToken };
}
