/**
 * Offline Request Queue Service
 * 
 * Features:
 * - Persistent offline request queuing
 * - Request deduplication
 * - Exponential backoff retry strategy
 * - Intelligent cache invalidation
 * - Connection state tracking
 * - Request prioritization
 */

export type QueuedRequestPriority = 'critical' | 'high' | 'normal' | 'low';

export interface QueuedRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  body?: any;
  headers?: Record<string, string>;
  priority: QueuedRequestPriority;
  retries: number;
  maxRetries: number;
  timestamp: number;
  deduplicationKey?: string;
}

function isSafeQueueMethod(method: string): boolean {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

export interface QueueStats {
  totalQueued: number;
  highPriority: number;
  normalPriority: number;
  lowPriority: number;
  oldestRequest: number | null;
  averageRetries: number;
}

const STORAGE_KEY = 'wasel_offline_queue';
const MAX_QUEUE_SIZE = 100;
const DEDUPLICATION_TIMEOUT = 60000; // 1 minute

class OfflineQueueManager {
  private queue: Map<string, QueuedRequest> = new Map();
  private listeners: Set<(stats: QueueStats) => void> = new Set();
  private isProcessing = false;
  private lastProcessAt = 0;
  private deduplicationMap: Map<string, string> = new Map(); // key -> requestId

  constructor() {
    this.loadFromStorage();
    this.setupNetworkListeners();
    this.setupPeriodicProcessing();
  }

  /**
   * Add a request to the queue
   */
  addRequest(
    method: string,
    url: string,
    options?: {
      body?: any;
      headers?: Record<string, string>;
      priority?: QueuedRequestPriority;
      maxRetries?: number;
      deduplicationKey?: string;
    }
  ): string {
    const priority = options?.priority ?? 'normal';
    const deduplicationKey = options?.deduplicationKey;

    // Check for duplicate
    if (deduplicationKey) {
      const existingId = this.deduplicationMap.get(deduplicationKey);
      if (existingId && this.queue.has(existingId)) {
        return existingId; // Return existing request ID instead of creating duplicate
      }
    }

    // Check queue size
    if (this.queue.size >= MAX_QUEUE_SIZE) {
      this.removeLowestPriorityRequest();
    }

    const requestId = this.generateRequestId();
    const request: QueuedRequest = {
      id: requestId,
      method: method as QueuedRequest['method'],
      url,
      body: options?.body,
      headers: options?.headers,
      priority,
      retries: 0,
      maxRetries: options?.maxRetries ?? 5,
      timestamp: Date.now(),
      deduplicationKey,
    };

    this.queue.set(requestId, request);

    // Track deduplication
    if (deduplicationKey) {
      this.deduplicationMap.set(deduplicationKey, requestId);
      // Clean up dedup key after timeout
      setTimeout(() => {
        this.deduplicationMap.delete(deduplicationKey);
      }, DEDUPLICATION_TIMEOUT);
    }

    this.saveToStorage();
    this.notifyListeners();
    this.processQueue(); // Try to process immediately

    return requestId;
  }

  /**
   * Remove request from queue
   */
  removeRequest(requestId: string): boolean {
    const request = this.queue.get(requestId);
    if (!request) return false;

    this.queue.delete(requestId);

    // Clean up dedup mapping
    if (request.deduplicationKey) {
      this.deduplicationMap.delete(request.deduplicationKey);
    }

    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const requests = Array.from(this.queue.values());
    const highPriority = requests.filter(r => r.priority === 'critical' || r.priority === 'high').length;
    const normalPriority = requests.filter(r => r.priority === 'normal').length;
    const averageRetries = requests.length > 0
      ? requests.reduce((sum, r) => sum + r.retries, 0) / requests.length
      : 0;

    return {
      totalQueued: this.queue.size,
      highPriority,
      normalPriority,
      lowPriority: requests.filter(r => r.priority === 'low').length,
      oldestRequest: requests.length > 0 ? Math.min(...requests.map(r => r.timestamp)) : null,
      averageRetries: Math.round(averageRetries * 100) / 100,
    };
  }

  /**
   * Subscribe to queue stats changes
   */
  subscribe(listener: (stats: QueueStats) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStats());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clear all queued requests
   */
  clear(): void {
    this.queue.clear();
    this.deduplicationMap.clear();
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Process queue when connection is back
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;

    try {
      // Sort by priority: critical > high > normal > low
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const sortedRequests = Array.from(this.queue.values()).sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );

      for (const request of sortedRequests) {
        if (!navigator.onLine) break;

        try {
          const response = await this.executeRequest(request);

          if (response.ok) {
            this.removeRequest(request.id);
            this.lastProcessAt = Date.now();
          } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            // Don't retry 4xx errors except 429 (rate limit)
            this.removeRequest(request.id);
          } else {
            // Retry with exponential backoff
            this.retryRequest(request);
          }
        } catch (error) {
          this.retryRequest(request);
        }

        // Rate limiting: wait between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessing = false;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Execute a request with proper headers and timeout
   */
  private executeRequest(request: QueuedRequest): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    return fetch(request.url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
  }

  /**
   * Retry request with exponential backoff
   */
  private retryRequest(request: QueuedRequest): void {
    if (request.retries < request.maxRetries) {
      request.retries += 1;
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const backoffMs = Math.pow(2, request.retries - 1) * 1000;
      
      // Schedule retry
      setTimeout(() => {
        if (this.queue.has(request.id) && navigator.onLine) {
          this.executeRequest(request)
            .then(response => {
              if (response.ok) {
                this.removeRequest(request.id);
              } else {
                this.retryRequest(request);
              }
            })
            .catch(() => this.retryRequest(request));
        }
      }, backoffMs);

      this.saveToStorage();
      this.notifyListeners();
    } else {
      // Max retries exceeded - remove request
      this.removeRequest(request.id);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedRequest[];
        parsed.forEach(req => this.queue.set(req.id, req));
      }
    } catch (error) {
      console.warn('[OfflineQueue] Failed to load from storage:', error);
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    try {
      const requests = Array.from(this.queue.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    } catch (error) {
      console.warn('[OfflineQueue] Failed to save to storage:', error);
    }
  }

  /**
   * Setup network listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.notifyListeners();
    });
  }

  /**
   * Setup periodic processing
   */
  private setupPeriodicProcessing(): void {
    setInterval(() => {
      if (navigator.onLine && Date.now() - this.lastProcessAt > 30000) {
        this.processQueue();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Remove lowest priority request when queue is full
   */
  private removeLowestPriorityRequest(): void {
    let lowestPriorityRequest: QueuedRequest | null = null;
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };

    for (const request of this.queue.values()) {
      if (!lowestPriorityRequest || priorityOrder[request.priority] > priorityOrder[lowestPriorityRequest.priority]) {
        lowestPriorityRequest = request;
      }
    }

    if (lowestPriorityRequest) {
      this.removeRequest(lowestPriorityRequest.id);
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => listener(stats));
  }
}

// Global singleton instance
let instance: OfflineQueueManager | null = null;

export function getOfflineQueueManager(): OfflineQueueManager {
  if (!instance) {
    instance = new OfflineQueueManager();
  }
  return instance;
}

/**
 * Fetch wrapper that uses offline queue when needed
 */
export async function fetchWithOfflineQueue(
  url: string,
  options?: RequestInit & {
    priority?: QueuedRequestPriority;
    deduplicationKey?: string;
    offlineQueueable?: boolean;
  }
): Promise<Response> {
  const manager = getOfflineQueueManager();
  const method = (options?.method ?? 'GET').toUpperCase();
  const canQueueOffline = options?.offlineQueueable ?? isSafeQueueMethod(method);

  // Try to fetch immediately
  try {
    const response = await fetch(url, options);
    if (response.ok) return response;

    // Queue on 5xx or 429 errors
    if ((response.status >= 500 || response.status === 429) && canQueueOffline) {
      manager.addRequest(
        method as QueuedRequest['method'],
        url,
        {
          body: options?.body,
          headers: options?.headers as Record<string, string>,
          priority: options?.priority,
          deduplicationKey: options?.deduplicationKey,
        }
      );
    }

    return response;
  } catch (error) {
    if (canQueueOffline) {
      manager.addRequest(
        method as QueuedRequest['method'],
        url,
        {
          body: options?.body,
          headers: options?.headers as Record<string, string>,
          priority: options?.priority,
          deduplicationKey: options?.deduplicationKey,
        }
      );
    } else {
      throw error;
    }

    // Return a pending response placeholder
    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      statusText: 'Queued for later',
    });
  }
}
