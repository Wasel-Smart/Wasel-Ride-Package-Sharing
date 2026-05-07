import { API_URL, createEdgeHeaders, fetchWithRetry, getAuthDetails, publicAnonKey } from './core';
import { getConfig } from '../utils/env';
import { validateApiUrl } from '../utils/sanitization';

export type BackendAuthMode = 'none' | 'public' | 'required';
export type FallbackPolicy = 'always' | 'writes-if-enabled' | 'never';

export interface BackendWorkflowContext {
  token?: string;
  userId?: string;
}

export class BackendRequestError extends Error {
  status?: number;
  payload?: unknown;
  recoverable: boolean;

  constructor(
    message: string,
    options?: { status?: number; payload?: unknown; recoverable?: boolean },
  ) {
    super(message);
    this.name = 'BackendRequestError';
    this.status = options?.status;
    this.payload = options?.payload;
    this.recoverable = options?.recoverable ?? false;
  }
}

type EdgeJsonOptions = {
  path: string;
  operation: string;
  authMode?: BackendAuthMode;
  context?: BackendWorkflowContext;
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
  timeout?: number;
  retries?: number;
};

type BackendWorkflowOptions<T> = {
  operation: string;
  authMode?: BackendAuthMode;
  fallbackPolicy?: FallbackPolicy;
  edgeAvailable?: boolean;
  edge: (context: BackendWorkflowContext) => Promise<T>;
  fallback?: (context: BackendWorkflowContext) => Promise<T>;
};

export function getSecureBackendFallbackError(operation: string): Error {
  return new Error(
    `${operation} is temporarily unavailable while the secure backend is degraded. Please try again shortly.`,
  );
}

export function hasConfiguredEdgeTransport(authMode: BackendAuthMode = 'none'): boolean {
  if (!API_URL) {
    return false;
  }

  if (authMode === 'public') {
    return Boolean(publicAnonKey);
  }

  return true;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isRecoverableError(error: unknown): boolean {
  if (error instanceof BackendRequestError) {
    return error.recoverable;
  }

  return error instanceof TypeError || isAbortError(error);
}

function resolveFallbackPolicy(policy: FallbackPolicy | undefined): boolean {
  switch (policy ?? 'always') {
    case 'always':
      return true;
    case 'writes-if-enabled':
      return getConfig().allowDirectSupabaseFallback;
    case 'never':
    default:
      return false;
  }
}

function getPayloadMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const candidates = [data.error, data.message, data.details];
  const message = candidates.find(value => typeof value === 'string' && value.trim().length > 0);
  return typeof message === 'string' ? message : null;
}

function getTrustedApiDomains(): string[] {
  const configuredDomain = getConfig().allowedApiDomain || 'wasel14.online';
  const domains = ['supabase.co', 'supabase.net', configuredDomain].filter(Boolean);

  try {
    const hostname = new URL(API_URL).hostname;
    if (hostname) {
      domains.push(hostname);
    }
  } catch {
    // Ignore invalid API_URL here; requestEdgeJson will reject it below.
  }

  return Array.from(new Set(domains));
}

async function resolveContext(authMode: BackendAuthMode): Promise<BackendWorkflowContext> {
  if (authMode !== 'required') {
    return {};
  }

  const { token, userId } = await getAuthDetails();
  return { token, userId };
}

export async function requestEdgeJson<T>({
  path,
  operation,
  authMode = 'none',
  context,
  method = 'GET',
  body,
  headers,
  timeout,
  retries,
}: EdgeJsonOptions): Promise<T> {
  if (!hasConfiguredEdgeTransport(authMode)) {
    throw new BackendRequestError(
      `${operation} is unavailable because the backend transport is not configured.`,
      {
        recoverable: true,
      },
    );
  }

  // Validate API_URL to prevent SSRF
  const allowedDomains = getTrustedApiDomains();

  if (!validateApiUrl(API_URL, allowedDomains)) {
    throw new BackendRequestError(`${operation} failed: Invalid or untrusted API URL`, {
      recoverable: false,
    });
  }

  const resolvedContext =
    authMode === 'required' ? (context ?? (await resolveContext(authMode))) : (context ?? {});
  
  // Determine if CSRF should be included (for state-changing operations)
  const includeCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  
  const finalHeaders = createEdgeHeaders(
    headers,
    authMode === 'required' ? resolvedContext.token : undefined,
    includeCSRF,
  );

  if (authMode === 'none' && !publicAnonKey) {
    finalHeaders.delete('apikey');
  }

  if (body !== undefined && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetchWithRetry(
    `${API_URL}${path}`,
    {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      timeout,
    },
    retries,
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new BackendRequestError(
      getPayloadMessage(payload) || `${operation} failed (${response.status})`,
      {
        status: response.status,
        payload,
        recoverable: response.status >= 500,
      },
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function runBackendWorkflow<T>({
  operation,
  authMode = 'none',
  fallbackPolicy = 'always',
  edgeAvailable = hasConfiguredEdgeTransport(authMode),
  edge,
  fallback,
}: BackendWorkflowOptions<T>): Promise<T> {
  const context = await resolveContext(authMode);
  const fallbackAllowed = Boolean(fallback) && resolveFallbackPolicy(fallbackPolicy);

  if (!edgeAvailable) {
    if (fallbackAllowed && fallback) {
      return fallback(context);
    }

    if (fallback && !fallbackAllowed) {
      throw getSecureBackendFallbackError(operation);
    }

    throw new BackendRequestError(
      `${operation} is unavailable because the backend transport is not configured.`,
    );
  }

  try {
    return await edge(context);
  } catch (error) {
    if (fallbackAllowed && fallback && isRecoverableError(error)) {
      return fallback(context);
    }

    if (fallback && !fallbackAllowed && isRecoverableError(error)) {
      throw getSecureBackendFallbackError(operation);
    }

    throw error;
  }
}
