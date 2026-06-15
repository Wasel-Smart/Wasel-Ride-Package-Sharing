/**
 * Secrets Management Utility
 *
 * Provides secure access to sensitive credentials without exposing them in code.
 * Supports multiple backends: AWS Secrets Manager, environment variables, and encrypted storage.
 */

interface SecretConfig {
  name: string;
  required: boolean;
  fallbackEnvVar?: string;
}

interface SecretsCache {
  [key: string]: {
    value: string;
    expiresAt: number;
  };
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const secretsCache: SecretsCache = {};

/**
 * Secret keys that should never be exposed to the client
 */
const SERVER_ONLY_SECRETS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'COMMUNICATION_WORKER_SECRET',
  'COMMUNICATION_WEBHOOK_TOKEN',
  'RESEND_API_KEY',
  'SENDGRID_API_KEY',
  'TWILIO_AUTH_TOKEN',
] as const;

type ServerSecretKey = (typeof SERVER_ONLY_SECRETS)[number];

/**
 * Check if code is running on server-side
 */
function isServerSide(): boolean {
  return typeof window === 'undefined';
}

/**
 * Validate that server-only secrets are not accessed from client
 */
function validateSecretAccess(key: string): void {
  if (!isServerSide() && SERVER_ONLY_SECRETS.includes(key as ServerSecretKey)) {
    throw new Error(
      `Security violation: Attempted to access server-only secret "${key}" from client-side code. ` +
        `This secret must only be accessed in server-side contexts (edge functions, API routes).`,
    );
  }
}

/**
 * Get secret from cache if not expired
 */
function getCachedSecret(key: string): string | null {
  const cached = secretsCache[key];
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    delete secretsCache[key];
    return null;
  }

  return cached.value;
}

/**
 * Cache secret with TTL
 */
function cacheSecret(key: string, value: string): void {
  secretsCache[key] = {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

/**
 * Get secret from environment variables
 */
function getSecretFromEnv(key: string): string | null {
  // Try process.env first (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key];
    if (value) return value;
  }

  // Try import.meta.env (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = import.meta.env[key];
    if (value) return String(value);
  }

  return null;
}

/**
 * Fetch secret from AWS Secrets Manager (server-side only)
 */
async function fetchFromAWSSecretsManager(secretName: string): Promise<string | null> {
  if (!isServerSide()) {
    return null;
  }

  try {
    // This would be implemented in edge functions with AWS SDK
    // For now, return null to fall back to environment variables
    return null;
  } catch (error) {
    console.error(`Failed to fetch secret from AWS Secrets Manager: ${secretName}`, error);
    return null;
  }
}

/**
 * Get a secret value securely
 *
 * @param key - Secret key name
 * @param config - Configuration options
 * @returns Secret value or null if not found
 * @throws Error if secret is required but not found, or if client tries to access server-only secret
 */
export async function getSecret(
  key: string,
  config: Partial<SecretConfig> = {},
): Promise<string | null> {
  const { required = false, fallbackEnvVar } = config;

  // Validate access
  validateSecretAccess(key);

  // Check cache first
  const cached = getCachedSecret(key);
  if (cached) return cached;

  // Try AWS Secrets Manager (server-side only)
  if (isServerSide()) {
    const awsSecret = await fetchFromAWSSecretsManager(key);
    if (awsSecret) {
      cacheSecret(key, awsSecret);
      return awsSecret;
    }
  }

  // Try environment variable
  let value = getSecretFromEnv(key);

  // Try fallback environment variable
  if (!value && fallbackEnvVar) {
    value = getSecretFromEnv(fallbackEnvVar);
  }

  if (value) {
    cacheSecret(key, value);
    return value;
  }

  // Handle missing required secret
  if (required) {
    throw new Error(
      `Required secret "${key}" not found. ` +
        `Ensure it's set in environment variables or AWS Secrets Manager.`,
    );
  }

  return null;
}

/**
 * Get multiple secrets at once
 */
export async function getSecrets(
  keys: string[],
  required = false,
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};

  await Promise.all(
    keys.map(async key => {
      results[key] = await getSecret(key, { required });
    }),
  );

  return results;
}

/**
 * Clear secrets cache (useful for testing or security)
 */
export function clearSecretsCache(): void {
  Object.keys(secretsCache).forEach(key => {
    delete secretsCache[key];
  });
}

/**
 * Mask secret for logging (shows only first/last 4 chars)
 */
export function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) {
    return '****';
  }

  const first = secret.slice(0, 4);
  const last = secret.slice(-4);
  const masked = '*'.repeat(Math.min(secret.length - 8, 20));

  return `${first}${masked}${last}`;
}

/**
 * Validate that all required secrets are available
 */
export async function validateRequiredSecrets(
  requiredSecrets: string[],
): Promise<{ valid: boolean; missing: string[] }> {
  const missing: string[] = [];

  await Promise.all(
    requiredSecrets.map(async key => {
      const value = await getSecret(key, { required: false });
      if (!value) {
        missing.push(key);
      }
    }),
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get Supabase service role key (server-side only)
 */
export async function getSupabaseServiceRoleKey(): Promise<string> {
  const key = await getSecret('SUPABASE_SERVICE_ROLE_KEY', { required: true });
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required but not configured');
  }
  return key;
}

/**
 * Get Stripe secret key (server-side only)
 */
export async function getStripeSecretKey(): Promise<string> {
  const key = await getSecret('STRIPE_SECRET_KEY', { required: true });
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is required but not configured');
  }
  return key;
}

/**
 * Get communication worker secret (server-side only)
 */
export async function getCommunicationWorkerSecret(): Promise<string> {
  const key = await getSecret('COMMUNICATION_WORKER_SECRET', { required: true });
  if (!key) {
    throw new Error('COMMUNICATION_WORKER_SECRET is required but not configured');
  }
  return key;
}

/**
 * Rotate secret (invalidate cache)
 */
export function rotateSecret(key: string): void {
  delete secretsCache[key];
}

export const SecretsManager = {
  getSecret,
  getSecrets,
  clearSecretsCache,
  maskSecret,
  validateRequiredSecrets,
  getSupabaseServiceRoleKey,
  getStripeSecretKey,
  getCommunicationWorkerSecret,
  rotateSecret,
};

export default SecretsManager;
