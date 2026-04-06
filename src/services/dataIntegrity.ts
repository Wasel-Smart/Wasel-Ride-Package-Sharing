import { z } from 'zod';
import { logger } from '../utils/monitoring';

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

declare global {
  interface Window {
    __waselDataFlowLogs__?: DataFlowLogEntry[];
  }
}

export type DataFlowLogEntry = {
  requestId: string;
  operation: string;
  stage: 'validate' | 'request' | 'response' | 'retry' | 'error';
  status: 'pending' | 'success' | 'failed';
  attempt: number;
  timestamp: string;
  details?: Record<string, unknown>;
};

const profilePhoneField = z
  .string()
  .trim()
  .regex(PHONE_REGEX, 'Phone must be in international format')
  .nullable()
  .optional();

const presentKeys = (value: Record<string, unknown>) =>
  Object.entries(value).filter(([, entry]) => entry !== undefined).length > 0;

export const profileUpdatePayloadSchema = z
  .object({
    email: z.string().trim().email().optional(),
    full_name: z.string().trim().min(2).max(120).optional(),
    phone_number: profilePhoneField,
    phone: profilePhoneField,
    role: z.string().trim().min(1).optional(),
    verification_level: z.string().trim().min(1).optional(),
    avatar_url: z.string().trim().min(1).optional(),
    wallet_balance: z.number().finite().optional(),
    wallet_status: z.enum(['active', 'limited', 'frozen']).optional(),
  })
  .refine(presentKeys, 'At least one profile field must be provided');

export const tripCreatePayloadSchema = z.object({
  from: z.string().trim().min(2).max(80),
  to: z.string().trim().min(2).max(80),
  date: z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(TIME_REGEX, 'Time must be HH:mm'),
  seats: z.number().int().min(1).max(7),
  price: z.number().finite().positive().max(500),
  gender: z.string().trim().optional(),
  prayer: z.boolean().optional(),
  carModel: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  acceptsPackages: z.boolean().optional(),
  packageCapacity: z.enum(['small', 'medium', 'large']).optional(),
  packageNote: z.string().trim().max(500).optional(),
});

export const tripUpdatePayloadSchema = tripCreatePayloadSchema
  .partial()
  .extend({
    status: z.enum(['active', 'cancelled', 'completed']).optional(),
  })
  .refine(presentKeys, 'At least one trip field must be provided');

export const bookingCreatePayloadSchema = z.object({
  tripId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  seatsRequested: z.number().int().min(1).max(7),
  pickup: z.string().trim().max(120).optional(),
  dropoff: z.string().trim().max(120).optional(),
  metadata: z.record(z.unknown()).optional(),
  bookingStatus: z.string().trim().optional(),
});

export const pricingSnapshotPayloadSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  corridorId: z.string().trim().min(1).nullable().optional(),
  from: z.string().trim().min(2).max(80),
  to: z.string().trim().min(2).max(80),
  basePriceJod: z.number().finite().min(0),
  finalPriceJod: z.number().finite().min(0),
  demandScore: z.number().finite().min(0).max(100).optional(),
  pricePressure: z.string().trim().max(40).optional(),
  sourceContext: z.string().trim().max(120).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const communicationPreferenceUpdateSchema = z
  .object({
    inApp: z.boolean().optional(),
    push: z.boolean().optional(),
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    tripUpdates: z.boolean().optional(),
    bookingRequests: z.boolean().optional(),
    messages: z.boolean().optional(),
    promotions: z.boolean().optional(),
    prayerReminders: z.boolean().optional(),
    criticalAlerts: z.boolean().optional(),
    preferredLanguage: z.enum(['en', 'ar']).optional(),
  })
  .refine(presentKeys, 'At least one communication preference must be provided');

export function buildRequestId(operation: string): string {
  const slug = operation.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  const entropy = Math.random().toString(36).slice(2, 8);
  return `${slug || 'write'}-${Date.now()}-${entropy}`;
}

