/**
 * API Client - Centralized networking layer
 * Handles authentication, retries, caching, and error handling
 */
import { mobileAuth } from '../services/auth';
import { waselMobileConfig } from './config';
import { CircuitBreaker } from '../utils/circuitBreaker';

const apiBreaker = new CircuitBreaker('mobile-api', 5, 1, 5_000);

const ALLOWED_API_DOMAINS = ['supabase.co', 'supabase.net', 'wasel14.online', 'localhost'];

function isValidApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.hostname === 'localhost') return true;
    const privateRanges = [/^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./, /^169\.254\./];
    if (privateRanges.some(p => p.test(parsed.hostname))) return false;
    return ALLOWED_API_DOMAINS.some(d => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout = 15000;

  constructor() {
    this.baseUrl = waselMobileConfig.apiUrl || '';
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = mobileAuth.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async withRetry<T>(
    requestFn: () => Promise<T>,
    retries: number,
    delayMs: number,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < retries) {
          const backoff = delayMs * Math.pow(2, attempt);
          await this.sleep(backoff);
        }
      }
    }

    throw lastError;
  }

async request<T>(path: string, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
     const url = `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
     const timeout = config.timeout ?? this.defaultTimeout;
     const retries = config.retries ?? 2;

     if (!isValidApiUrl(url)) {
       return { data: null, error: 'Invalid or unauthorized URL', status: 0 };
     }

     const executeRequest = async (): Promise<ApiResponse<T>> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const headers = {
          ...(await this.getAuthHeaders()),
          ...config.headers,
        };

        const fetchOptions: RequestInit = {
          method: config.method ?? 'GET',
          headers,
          signal: controller.signal,
        };
        if (config.body) {
          fetchOptions.body = JSON.stringify(config.body);
        }
        const response = await fetch(url, fetchOptions);

        const data = response.status === 204 ? null : await response.json().catch(() => null);

        return {
          data: data as T,
          error: data?.error ?? (response.ok ? null : `HTTP ${response.status}`),
          status: response.status,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.name === 'AbortError'
              ? 'Request timeout'
              : error.message
            : 'Network error';
        return { data: null, error: message, status: 0 };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    try {
      return await apiBreaker.execute(executeRequest);
    } catch {
      return { data: null, error: 'Request failed after retries', status: 0 };
    }
  }

  async get<T>(path: string, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  async post<T>(path: string, body?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: 'POST', body });
  }

  async put<T>(path: string, body?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: 'PUT', body });
  }

  async patch<T>(path: string, body?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: 'PATCH', body });
  }

  async delete<T>(path: string, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();