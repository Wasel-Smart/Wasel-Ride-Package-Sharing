/**
 * Edge Function Configuration
 * Centralized configuration for Supabase Edge Functions
 */

export interface EdgeFunctionConfig {
  name: string;
  version: string;
  hash: string;
  description: string;
}

/**
 * Primary edge function for backend workflows
 */
export const WASEL_EDGE_FUNCTION: EdgeFunctionConfig = {
  name: 'wasel-backend',
  version: 'v1.0.0',
  hash: 'make-server-0b1f4071',
  description: 'Main backend API handler for rides, packages, and payments',
};

/**
 * Payment processing edge function
 */
export const STRIPE_PAYMENTS_FUNCTION: EdgeFunctionConfig = {
  name: 'stripe-payments',
  version: 'v2.0.0',
  hash: 'stripe-payments-v2',
  description: 'Stripe payment processing and webhook handling',
};

/**
 * Placeholder markers that must never be used as a real edge function name.
 * If a deployment accidentally ships the `.env.example` value
 * (`your-edge-function-name`) the backend would 404 on every call. Treat those
 * as "not configured" and fall back to the canonical function hash so the app
 * keeps working instead of silently breaking every data-driven flow.
 */
const EDGE_FUNCTION_PLACEHOLDER_MARKERS = [
  'your-edge-function-name',
  'your-edge-function',
  'your-function',
  'replace-with',
  'replace_with',
  'example',
];

function isPlaceholderEdgeFunctionName(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) return true;
  return EDGE_FUNCTION_PLACEHOLDER_MARKERS.some(marker => normalized.includes(marker));
}

/**
 * Get the active edge function name
 * Supports override via environment variable. A placeholder/misconfigured
 * override is ignored so the app never targets a non-existent function.
 */
export function getEdgeFunctionName(): string {
  const candidates: Array<string | undefined> = [
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_EDGE_FUNCTION_NAME : undefined,
    typeof process !== 'undefined' ? process.env?.VITE_EDGE_FUNCTION_NAME : undefined,
  ];

  for (const candidate of candidates) {
    const value = typeof candidate === 'string' ? candidate.trim() : '';
    if (value && !isPlaceholderEdgeFunctionName(value)) {
      return value;
    }
  }

  return WASEL_EDGE_FUNCTION.hash;
}

/**
 * Get edge function version for telemetry
 */
export function getEdgeFunctionVersion(): string {
  const name = getEdgeFunctionName();

  if (name === WASEL_EDGE_FUNCTION.hash) {
    return WASEL_EDGE_FUNCTION.version;
  }

  if (name === STRIPE_PAYMENTS_FUNCTION.hash) {
    return STRIPE_PAYMENTS_FUNCTION.version;
  }

  return 'unknown';
}

/**
 * Build edge function URL
 */
export function buildEdgeFunctionUrl(
  supabaseUrl: string,
  functionName?: string,
  path = '',
): string {
  const name = functionName || getEdgeFunctionName();
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}/functions/v1/${name}${cleanPath}`;
}

/**
 * Get all configured edge functions
 */
export function getAllEdgeFunctions(): EdgeFunctionConfig[] {
  return [WASEL_EDGE_FUNCTION, STRIPE_PAYMENTS_FUNCTION];
}