export function buildTraceHeaders(requestId: string, extraHeaders?: HeadersInit): HeadersInit {
  const headers = new Headers(extraHeaders ?? {});
  headers.set('x-request-id', requestId);
  return headers;
}

export function sanitizePayload<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePayload(entry)) as T;
  }

  if (value && typeof value === 'object') {
    const nextEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => {
        if (key === 'avatar_url' && typeof entry === 'string' && entry.startsWith('data:')) {
          return [key, '[data-url]'] as const;
        }
        return [key, sanitizePayload(entry)];
      });
    return Object.fromEntries(nextEntries) as T;
  }

  return value;
}

function appendLog(entry: DataFlowLogEntry) {
  if (typeof window !== 'undefined') {
    const existing = window.__waselDataFlowLogs__ ?? [];
    window.__waselDataFlowLogs__ = [entry, ...existing].slice(0, 200);
  }
}

export function logDataFlow(entry: DataFlowLogEntry) {
  appendLog(entry);
  const context = {
    requestId: entry.requestId,
    operation: entry.operation,
    stage: entry.stage,
    status: entry.status,
    attempt: entry.attempt,
    ...(entry.details ?? {}),
  };

  if (entry.status === 'failed') {
    logger.error(`[DataFlow] ${entry.operation} ${entry.stage} failed`, undefined, context);
    return;
  }

  logger.info(`[DataFlow] ${entry.operation} ${entry.stage} ${entry.status}`, context);
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown write failure';
}

function isTransientWriteError(error: unknown) {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('temporar') ||
    message.includes('deadlock') ||
    message.includes('connection') ||
    message.includes('503') ||
    message.includes('502')
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function validatePayload<T>(schema: z.ZodType<T>, payload: unknown, operation: string): T {
  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  throw new Error(`${operation} validation failed: ${issues.map((issue) => `${issue.path || 'payload'} ${issue.message}`).join('; ')}`);
}

export async function withDataIntegrity<TPayload, TResult>(args: {
  operation: string;
  schema: z.ZodType<TPayload>;
  payload: unknown;
  execute: (context: { requestId: string; payload: TPayload; attempt: number }) => Promise<TResult>;
  maxAttempts?: number;
}): Promise<TResult> {
  const requestId = buildRequestId(args.operation);
  const payload = validatePayload(args.schema, args.payload, args.operation);
  const sanitizedPayload = sanitizePayload(payload);

  logDataFlow({
    requestId,
    operation: args.operation,
    stage: 'validate',
    status: 'success',
    attempt: 1,
    timestamp: new Date().toISOString(),
    details: { payload: sanitizedPayload as Record<string, unknown> },
  });

  const maxAttempts = Math.max(1, args.maxAttempts ?? 2);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      logDataFlow({
        requestId,
        operation: args.operation,
        stage: 'request',
        status: 'pending',
        attempt,
        timestamp: new Date().toISOString(),
        details: { payload: sanitizedPayload as Record<string, unknown> },
      });

      const result = await args.execute({ requestId, payload, attempt });

      logDataFlow({
        requestId,
        operation: args.operation,
        stage: 'response',
        status: 'success',
        attempt,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const details = {
        error: toErrorMessage(error),
        payload: sanitizedPayload as Record<string, unknown>,
      };

      const retryable = attempt < maxAttempts && isTransientWriteError(error);
      logDataFlow({
        requestId,
        operation: args.operation,
        stage: retryable ? 'retry' : 'error',
        status: 'failed',
        attempt,
        timestamp: new Date().toISOString(),
        details,
      });

      if (!retryable) {
        throw error instanceof Error
          ? new Error(`[${requestId}] ${error.message}`)
          : new Error(`[${requestId}] ${toErrorMessage(error)}`);
      }

      await sleep(150 * attempt);
    }
  }

  throw new Error(`[${requestId}] ${args.operation} failed after retry`);
}
