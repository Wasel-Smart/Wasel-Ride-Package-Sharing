import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = (err as unknown as { statusCode?: number }).statusCode || 500;
  const code = (err as unknown as { code?: string }).code || 'internal_error';
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: { code, message },
    meta: { timestamp: new Date().toISOString() },
  });
}
