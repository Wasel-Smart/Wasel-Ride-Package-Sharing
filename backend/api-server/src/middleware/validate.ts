import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errors.js';

export function validate(schema: { parse: (input: unknown) => unknown }) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body) as typeof req.body;
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request body';
      next(new ValidationError(message, { cause: err instanceof Error ? err.message : String(err) }));
    }
  };
}

export function validateQuery(schema: { parse: (input: unknown) => unknown }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid query parameters';
      next(new ValidationError(message, { cause: err instanceof Error ? err.message : String(err) }));
    }
  };
}
