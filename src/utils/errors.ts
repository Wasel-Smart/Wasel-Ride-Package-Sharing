/**
 * Wasel — Strict Typed Error System
 *
 * Contract:
 *   Every error has a deterministic shape: { code, message, meta, severity }
 *   No implicit fallbacks. No loose string matching in consumers.
 *   All error codes are defined in APP_ERROR_CODES — the single source of truth.
 */

// ── Severity levels ───────────────────────────────────────────────────────────

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// ── Error shape ───────────────────────────────────────────────────────────────

export interface ErrorShape {
  code: string;
  message: string;
  meta: Record<string, unknown>;
  severity: ErrorSeverity;
  isIgnorable: boolean;
}

// ── Error code registry ───────────────────────────────────────────────────────

interface ErrorCodeDefinition {
  code: string;
  severity: ErrorSeverity;
  isIgnorable: boolean;
  displayMessage: string;
}

export const APP_ERROR_CODES = {
  auth:            'AUTH_ERROR',
  authorization:   'AUTHORIZATION_ERROR',
  network:         'NETWORK_ERROR',
  validation:      'VALIDATION_ERROR',
  payment:         'PAYMENT_ERROR',
  timeout:         'TIMEOUT_ERROR',
  config:          'CONFIG_ERROR',
  ignorableSystem: 'IGNORABLE_SYSTEM_ERROR',
  api:             'API_ERROR',
  unknown:         'UNKNOWN_ERROR',
} as const;

export type AppErrorCode = typeof APP_ERROR_CODES[keyof typeof APP_ERROR_CODES];

const ERROR_CODE_REGISTRY: Record<AppErrorCode, ErrorCodeDefinition> = {
  [APP_ERROR_CODES.auth]: {
    code: APP_ERROR_CODES.auth,
    severity: 'error',
    isIgnorable: false,
    displayMessage: 'Authentication failed. Please log in again.',
  },
  [APP_ERROR_CODES.authorization]: {
    code: APP_ERROR_CODES.authorization,
    severity: 'error',
    isIgnorable: false,
    displayMessage: 'You do not have permission to perform this action.',
  },
  [APP_ERROR_CODES.network]: {
    code: APP_ERROR_CODES.network,
    severity: 'warning',
    isIgnorable: true,
    displayMessage: 'Network connection error. Please check your connection.',
  },
  [APP_ERROR_CODES.validation]: {
    code: APP_ERROR_CODES.validation,
    severity: 'error',
    isIgnorable: false,
    displayMessage: 'Invalid data provided. Please check your input.',
  },
  [APP_ERROR_CODES.payment]: {
    code: APP_ERROR_CODES.payment,
    severity: 'critical',
    isIgnorable: false,
    displayMessage: 'Payment processing failed. Please try again.',
  },
  [APP_ERROR_CODES.timeout]: {
    code: APP_ERROR_CODES.timeout,
    severity: 'warning',
    isIgnorable: true,
    displayMessage: 'Request timed out. Please try again.',
  },
  [APP_ERROR_CODES.config]: {
    code: APP_ERROR_CODES.config,
    severity: 'critical',
    isIgnorable: false,
    displayMessage: 'Configuration error. Please contact support.',
  },
  [APP_ERROR_CODES.ignorableSystem]: {
    code: APP_ERROR_CODES.ignorableSystem,
    severity: 'info',
    isIgnorable: true,
    displayMessage: '',
  },
  [APP_ERROR_CODES.api]: {
    code: APP_ERROR_CODES.api,
    severity: 'error',
    isIgnorable: false,
    displayMessage: 'The service is unavailable right now. Please try again.',
  },
  [APP_ERROR_CODES.unknown]: {
    code: APP_ERROR_CODES.unknown,
    severity: 'error',
    isIgnorable: false,
    displayMessage: 'An unexpected error occurred. Please try again.',
  },
};

// ── WaselError constructor options ────────────────────────────────────────────

interface WaselErrorOptions {
  code: AppErrorCode;
  message: string;
  meta?: Record<string, unknown>;
  severity?: ErrorSeverity;
  isIgnorable?: boolean;
  name?: string;
}

// ── Base error class ──────────────────────────────────────────────────────────

export class WaselError extends Error {
  public readonly code: AppErrorCode;
  public readonly meta: Record<string, unknown>;
  public readonly severity: ErrorSeverity;
  public readonly isIgnorable: boolean;

  /** @deprecated Use meta instead. Kept for backward compatibility. */
  public readonly context: Record<string, unknown>;

  constructor(options: WaselErrorOptions) {
    const definition = ERROR_CODE_REGISTRY[options.code];
    super(options.message);

    this.name = options.name ?? 'WaselError';
    this.code = options.code;
    this.meta = options.meta ?? {};
    this.context = this.meta; // backward-compat alias
    this.severity = options.severity ?? definition.severity;
    this.isIgnorable = options.isIgnorable ?? definition.isIgnorable;

    Object.setPrototypeOf(this, WaselError.prototype);
  }
}

// ── Typed subclasses ──────────────────────────────────────────────────────────

export class AuthenticationError extends WaselError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super({ code: APP_ERROR_CODES.auth, message, meta, name: 'AuthenticationError' });
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends WaselError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super({ code: APP_ERROR_CODES.authorization, message, meta, name: 'AuthorizationError' });
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NetworkError extends WaselError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super({ code: APP_ERROR_CODES.network, message, meta, name: 'NetworkError' });
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class ValidationError extends WaselError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super({ code: APP_ERROR_CODES.validation, message, meta, name: 'ValidationError' });
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class PaymentError extends WaselError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super({ code: APP_ERROR_CODES.payment, message, meta, name: 'PaymentError' });
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

