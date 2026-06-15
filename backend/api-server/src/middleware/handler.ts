import type { Request, Response, NextFunction } from 'express';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: 'not_found', message: 'Endpoint not found' },
    metadata: { timestamp: new Date().toISOString(), version: 'v1' },
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as Request & { requestId?: string }).requestId ?? 'unknown';
  const status = err instanceof Error && 'statusCode' in err ? (err as unknown as { statusCode: number }).statusCode : 500;
  const code = err instanceof Error && 'code' in err ? (err as unknown as { code: string }).code : 'internal_error';
  const message = err instanceof Error && 'message' in err ? (err as Error).message : 'Internal server error';

  res.status(status).json({
    success: false,
    error: { code, message },
    metadata: { requestId, timestamp: new Date().toISOString(), version: 'v1', traceId: req.headers['x-trace-id'] ?? undefined },
  });
}
