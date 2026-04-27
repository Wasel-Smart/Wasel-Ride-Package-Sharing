/**
 * API Gateway Client — Microservices Communication
 * 
 * Unified client for all microservice communication with:
 * - Circuit breaker protection
 * - Automatic retries
 * - Distributed tracing
 * - Request/response logging
 */

import type { ServiceRegistry } from './serviceRegistry';
import { getServiceEndpoint, buildServiceUrl, isMicroservicesMode } from './serviceRegistry';
import { getCircuitBreaker } from './circuitBreaker';

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  traceId?: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
  traceId?: string;
}

class ApiGatewayClient {
  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout),
    );
    return Promise.race([promise, timeoutPromise]);
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries: number,
    delay = 1000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.executeWithRetry(fn, retries - 1, delay * 2);
    }
  }

  async request<T = unknown>(
    serviceName: keyof ServiceRegistry,
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const service = getServiceEndpoint(serviceName);
    const url = buildServiceUrl(serviceName, path);
    const traceId = options.traceId || this.generateTraceId();
    const timeout = options.timeout || service.timeout;
    const retries = options.retries ?? service.retries;

    const circuitBreaker = getCircuitBreaker(service.name, service.circuitBreaker);

    const headers = new Headers(options.headers);
    headers.set('X-Trace-Id', traceId);
    headers.set('X-Service-Version', service.version);
    
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const fetchFn = async () => {
      const response = await this.executeWithTimeout(
        fetch(url, { ...options, headers }),
        timeout,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        data: data as T,
        status: response.status,
        headers: response.headers,
        traceId,
      };
    };

    return circuitBreaker.execute(() => this.executeWithRetry(fetchFn, retries));
  }

  async get<T = unknown>(
    serviceName: keyof ServiceRegistry,
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(serviceName, path, { ...options, method: 'GET' });
  }

  async post<T = unknown>(
    serviceName: keyof ServiceRegistry,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(serviceName, path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T = unknown>(
    serviceName: keyof ServiceRegistry,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(serviceName, path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T = unknown>(
    serviceName: keyof ServiceRegistry,
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(serviceName, path, { ...options, method: 'DELETE' });
  }

  async healthCheck(serviceName: keyof ServiceRegistry): Promise<boolean> {
    try {
      const service = getServiceEndpoint(serviceName);
      const response = await fetch(`${service.baseUrl}${service.healthCheck}`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiGateway = new ApiGatewayClient();
