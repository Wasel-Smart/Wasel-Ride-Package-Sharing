export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('validation_error', message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('unauthorized', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('forbidden', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found') {
    super('not_found', message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('conflict', message, 409, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('database_error', message, 500, { cause: cause instanceof Error ? cause.message : String(cause) });
  }
}
