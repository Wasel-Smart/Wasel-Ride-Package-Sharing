export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(options: {
    message: string;
    statusCode?: number;
    code?: string;
    isOperational?: boolean;
    cause?: Error;
    context?: Record<string, unknown>;
  }) {
    super(options.message, { cause: options.cause });
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.isOperational = options.isOperational ?? true;
    this.context = options.context;
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      context,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super({
      message,
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super({
      message,
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super({
      message,
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super({
      message,
      statusCode: 409,
      code: 'CONFLICT',
    });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfterMs?: number) {
    super({
      message,
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      context: retryAfterMs !== undefined ? { retryAfterMs } : undefined,
    });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, cause?: Error) {
    super({
      message: `External service ${service} error`,
      statusCode: 502,
      code: 'EXTERNAL_SERVICE_ERROR',
      isOperational: false,
      cause,
    });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, cause?: Error) {
    super({
      message,
      statusCode: 500,
      code: 'DATABASE_ERROR',
      isOperational: false,
      cause,
    });
  }
}
