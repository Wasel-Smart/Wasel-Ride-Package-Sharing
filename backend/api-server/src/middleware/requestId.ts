import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestId(req: Request, res: Response, next: NextFunction) {
  (req as Request & { requestId?: string }).requestId = randomUUID();
  (res as Response & { requestId?: string }).requestId = (req as Request & { requestId?: string }).requestId;
  res.setHeader('x-request-id', (req as Request & { requestId?: string }).requestId);
  next();
}
