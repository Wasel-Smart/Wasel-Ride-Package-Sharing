/**
 * CliQ Payment Service — JoPACC Real-Time Payments (Jordan)
 *
 * CliQ is Jordan's instant payment network operated by JoPACC.
 * Supports: mobile alias · national-ID alias · IBAN alias · QR code
 *
 * Env vars required (frontend):
 *   VITE_CLIQ_MERCHANT_ALIAS   — your registered CliQ alias (e.g. "wasel")
 *   VITE_SUPABASE_URL          — already required by Supabase
 *   VITE_EDGE_FUNCTION_NAME    — already required by the app
 *   VITE_SUPABASE_ANON_KEY     — already required by Supabase
 *
 * Server-side env vars (Edge Function — never exposed to client):
 *   CLIQ_CLIENT_ID             — JoPACC developer-portal client ID
 *   CLIQ_CLIENT_SECRET         — JoPACC developer-portal secret
 *   CLIQ_MERCHANT_ALIAS        — registered merchant alias
 *   CLIQ_WEBHOOK_SECRET        — used to verify incoming JoPACC webhooks
 */

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type CliQAliasType = 'MOBILE' | 'NATIONALID' | 'IBAN';

export type CliQPaymentStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface CliQPaymentRequest {
  recipientAlias: string;
  aliasType: CliQAliasType;
  /** Amount in JOD (max 3 decimal places) */
  amount: number;
  /** Shown to payer — max 140 chars */
  description: string;
  /** Your internal reference — used for idempotency */
  merchantReference: string;
  redirectUrl?: string;
}

export interface CliQPaymentResponse {
  paymentId: string;
  merchantReference: string;
  status: CliQPaymentStatus;
  amount: number;
  currency: 'JOD';
  deepLink?: string;
  expiresAt: string;
  createdAt: string;
}

export interface CliQPaymentStatusResponse {
  paymentId: string;
  merchantReference: string;
  status: CliQPaymentStatus;
  amount: number;
  currency: 'JOD';
  paidAt?: string;
  failureReason?: string;
}

export interface CliQQRPaymentRequest {
  /** Omit to let the payer enter the amount */
  amount?: number;
  description?: string;
  merchantReference: string;
  /** Expiry in seconds — default 600 (10 min) */
  expiresInSeconds?: number;
}

export interface CliQQRPaymentResponse {
  paymentId: string;
  merchantReference: string;
  /** QR code payload string — pass to any QR renderer (e.g. qrcode.react) */
  qrCode: string;
  deepLink: string;
  amount?: number;
  currency: 'JOD';
  expiresAt: string;
}

export interface CliQRefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
  merchantReference: string;
}

export interface CliQRefundResponse {
  refundId: string;
  paymentId: string;
  status: 'INITIATED' | 'COMPLETED' | 'FAILED';
  amount: number;
  currency: 'JOD';
  createdAt: string;
}

// ─── Utility helpers (pure, no secrets) ──────────────────────────────────────

/** Rounds a JOD amount to at most 3 decimal places. */
export function roundJOD(amount: number): number {
  return Math.round(amount * 1000) / 1000;
}

/**
 * Normalises a Jordanian phone number to the international CliQ format.
 * Accepts: 07XXXXXXXX  →  +9627XXXXXXXX
 */
export function normalizeJordanMobile(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('9627') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('07') && digits.length === 10) return `+962${digits.slice(1)}`;
  if (digits.startsWith('7') && digits.length === 9) return `+962${digits}`;
  return phone;
}

/**
 * Auto-detects the CliQ alias type from a raw string.
 * Returns null when the string does not match any known alias format.
 */
export function detectCliQAliasType(alias: string): CliQAliasType | null {
  const s = alias.trim();
  if (/^(\+9627|07)\d{8}$/.test(s)) return 'MOBILE';
  if (/^\d{10}$/.test(s)) return 'NATIONALID';
  if (/^JO\d{2}[A-Z0-9]{28}$/i.test(s)) return 'IBAN';
  return null;
}

/** Returns a UI label for a CliQ alias type in English or Arabic. */
export function getCliQAliasLabel(type: CliQAliasType, lang: 'en' | 'ar' = 'en'): string {
  const map: Record<CliQAliasType, Record<'en' | 'ar', string>> = {
    MOBILE:     { en: 'Mobile number', ar: 'رقم الهاتف' },
    NATIONALID: { en: 'National ID',   ar: 'الرقم الوطني' },
    IBAN:       { en: 'IBAN',          ar: 'الآيبان' },
  };
  return map[type][lang];
}

