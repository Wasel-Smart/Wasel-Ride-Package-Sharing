/**
 * Centralized error handling system
 * Replaces brittle regex pattern matching with typed error classes
 */

/**
 * Base Wasel error class
 */
export class WaselError extends Error {
  public readonly code: string;
  public readonly isIgnorable: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    isIgnorable: boolean = false,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'WaselError';
    this.code = code;
    this.isIgnorable = isIgnorable;
    if (context !== undefined) {
      this.context = context;
    }
    Object.setPrototypeOf(this, WaselError.prototype);
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends WaselError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', false, context);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends WaselError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', false, context);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends WaselError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', true, context);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends WaselError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', false, context);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Payment errors
 */
export class PaymentError extends WaselError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PAYMENT_ERROR', false, context);
    this.name = 'PaymentError';
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends WaselError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TIMEOUT_ERROR', true, context);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends WaselError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', false, context);
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * System errors that should be ignored (framework-level, not user-facing)
 */
export class IgnorableSystemError extends WaselError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'IGNORABLE_SYSTEM_ERROR', true, context);
    this.name = 'IgnorableSystemError';
    Object.setPrototypeOf(this, IgnorableSystemError.prototype);
  }
}

/**
 * Error normalizer - converts Supabase/external errors to Wasel errors
 */
export function normalizeError(error: unknown, context?: Record<string, unknown>): WaselError {
  if (error instanceof WaselError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message;
    const lowerMessage = message.toLowerCase();

    // System errors that should be ignored
    if (
      lowerMessage.includes('iframemessageaborterror'.toLowerCase()) ||
      lowerMessage.includes('message port was destroyed') ||
      lowerMessage.includes('message aborted') ||
      lowerMessage.includes('setupmessagechannel') ||
      lowerMessage.includes('figma_app-')
    ) {
      return new IgnorableSystemError(message, context);
    }

    // Authentication errors — checked before generic 'invalid' to avoid misclassification
    // e.g. 'invalid_jwt' must become AuthenticationError, not ValidationError
    if (
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('invalid credentials') ||
      lowerMessage.includes('session_not_found') ||
      lowerMessage.includes('invalid_jwt') ||
      lowerMessage.includes('jwt expired') ||
      lowerMessage.includes('jwt invalid')
    ) {
      return new AuthenticationError(message, context);
    }

    // Authorization errors — checked before generic 'invalid'
    if (
      lowerMessage.includes('permission') ||
      lowerMessage.includes('forbidden') ||
      lowerMessage.includes('access denied')
    ) {
      return new AuthorizationError(message, context);
    }

    // Timeout errors — checked before network to be more specific
    if (
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('timed out') ||
      lowerMessage.includes('deadline exceeded')
    ) {
      return new TimeoutError(message, context);
    }

    // Network errors
    if (
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('networkerror') ||
      lowerMessage.includes('network request failed') ||
      lowerMessage.includes('network error') ||
      lowerMessage.includes('failed to fetch') ||
      lowerMessage.includes('econnrefused')
    ) {
      return new NetworkError(message, context);
    }

    // Payment errors
    if (lowerMessage.includes('payment') || lowerMessage.includes('stripe')) {
      return new PaymentError(message, context);
    }

    // Validation errors — last among specific checks because 'invalid' is broad
    if (
      lowerMessage.includes('validation') ||
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('required')
    ) {
      return new ValidationError(message, context);
    }

    return new WaselError(message, 'UNKNOWN_ERROR', false, context);
  }

  const message = typeof error === 'string' ? error : 'An unknown error occurred';
  return new WaselError(message, 'UNKNOWN_ERROR', false, context);
}

/**
 * Check if error should be ignored by error boundary
 */
export function shouldIgnoreError(error: unknown): boolean {
  if (error instanceof WaselError) {
    return error.isIgnorable;
  }

  if (error instanceof Error) {
    const normalized = normalizeError(error);
    return normalized.isIgnorable;
  }

  return false;
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: unknown): string {
  const normalized = normalizeError(error);

  const messageMap: Record<string, string> = {
    AUTH_ERROR: 'Authentication failed. Please log in again.',
    AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
    NETWORK_ERROR: 'Network connection error. Please check your connection.',
    VALIDATION_ERROR: 'Invalid data provided. Please check your input.',
    PAYMENT_ERROR: 'Payment processing failed. Please try again.',
    TIMEOUT_ERROR: 'Request timed out. Please try again.',
    CONFIG_ERROR: 'Configuration error. Please contact support.',
    IGNORABLE_SYSTEM_ERROR: '', // Don't show to user
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  };

  if (Object.prototype.hasOwnProperty.call(messageMap, normalized.code)) {
    return messageMap[normalized.code];
  }

  return normalized.message;
}
