import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

  export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = randomUUID();
  (req as Request & { requestId?: string }).requestId = id;
  (res as Response & { requestId?: string }).requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
