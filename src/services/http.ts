import { logger, trackAPICall } from '../utils/logging';
import { redactSensitiveValue } from '../utils/redaction';
import { canonicalizePhoneNumber } from '../utils/phone';
import {
  ApiError,
  AuthenticationError,
  ValidationError,
  type WaselError,
  normalizeError,
} from '../utils/errors';

type JsonRecord = Record<string, unknown>;

function normalizeApiErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallbackMessage;
  }

  const record = payload as JsonRecord;
  const candidates = [
    record.error,
    record.message,
    record.details,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return fallbackMessage;
}

export async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (
    contentType &&
    !contentType.toLowerCase().includes('application/json')
  ) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function buildApiError(
  response: Response,
  fallbackMessage: string,
  context?: JsonRecord,
): Promise<WaselError> {
  const payload = await parseJsonSafely<JsonRecord>(response);
  const message = normalizeApiErrorMessage(payload, fallbackMessage);
  const errorContext = {
    status: response.status,
    statusText: response.statusText,
    ...context,
    ...(payload ? { response: payload } : {}),
  };

  if (response.status === 401) {
    return new AuthenticationError(message, errorContext);
  }

  if (response.status === 400 || response.status === 422) {
    return new ValidationError(message, errorContext);
  }

  return new ApiError(message, errorContext);
}

export async function expectJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
  context?: JsonRecord,
): Promise<T> {
  if (!response.ok) {
    throw await buildApiError(response, fallbackMessage, context);
  }

  const payload = await parseJsonSafely<T>(response);
  if (payload === null) {
    throw new ApiError(fallbackMessage, {
      ...context,
      status: response.status,
      reason: 'Expected JSON response body',
    });
  }

  return payload;
}

export function sanitizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ValidationError('Enter a valid email address');
  }
  return normalized;
}

export function sanitizeTextField(value: string, fieldName: string, maxLength = 200): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    throw new ValidationError(`${fieldName} is required`, { fieldName });
  }

  if (normalized.length > maxLength) {
    throw new ValidationError(`${fieldName} must be ${maxLength} characters or fewer`, {
      fieldName,
      maxLength,
    });
  }

  return normalized;
}

export function sanitizeOptionalTextField(value: string | undefined, maxLength = 500): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return undefined;
  }

  if (normalized.length > maxLength) {
    throw new ValidationError(`Text must be ${maxLength} characters or fewer`, { maxLength });
  }

  return normalized;
}

export function sanitizePhoneNumber(value: string): string {
  const normalized = canonicalizePhoneNumber(value);
  if (!normalized) {
    throw new ValidationError('Phone number must be in international format');
  }

  return normalized;
}

export async function withApiTelemetry<T>(
  operation: string,
  endpoint: string,
  method: string,
  execute: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();

  try {
    const result = await execute();
    trackAPICall(endpoint, method, performance.now() - startedAt, 200);
    return result;
  } catch (error) {
    const normalized = normalizeError(error, { operation, endpoint, method });
    const status =
      normalized.context && typeof normalized.context.status === 'number'
        ? normalized.context.status
        : 0;

    trackAPICall(endpoint, method, performance.now() - startedAt, status);
    if (import.meta.env.MODE !== 'test') {
      logger.error(`[API] ${operation} failed`, normalized, {
        endpoint,
        method,
        ...(redactSensitiveValue(normalized.context ?? {}) as JsonRecord),
      });
    }

    throw normalized;
  }
}
