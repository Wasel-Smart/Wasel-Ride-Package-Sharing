/**
 * Standardized Error Types and Codes
 * Provides consistent error handling across the application
 */

export enum ErrorCategory {
  AUTH = 'AUTH',
  WALLET = 'WALLET',
  PAYMENT = 'PAYMENT',
  RIDE = 'RIDE',
  PACKAGE = 'PACKAGE',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  SYSTEM = 'SYSTEM',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorContext {
  [key: string]: unknown;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp?: number;
  endpoint?: string;
  method?: string;
}

export interface WaselErrorOptions {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: ErrorContext;
  originalError?: Error | unknown;
  userMessage?: string;
  retryable?: boolean;
}

export class WaselError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly originalError?: Error | unknown;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly timestamp: number;

  constructor(options: WaselErrorOptions) {
    super(options.message);
    this.name = 'WaselError';
    this.code = options.code;
    this.category = options.category;
    this.severity = options.severity;
    this.context = {
      ...options.context,
      timestamp: Date.now(),
    };
    this.originalError = options.originalError;
    this.userMessage = options.userMessage || this.getDefaultUserMessage();
    this.retryable = options.retryable ?? false;
    this.timestamp = Date.now();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WaselError);
    }
  }

  private getDefaultUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.AUTH:
        return 'Authentication failed. Please try again.';
      case ErrorCategory.WALLET:
        return 'Wallet operation failed. Please try again.';
      case ErrorCategory.PAYMENT:
        return 'Payment failed. Please check your payment method.';
      case ErrorCategory.RIDE:
        return 'Ride operation failed. Please try again.';
      case ErrorCategory.PACKAGE:
        return 'Package operation failed. Please try again.';
      case ErrorCategory.NETWORK:
        return 'Network error. Please check your connection.';
      case ErrorCategory.VALIDATION:
        return 'Invalid input. Please check your information.';
      case ErrorCategory.PERMISSION:
        return 'You do not have permission to perform this action.';
      case ErrorCategory.SYSTEM:
        return 'System error. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      userMessage: this.userMessage,
      retryable: this.retryable,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// Error Code Registry
export const ErrorCodes = {
  // Authentication Errors (AUTH_xxx)
  AUTH_001: 'Invalid credentials',
  AUTH_002: 'Session expired',
  AUTH_003: 'Account locked',
  AUTH_004: 'Email not verified',
  AUTH_005: 'Password reset required',
  AUTH_006: 'Two-factor authentication required',
  AUTH_007: 'OAuth provider error',
  AUTH_008: 'Account not found',
  AUTH_009: 'Account already exists',
  AUTH_010: 'Invalid token',

  // Wallet Errors (WALLET_xxx)
  WALLET_001: 'Insufficient balance',
  WALLET_002: 'Transaction failed',
  WALLET_003: 'Invalid amount',
  WALLET_004: 'Wallet not found',
  WALLET_005: 'Top-up failed',
  WALLET_006: 'Withdrawal failed',
  WALLET_007: 'Transaction limit exceeded',
  WALLET_008: 'Invalid transaction',
  WALLET_009: 'Wallet locked',
  WALLET_010: 'Currency not supported',

  // Payment Errors (PAYMENT_xxx)
  PAYMENT_001: 'Payment declined',
  PAYMENT_002: 'Invalid payment method',
  PAYMENT_003: 'Payment timeout',
  PAYMENT_004: 'Payment gateway error',
  PAYMENT_005: 'Refund failed',
  PAYMENT_006: 'Invalid card',
  PAYMENT_007: 'Card expired',
  PAYMENT_008: 'Insufficient funds',
  PAYMENT_009: 'Payment cancelled',
  PAYMENT_010: 'Payment verification failed',

  // Ride Errors (RIDE_xxx)
  RIDE_001: 'No drivers available',
  RIDE_002: 'Ride not found',
  RIDE_003: 'Ride already cancelled',
  RIDE_004: 'Ride already completed',
  RIDE_005: 'Invalid pickup location',
  RIDE_006: 'Invalid dropoff location',
  RIDE_007: 'Booking failed',
  RIDE_008: 'Cancellation failed',
  RIDE_009: 'Rating failed',
  RIDE_010: 'Ride matching failed',

  // Package Errors (PACKAGE_xxx)
  PACKAGE_001: 'Package not found',
  PACKAGE_002: 'Invalid package size',
  PACKAGE_003: 'Invalid package weight',
  PACKAGE_004: 'Delivery failed',
  PACKAGE_005: 'Tracking failed',
  PACKAGE_006: 'Package already delivered',
  PACKAGE_007: 'Package cancelled',
  PACKAGE_008: 'Invalid recipient',
  PACKAGE_009: 'Invalid sender',
  PACKAGE_010: 'Package creation failed',

  // Network Errors (NETWORK_xxx)
  NETWORK_001: 'Connection timeout',
  NETWORK_002: 'Network unavailable',
  NETWORK_003: 'Server error',
  NETWORK_004: 'Service unavailable',
  NETWORK_005: 'Rate limit exceeded',
  NETWORK_006: 'Bad gateway',
  NETWORK_007: 'Gateway timeout',
  NETWORK_008: 'DNS resolution failed',
  NETWORK_009: 'SSL certificate error',
  NETWORK_010: 'Connection refused',

  // Validation Errors (VALIDATION_xxx)
  VALIDATION_001: 'Required field missing',
  VALIDATION_002: 'Invalid email format',
  VALIDATION_003: 'Invalid phone number',
  VALIDATION_004: 'Invalid date format',
  VALIDATION_005: 'Value out of range',
  VALIDATION_006: 'Invalid format',
  VALIDATION_007: 'Field too long',
  VALIDATION_008: 'Field too short',
  VALIDATION_009: 'Invalid characters',
  VALIDATION_010: 'Pattern mismatch',

  // Permission Errors (PERMISSION_xxx)
  PERMISSION_001: 'Access denied',
  PERMISSION_002: 'Insufficient privileges',
  PERMISSION_003: 'Resource forbidden',
  PERMISSION_004: 'Account suspended',
  PERMISSION_005: 'Feature not available',
  PERMISSION_006: 'Region restricted',
  PERMISSION_007: 'Age restricted',
  PERMISSION_008: 'Verification required',
  PERMISSION_009: 'Terms not accepted',
  PERMISSION_010: 'GDPR consent required',

  // System Errors (SYSTEM_xxx)
  SYSTEM_001: 'Internal server error',
  SYSTEM_002: 'Database error',
  SYSTEM_003: 'Cache error',
  SYSTEM_004: 'Configuration error',
  SYSTEM_005: 'Service initialization failed',
  SYSTEM_006: 'Resource exhausted',
  SYSTEM_007: 'Deadlock detected',
  SYSTEM_008: 'Circuit breaker open',
  SYSTEM_009: 'Health check failed',
  SYSTEM_010: 'Maintenance mode',
} as const;

