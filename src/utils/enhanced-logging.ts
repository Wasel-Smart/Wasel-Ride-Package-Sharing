/**
 * Enhanced Logging System - Wasel | واصل
 * 
 * Features:
 * - Structured logging with consistent format
 * - Log levels with filtering
 * - Performance tracking
 * - Error context preservation
 * - Production-safe logging
 * - External service integration
 */

import { getConfig } from './env';
import { normalizeError, type WaselError } from './errors';
import { redactSensitiveValue } from './redaction';
import { sanitizeForLog, sanitizeObjectForLog } from './logSanitizer';

type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: WaselError;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  performance?: {
    duration?: number;
    memory?: number;
  };
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enablePerformanceTracking: boolean;
  maxLogEntries: number;
}

export interface MonitoringSink {
  captureException: (error: Error | unknown, context?: Record<string, unknown>) => void;
  captureMessage: (
    message: string,
    level: 'info' | 'warning' | 'error',
    context?: Record<string, unknown>,
  ) => void;
  addBreadcrumb: (message: string, category: string, data?: Record<string, unknown>) => void;
}

class WaselLogger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private sessionId: string;
  private performanceMarks = new Map<string, number>();
  private monitoringSink: MonitoringSink | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.config = this.getLoggerConfig();
    this.setupGlobalErrorHandling();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLoggerConfig(): LoggerConfig {
    const config = getConfig();
    const isDev = config.environment === 'development';
    const isTest = config.environment === 'test';

    return {
      minLevel: isDev ? 'debug' : isTest ? 'warning' : 'info',
      enableConsole: isDev || isTest,
      enableRemote: !isDev && !isTest,
      enablePerformanceTracking: true,
      maxLogEntries: isDev ? 1000 : 100,
    };
  }

  private setupGlobalErrorHandling(): void {
    if (typeof window === 'undefined') {return;}

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled JavaScript error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
        stack: event.reason?.stack,
      });
    });
  }

  registerMonitoringSink(sink: MonitoringSink | null): void {
    this.monitoringSink = sink;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warning', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.config.minLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: unknown
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
    };

    if (context) {
      entry.context = this.sanitizeContext(context);
    }

    if (error) {
      entry.error = normalizeError(error);
    }

    // Add performance data if available
    if (this.config.enablePerformanceTracking && typeof performance !== 'undefined') {
      entry.performance = {
        memory: (performance as any).memory?.usedJSHeapSize,
      };
    }

    return entry;
  }

  private sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    return redactSensitiveValue(context) as Record<string, unknown>;
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) {return;}

    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const message = `${prefix} ${sanitizeForLog(entry.message)}`;
    const sanitizedContext = entry.context ? sanitizeObjectForLog(entry.context) : undefined;
    const sanitizedError = entry.error ? sanitizeForLog(JSON.stringify(entry.error)) : undefined;

    switch (entry.level) {
      case 'debug':
        console.debug(message, sanitizedContext, sanitizedError);
        break;
      case 'info':
        console.info(message, sanitizedContext);
        break;
      case 'warning':
        console.warn(message, sanitizedContext, sanitizedError);
        break;
      case 'error':
      case 'critical':
        console.error(message, sanitizedContext, sanitizedError);
        break;
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.config.maxLogEntries) {
      this.logBuffer = this.logBuffer.slice(-this.config.maxLogEntries);
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.monitoringSink) {return;}

    try {
      if (entry.level === 'error' || entry.level === 'critical') {
        this.monitoringSink.captureException(entry.error || new Error(entry.message), {
          tags: {
            level: entry.level,
            sessionId: entry.sessionId,
          },
          contexts: {
            wasel: entry.context,
          },
        });
      } else {
        this.monitoringSink.captureMessage(entry.message, entry.level as any, {
          level: entry.level,
          sessionId: entry.sessionId,
          ...entry.context,
        });
      }
    } catch (error) {
      // Fail silently to avoid logging loops
      console.warn('Failed to send log to remote service:', sanitizeForLog(String(error)));
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): void {
    if (!this.shouldLog(level)) {return;}

    const entry = this.createLogEntry(level, message, context, error);
    
    this.writeToConsole(entry);
    this.addToBuffer(entry);
    
    // Send to remote service asynchronously
    if (this.config.enableRemote) {
      setTimeout(() => this.sendToRemote(entry), 0);
    }
  }

  // Public API
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
    
    // Send important info to monitoring
    if (context?.important && this.monitoringSink) {
      this.monitoringSink.captureMessage(message, 'info', {
        level: 'info',
        tags: { type: 'application_info' },
        ...this.sanitizeContext(context),
      });
    }
  }

  warning(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.log('warning', message, context, error);
    
    if (this.monitoringSink) {
      this.monitoringSink.captureMessage(message, 'warning', {
        level: 'warning',
        tags: { type: 'application_warning' },
        ...this.sanitizeContext(context || {}),
      });
    }
  }

  error(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.log('error', message, context, error);
    
    if (this.monitoringSink) {
      this.monitoringSink.captureException(error || new Error(message), {
        level: 'error',
        tags: { type: 'application_error' },
        ...this.sanitizeContext(context || {}),
      });
    }
  }

  critical(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.log('critical', message, context, error);
    
    if (this.monitoringSink) {
      this.monitoringSink.captureException(error || new Error(message), {
        level: 'error',
        tags: { type: 'critical_error' },
        ...this.sanitizeContext(context || {}),
      });
    }
  }

  // Performance tracking
  startTimer(label: string): void {
    if (!this.config.enablePerformanceTracking) {return;}
    this.performanceMarks.set(label, performance.now());
  }

  endTimer(label: string, context?: Record<string, unknown>): void {
    if (!this.config.enablePerformanceTracking) {return;}
    
    const startTime = this.performanceMarks.get(label);
    if (startTime === undefined) {
      this.warning(`Timer '${label}' was not started`);
      return;
    }

    const duration = performance.now() - startTime;
    this.performanceMarks.delete(label);
    
    this.info(`Performance: ${label}`, {
      ...context,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
    });
  }

  // Breadcrumb tracking
  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    if (this.monitoringSink) {
      this.monitoringSink.addBreadcrumb(message, category, this.sanitizeContext(data || {}));
    }
  }

  // Transaction tracking
  startTransaction(name: string, op: string) {
    this.addBreadcrumb(`Transaction: ${name}`, 'performance', { op });
    return { finish: () => undefined };
  }

  // Get recent logs for debugging
  getRecentLogs(count = 50): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  // Clear log buffer
  clearLogs(): void {
    this.logBuffer = [];
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }
}