export class TimeoutError extends WaselError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super({ code: APP_ERROR_CODES.timeout, message, meta, name: 'TimeoutError' });
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class ConfigError extends WaselError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super({ code: APP_ERROR_CODES.config, message, meta, name: 'ConfigError' });
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

export class IgnorableSystemError extends WaselError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super({ code: APP_ERROR_CODES.ignorableSystem, message, meta, name: 'IgnorableSystemError' });
    Object.setPrototypeOf(this, IgnorableSystemError.prototype);
  }
}

export class ApiError extends WaselError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super({ code: APP_ERROR_CODES.api, message, meta, name: 'ApiError' });
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// ── API-style payload detection ───────────────────────────────────────────────

interface ApiStylePayload {
  status?: number;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
  cause?: unknown;
}

function isApiStylePayload(value: unknown): value is ApiStylePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    ('status' in value || 'error' in value)
  );
}

// ── normalizeError ────────────────────────────────────────────────────────────

export function normalizeError(
  error: unknown,
  context?: Record<string, unknown>,
): WaselError {
  if (error instanceof WaselError) {
    return error;
  }

  // API-style payload objects: { status, error, meta }
  if (isApiStylePayload(error)) {
    if (error.cause instanceof Error) {
      const causeNormalized = normalizeError(error.cause, context);
      if (!(causeNormalized instanceof WaselError && causeNormalized.code === APP_ERROR_CODES.unknown)) {
        return causeNormalized;
      }
    }

    const status = typeof error.status === 'number' ? error.status : 0;
    const message =
      typeof error.error === 'string'
        ? error.error
        : typeof error.message === 'string'
          ? error.message
          : 'API request failed';

    const payloadMeta: Record<string, unknown> = {
      ...(typeof error.meta === 'object' && error.meta !== null ? error.meta : {}),
      ...(context ?? {}),
    };
    if (status) {payloadMeta.status = status;}

    if (status >= 400 && status < 500) {
      return new ValidationError(message, payloadMeta);
    }
    return new ApiError(message, payloadMeta);
  }

  if (error instanceof Error) {
    const message = error.message;
    const lower = message.toLowerCase();

    // Check nested cause first — more specific than the wrapper
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
      const causeNormalized = normalizeError(cause, context);
      if (!(causeNormalized instanceof WaselError && causeNormalized.code === APP_ERROR_CODES.unknown)) {
        return causeNormalized;
      }
    }

    const meta = context ?? {};

    if (
      lower.includes('iframemessageaborterror') ||
      lower.includes('message port was destroyed') ||
      lower.includes('message aborted') ||
      lower.includes('setupmessagechannel') ||
      lower.includes('figma_app-')
    ) {
      return new IgnorableSystemError(message, meta);
    }

    if (
      lower.includes('unauthorized') ||
      lower.includes('invalid credentials') ||
      lower.includes('session_not_found') ||
      lower.includes('invalid_jwt') ||
      lower.includes('jwt expired') ||
      lower.includes('jwt invalid')
    ) {
      return new AuthenticationError(message, meta);
    }

    if (
      lower.includes('permission') ||
      lower.includes('forbidden') ||
      lower.includes('access denied')
    ) {
      return new AuthorizationError(message, meta);
    }

    if (
      lower.includes('timeout') ||
      lower.includes('timed out') ||
      lower.includes('deadline exceeded')
    ) {
      return new TimeoutError(message, meta);
    }

    if (
      lower.includes('fetch') ||
      lower.includes('networkerror') ||
      lower.includes('network request failed') ||
      lower.includes('network error') ||
      lower.includes('failed to fetch') ||
      lower.includes('econnrefused')
    ) {
      return new NetworkError(message, meta);
    }

    if (lower.includes('payment') || lower.includes('stripe')) {
      return new PaymentError(message, meta);
    }

    if (
      lower.includes('validation') ||
      lower.includes('invalid') ||
      lower.includes('required')
    ) {
      return new ValidationError(message, meta);
    }

    return new WaselError({
      code: APP_ERROR_CODES.unknown,
      message,
      meta,
    });
  }

  const message = typeof error === 'string' ? error : 'An unknown error occurred';
  return new WaselError({
    code: APP_ERROR_CODES.unknown,
    message,
    meta: context ?? {},
  });
}

// ── shouldIgnoreError ─────────────────────────────────────────────────────────

export function shouldIgnoreError(error: unknown): boolean {
  if (error instanceof WaselError) {
    return error.isIgnorable;
  }

  if (error instanceof Error) {
    return normalizeError(error).isIgnorable;
  }

  return false;
}

// ── getErrorShape ─────────────────────────────────────────────────────────────

export function getErrorShape(error: WaselError): ErrorShape {
  return {
    code: error.code,
    message: error.message,
    meta: error.meta,
    severity: error.severity,
    isIgnorable: error.isIgnorable,
  };
}

// ── formatErrorMessage ────────────────────────────────────────────────────────

export function formatErrorMessage(error: unknown): string {
  const normalized = normalizeError(error);
  const definition = ERROR_CODE_REGISTRY[normalized.code];
  return definition?.displayMessage ?? normalized.message;
}

// ── formatErrorDetails ────────────────────────────────────────────────────────

export interface ErrorDetails {
  code: string;
  message: string;
  meta: Record<string, unknown>;
  severity: ErrorSeverity;
}

export function formatErrorDetails(error: WaselError): ErrorDetails {
  return {
    code: error.code,
    message: formatErrorMessage(error),
    meta: error.meta,
    severity: error.severity,
  };
}