// Error Factory Functions
export function createAuthError(
  code: keyof typeof ErrorCodes,
  context?: ErrorContext,
  originalError?: unknown
): WaselError {
  return new WaselError({
    code,
    message: ErrorCodes[code],
    category: ErrorCategory.AUTH,
    severity: ErrorSeverity.HIGH,
    context,
    originalError,
    retryable: false,
  });
}

export function createWalletError(
  code: keyof typeof ErrorCodes,
  context?: ErrorContext,
  originalError?: unknown
): WaselError {
  return new WaselError({
    code,
    message: ErrorCodes[code],
    category: ErrorCategory.WALLET,
    severity: ErrorSeverity.HIGH,
    context,
    originalError,
    retryable: ['WALLET_002', 'WALLET_005'].includes(code),
  });
}

export function createPaymentError(
  code: keyof typeof ErrorCodes,
  context?: ErrorContext,
  originalError?: unknown
): WaselError {
  return new WaselError({
    code,
    message: ErrorCodes[code],
    category: ErrorCategory.PAYMENT,
    severity: ErrorSeverity.CRITICAL,
    context,
    originalError,
    retryable: ['PAYMENT_003', 'PAYMENT_004'].includes(code),
  });
}

export function createRideError(
  code: keyof typeof ErrorCodes,
  context?: ErrorContext,
  originalError?: unknown
): WaselError {
  return new WaselError({
    code,
    message: ErrorCodes[code],
    category: ErrorCategory.RIDE,
    severity: ErrorSeverity.MEDIUM,
    context,
    originalError,
    retryable: ['RIDE_001', 'RIDE_007', 'RIDE_010'].includes(code),
  });
}

export function createPackageError(
  code: keyof typeof ErrorCodes,
  context?: ErrorContext,
  originalError?: unknown
): WaselError {
  return new WaselError({
    code,
    message: ErrorCodes[code],
    category: ErrorCategory.PACKAGE,
    severity: ErrorSeverity.MEDIUM,
    context,
    originalError,
    retryable: ['PACKAGE_004', 'PACKAGE_005', 'PACKAGE_010'].includes(code),
  });
}

export function createNetworkError(
  code: keyof typeof ErrorCodes,
  context?: ErrorContext,
  originalError?: unknown
): WaselError {
  return new WaselError({
    code,
    message: ErrorCodes[code],
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    context,
    originalError,
    retryable: true,
  });
}

export function createValidationError(
  code: keyof typeof ErrorCodes,
  context?: ErrorContext,
  originalError?: unknown
): WaselError {
  return new WaselError({
    code,
    message: ErrorCodes[code],
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    context,
    originalError,
    retryable: false,
  });
}

export function createPermissionError(
  code: keyof typeof ErrorCodes,
  context?: ErrorContext,
  originalError?: unknown
): WaselError {
  return new WaselError({
    code,
    message: ErrorCodes[code],
    category: ErrorCategory.PERMISSION,
    severity: ErrorSeverity.HIGH,
    context,
    originalError,
    retryable: false,
  });
}

export function createSystemError(
  code: keyof typeof ErrorCodes,
  context?: ErrorContext,
  originalError?: unknown
): WaselError {
  return new WaselError({
    code,
    message: ErrorCodes[code],
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    context,
    originalError,
    retryable: ['SYSTEM_008', 'SYSTEM_009'].includes(code),
  });
}

// Error Handler Utility
export function handleError(error: unknown, context?: ErrorContext): WaselError {
  if (error instanceof WaselError) {
    return error;
  }

  if (error instanceof Error) {
    return new WaselError({
      code: 'SYSTEM_001',
      message: error.message,
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.HIGH,
      context,
      originalError: error,
      retryable: false,
    });
  }

  return new WaselError({
    code: 'SYSTEM_001',
    message: String(error),
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    context,
    originalError: error,
    retryable: false,
  });
}

// Check if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (error instanceof WaselError) {
    return error.retryable;
  }
  return false;
}

// Get user-friendly error message
export function getUserMessage(error: unknown): string {
  if (error instanceof WaselError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