// Create singleton instance
export const logger = new WaselLogger();

// Convenience functions
export function trackAPICall(
  url: string,
  method: string,
  duration: number,
  status: number,
  error?: unknown
): void {
  const context = {
    url: sanitizeForLog(url),
    method: sanitizeForLog(method),
    duration,
    status,
    important: status >= 400 || duration > 5000, // Mark slow or failed requests as important
  };

  logger.addBreadcrumb(`API ${sanitizeForLog(method)} ${sanitizeForLog(url)}`, 'api', context);

  if (status >= 400) {
    logger.warning(`API call failed: ${sanitizeForLog(method)} ${sanitizeForLog(url)}`, context, error);
  } else if (duration > 5000) {
    logger.warning(`Slow API call: ${sanitizeForLog(method)} ${sanitizeForLog(url)}`, context);
  } else {
    logger.debug(`API call: ${sanitizeForLog(method)} ${sanitizeForLog(url)}`, context);
  }
}

export function trackUserAction(action: string, data?: Record<string, unknown>): void {
  logger.addBreadcrumb(action, 'user_action', data);
}

export function trackNavigation(from: string, to: string): void {
  logger.addBreadcrumb(`Navigation: ${from} -> ${to}`, 'navigation', {
    from,
    to,
  });
}

export function usePerformanceMonitoring(componentName: string) {
  const transaction = logger.startTransaction(componentName, 'component.render');

  return () => {
    transaction.finish();
  };
}

// Register monitoring sink function
export function registerMonitoringSink(sink: MonitoringSink | null): void {
  logger.registerMonitoringSink(sink);
}

// Export types for external use
export type { LogLevel, LogEntry, LoggerConfig };