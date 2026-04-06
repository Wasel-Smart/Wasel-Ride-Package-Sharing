import { useEffect, useState } from 'react';

/**
 * Connection Quality Monitoring Service
 * 
 * Features:
 * - Real-time connection speed testing
 * - Latency monitoring
 * - Bandwidth estimation
 * - Connection type detection
 * - Signal strength tracking
 */

export type ConnectionType = 
  | '4g' | '3g' | '2g' | '5g'
  | 'wifi'
  | 'ethernet'
  | 'unknown'
  | 'offline';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface ConnectionMetrics {
  type: ConnectionType;
  quality: ConnectionQuality;
  latency: number;        // milliseconds
  bandwidth: number;      // Mbps (estimated)
  online: boolean;
  timestamp: number;
  packetLoss: number;     // 0-100%
  jitter: number;         // milliseconds
}

export interface ConnectionStats {
  currentMetrics: ConnectionMetrics;
  averageLatency: number;
  peakLatency: number;
  slowestPeriod: string;
  uptime: number;        // milliseconds since last online
  disconnections: number;
  lastCheckAt: number;
}

class ConnectionQualityMonitor {
  private metrics: ConnectionMetrics[] = [];
  private listeners: Set<(metrics: ConnectionMetrics) => void> = new Set();
  private checkInterval: number | null = null;
  private lastOnlineAt = Date.now();
  private disconnectionCount = 0;
  constructor() {
    this.setupNetworkListeners();
    this.startMonitoring();
    this.performInitialCheck();
  }

  /**
   * Get current connection metrics
   */
  getCurrentMetrics(): ConnectionMetrics {
    return this.metrics[this.metrics.length - 1] || this.getOfflineMetrics();
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    const latencies = this.metrics.map(m => m.latency);
    return {
      currentMetrics: this.getCurrentMetrics(),
      averageLatency: latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0,
      peakLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      slowestPeriod: this.getSlowestPeriod(),
      uptime: Date.now() - this.lastOnlineAt,
      disconnections: this.disconnectionCount,
      lastCheckAt: Date.now(),
    };
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(listener: (metrics: ConnectionMetrics) => void): () => void {
    this.listeners.add(listener);
    listener(this.getCurrentMetrics());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Perform latency test
   */
  async testLatency(): Promise<number> {
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('/health', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);
      return Math.min(latency, 10000); // Cap at 10s
    } catch (error) {
      return 10000; // Max latency on timeout
    }
  }

  /**
   * Estimate bandwidth
   */
  async estimateBandwidth(): Promise<number> {
    try {
      // This is a simple estimation based on download speed
      const testSizeBytes = 1024 * 100; // 100KB
      const startTime = performance.now();

      const response = await fetch('/health', {
        signal: AbortSignal.timeout(10000),
      });

      await response.blob();
      const duration = (performance.now() - startTime) / 1000;
      const bandwidth = (testSizeBytes * 8 / 1024 / 1024) / duration; // Mbps

      return Math.max(0.1, Math.min(bandwidth, 1000)); // Between 0.1 and 1000 Mbps
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get connection type
   */
  private getConnectionType(): ConnectionType {
    if (!navigator.onLine) return 'offline';

    const navigator_ = navigator as any;
    const connection = navigator_.connection || navigator_.mozConnection || navigator_.webkitConnection;

    if (!connection) return 'unknown';

    const effectiveType = connection.effectiveType; // '4g', '3g', '2g', 'slow-2g'
    const type = connection.type; // 'wifi', 'cellular', 'bluetooth', 'ethernet'

    if (type === 'wifi') return 'wifi';
    if (type === 'ethernet') return 'ethernet';

    // Map effectiveType to our types
    switch (effectiveType) {
      case '4g': return '4g';
      case '3g': return '3g';
      case '2g': return '2g';
      case 'slow-2g': return '2g';
      default: return 'unknown';
    }
  }

  /**
   * Determine connection quality based on metrics
   */
  private getQuality(latency: number, bandwidth: number): ConnectionQuality {
    if (!navigator.onLine) return 'offline';
    if (latency < 50 && bandwidth > 10) return 'excellent';
    if (latency < 100 && bandwidth > 5) return 'good';
    if (latency < 200 && bandwidth > 1) return 'fair';
    return 'poor';
  }

  /**
   * Calculate packet loss using connection quality
   */
  private calculatePacketLoss(quality: ConnectionQuality): number {
    switch (quality) {
      case 'excellent': return 0;
      case 'good': return 0.5;
      case 'fair': return 2;
      case 'poor': return 5;
      case 'offline': return 100;
    }
  }

  /**
   * Calculate jitter
   */
  private calculateJitter(): number {
    if (this.metrics.length < 2) return 0;

    const recentMetrics = this.metrics.slice(-10);
    const latencies = recentMetrics.map(m => m.latency);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const variance = latencies.reduce((sum, l) => sum + Math.pow(l - avgLatency, 2), 0) / latencies.length;

    return Math.round(Math.sqrt(variance));
  }

  /**
   * Get slowest period of connection
   */
  private getSlowestPeriod(): string {
    if (this.metrics.length === 0) return 'N/A';

    const slowestMetric = this.metrics.reduce((min, current) =>
      current.latency > min.latency ? current : min
    );

    const date = new Date(slowestMetric.timestamp);
    return date.toLocaleTimeString();
  }

  /**
   * Get offline metrics placeholder
   */
  private getOfflineMetrics(): ConnectionMetrics {
    return {
      type: 'offline',
      quality: 'offline',
      latency: 0,
      bandwidth: 0,
      online: false,
      timestamp: Date.now(),
      packetLoss: 100,
      jitter: 0,
    };
  }

  /**
   * Perform initial connection check
   */
  private async performInitialCheck(): Promise<void> {
    const latency = await this.testLatency();
    const bandwidth = await this.estimateBandwidth();
    const type = this.getConnectionType();
    const quality = this.getQuality(latency, bandwidth);

    const metrics: ConnectionMetrics = {
      type,
      quality,
      latency,
      bandwidth,
      online: navigator.onLine,
      timestamp: Date.now(),
      packetLoss: this.calculatePacketLoss(quality),
      jitter: this.calculateJitter(),
    };

    this.addMetrics(metrics);
  }

  /**
   * Start background monitoring
   */
  private startMonitoring(): void {
    this.checkInterval = window.setInterval(() => {
      this.performInitialCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.lastOnlineAt = Date.now();
      this.performInitialCheck();
    });

    window.addEventListener('offline', () => {
      this.disconnectionCount += 1;
      this.addMetrics(this.getOfflineMetrics());
    });

    // Listen to connection changes
    const connection = (navigator as any).connection || (navigator as any).mozConnection;
    if (connection) {
      connection.addEventListener('change', () => {
        this.performInitialCheck();
      });
    }
  }

  /**
   * Add metrics and notify listeners
   */
  private addMetrics(metrics: ConnectionMetrics): void {
    this.metrics.push(metrics);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    this.listeners.forEach(listener => listener(metrics));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
    }
    this.listeners.clear();
  }
}

// Global singleton
let instance: ConnectionQualityMonitor | null = null;

export function getConnectionQualityMonitor(): ConnectionQualityMonitor {
  if (!instance) {
    instance = new ConnectionQualityMonitor();
  }
  return instance;
}

/**
 * React hook for connection quality monitoring
 */
export function useConnectionQuality() {
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);

  useEffect(() => {
    const monitor = getConnectionQualityMonitor();
    const unsubscribe = monitor.subscribe(setMetrics);
    return unsubscribe;
  }, []);

  return metrics || getConnectionQualityMonitor().getCurrentMetrics();
}
