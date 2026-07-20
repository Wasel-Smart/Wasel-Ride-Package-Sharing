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
 * Get the active edge function name
 * Supports override via environment variable
 */
export function getEdgeFunctionName(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EDGE_FUNCTION_NAME) {
    return String(import.meta.env.VITE_EDGE_FUNCTION_NAME);
  }

  if (typeof process !== 'undefined' && process.env?.VITE_EDGE_FUNCTION_NAME) {
    return String(process.env.VITE_EDGE_FUNCTION_NAME);
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
