export interface ApiMetadata {
  requestId?: string;
  timestamp?: string;
  version?: string;
  traceId?: string;
}

export interface ApiErrorDetails {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  metadata?: ApiMetadata;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorDetails;
  metadata?: ApiMetadata;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ApiEnvelope<T>>;
  return candidate.success === true || candidate.success === false;
}

export function unwrapApiEnvelope<T>(value: T | ApiEnvelope<T>): T {
  if (!isApiEnvelope<T>(value)) {
    return value as T;
  }

  if (value.success === true) {
    return value.data;
  }

  const error = value.error;

  throw Object.assign(new Error(error.message), {
    code: error.code,
    details: error.details,
  });
}

export function createSuccessEnvelope<T>(data: T, metadata?: ApiMetadata): ApiSuccessEnvelope<T> {
  return {
    success: true,
    data,
    metadata,
  };
}

export function createErrorEnvelope(
  message: string,
  code?: string,
  details?: unknown,
  metadata?: ApiMetadata,
): ApiErrorEnvelope {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
    metadata,
  };
}