/** Returns a UI label for a CliQ payment status in English or Arabic. */
export function getCliQStatusLabel(status: CliQPaymentStatus, lang: 'en' | 'ar' = 'en'): string {
  const map: Record<CliQPaymentStatus, Record<'en' | 'ar', string>> = {
    INITIATED:  { en: 'Initiated',  ar: 'تم البدء' },
    PENDING:    { en: 'Pending',    ar: 'قيد الانتظار' },
    PROCESSING: { en: 'Processing', ar: 'جاري المعالجة' },
    COMPLETED:  { en: 'Completed',  ar: 'مكتمل' },
    FAILED:     { en: 'Failed',     ar: 'فشل' },
    EXPIRED:    { en: 'Expired',    ar: 'منتهي الصلاحية' },
    CANCELLED:  { en: 'Cancelled',  ar: 'ملغي' },
    REFUNDED:   { en: 'Refunded',   ar: 'مسترد' },
  };
  return map[status][lang];
}

/**
 * Builds a CliQ deeplink for the Jordanian mobile banking app.
 * No secrets required — safe to call from the browser.
 *
 * Format: cliq://pay?alias=<alias>&amount=<JOD>&description=<text>&ref=<ref>
 */
export function buildCliQDeepLink(params: {
  alias?: string;
  amount?: number;
  description?: string;
  merchantReference?: string;
}): string {
  const alias = params.alias ?? (import.meta.env.VITE_CLIQ_MERCHANT_ALIAS as string | undefined) ?? 'wasel';
  const parts: string[] = [`cliq://pay?alias=${encodeURIComponent(alias)}`];
  if (params.amount !== undefined) parts.push(`amount=${params.amount.toFixed(3)}`);
  if (params.description) parts.push(`description=${encodeURIComponent(params.description.slice(0, 140))}`);
  if (params.merchantReference) parts.push(`ref=${encodeURIComponent(params.merchantReference)}`);
  return parts.join('&');
}

// ─── Edge Function proxy (all JoPACC API calls go through the Edge Function) ──

function getEdgeBase(): string {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const fnName = (import.meta.env.VITE_EDGE_FUNCTION_NAME as string | undefined) ?? 'make-server-0b1f4071';
  return `${supabaseUrl}/functions/v1/${fnName}`;
}

function getAnonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
}

async function edgeFetch<T>(
  path: string,
  method: 'GET' | 'POST',
  authToken: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${getEdgeBase()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: getAnonKey(),
      Authorization: `Bearer ${authToken}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? `CliQ request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Public API (called from React components / hooks) ────────────────────────

/**
 * Initiates a CliQ push payment to a recipient alias.
 * authToken must be the current Supabase session JWT.
 *
 * @example
 * const res = await initiateCliQPayment(
 *   { recipientAlias: '+962790000000', aliasType: 'MOBILE', amount: 5.500,
 *     description: 'Wasel ride — Amman to Zarqa', merchantReference: bookingId },
 *   session.access_token,
 * );
 */
export async function initiateCliQPayment(
  request: CliQPaymentRequest,
  authToken: string,
): Promise<CliQPaymentResponse> {
  return edgeFetch<CliQPaymentResponse>('/cliq/payments', 'POST', authToken, {
    ...request,
    amount: roundJOD(request.amount),
  });
}

/**
 * Polls the status of a CliQ payment.
 * Use with exponential back-off; CliQ payments typically settle within 5–30 seconds.
 */
export async function getCliQPaymentStatus(
  paymentId: string,
  authToken: string,
): Promise<CliQPaymentStatusResponse> {
  return edgeFetch<CliQPaymentStatusResponse>(
    `/cliq/payments/${encodeURIComponent(paymentId)}/status`,
    'GET',
    authToken,
  );
}

/**
 * Generates a CliQ QR code payment for merchant / kiosk flows.
 * The returned `qrCode` string can be rendered by any QR library (e.g. qrcode.react).
 */
export async function generateCliQQRPayment(
  request: CliQQRPaymentRequest,
  authToken: string,
): Promise<CliQQRPaymentResponse> {
  return edgeFetch<CliQQRPaymentResponse>('/cliq/qr', 'POST', authToken, {
    ...request,
    amount: request.amount !== undefined ? roundJOD(request.amount) : undefined,
    expiresInSeconds: request.expiresInSeconds ?? 600,
  });
}

/**
 * Issues a refund for a completed CliQ payment.
 * Partial refunds are supported by JoPACC.
 */
export async function refundCliQPayment(
  request: CliQRefundRequest,
  authToken: string,
): Promise<CliQRefundResponse> {
  return edgeFetch<CliQRefundResponse>('/cliq/refunds', 'POST', authToken, {
    ...request,
    amount: roundJOD(request.amount),
  });
}
