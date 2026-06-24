export { authenticate, requireRole } from './auth.js';
export type {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  DatabaseError,
} from '@wasel/backend-shared/errors/app-errors';
export { validate, validateQuery } from './validate.js';
