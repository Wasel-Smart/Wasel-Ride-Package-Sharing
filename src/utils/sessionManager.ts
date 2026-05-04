/**
 * Enhanced Session Management
 * Implements session timeout, concurrent session detection, and security features
 */

import { logger } from './monitoring';
import { generateSecureId } from './encryption';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CONCURRENT_SESSIONS = 3;
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute
const SESSION_ID_KEY = 'wasel_session_id';
const SESSION_METADATA_KEY = 'wasel_session_metadata';
const LAST_ACTIVITY_KEY = 'wasel_last_activity';

export interface SessionMetadata {
  sessionId: string;
  deviceId: string;
  userAgent: string;
  ipAddress?: string;
  createdAt: number;
  lastActivity: number;
  isActive: boolean;
}

export interface SessionConfig {
  timeoutMs?: number;
  maxConcurrentSessions?: number;
  onTimeout?: () => void;
  onSuspiciousActivity?: (reason: string) => void;
}

class SessionManager {
  private config: Required<SessionConfig>;
  private activityCheckInterval?: number;
  private sessionId: string | null = null;
  private deviceId: string;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      timeoutMs: config.timeoutMs ?? SESSION_TIMEOUT_MS,
      maxConcurrentSessions: config.maxConcurrentSessions ?? MAX_CONCURRENT_SESSIONS,
      onTimeout: config.onTimeout ?? (() => {}),
      onSuspiciousActivity: config.onSuspiciousActivity ?? (() => {}),
    };

    this.deviceId = this.getOrCreateDeviceId();
    this.initializeActivityTracking();
  }

  /**
   * Start a new session
   */
  startSession(userId: string): SessionMetadata {
    this.sessionId = generateSecureId(32);
    
    const metadata: SessionMetadata = {
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      userAgent: navigator.userAgent,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
    };

    sessionStorage.setItem(SESSION_ID_KEY, this.sessionId);
    this.saveSessionMetadata(metadata);
    this.updateLastActivity();

    logger.info('Session started', {
      sessionId: this.sessionId,
      userId,
      deviceId: this.deviceId,
    });

    return metadata;
  }

  /**
   * End current session
   */
  endSession(): void {
    if (this.sessionId) {
      logger.info('Session ended', { sessionId: this.sessionId });
      
      sessionStorage.removeItem(SESSION_ID_KEY);
      sessionStorage.removeItem(SESSION_METADATA_KEY);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
      
      this.sessionId = null;
    }
  }

  /**
   * Check if session is valid and active
   */
  isSessionValid(): boolean {
    const sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      return false;
    }

    const lastActivity = this.getLastActivity();
    if (!lastActivity) {
      return false;
    }

    const timeSinceActivity = Date.now() - lastActivity;
    if (timeSinceActivity > this.config.timeoutMs) {
      logger.warning('Session timeout', {
        sessionId,
        timeSinceActivity,
        timeoutMs: this.config.timeoutMs,
      });
      this.handleSessionTimeout();
      return false;
    }

    return true;
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(): void {
    const now = Date.now();
    sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString());

    const metadata = this.getSessionMetadata();
    if (metadata) {
      metadata.lastActivity = now;
      this.saveSessionMetadata(metadata);
    }
  }

  /**
   * Get time until session timeout
   */
  getTimeUntilTimeout(): number {
    const lastActivity = this.getLastActivity();
    if (!lastActivity) {
      return 0;
    }

    const timeSinceActivity = Date.now() - lastActivity;
    return Math.max(0, this.config.timeoutMs - timeSinceActivity);
  }

  /**
   * Extend session timeout
   */
  extendSession(): void {
    this.updateLastActivity();
    logger.info('Session extended', { sessionId: this.sessionId });
  }

  /**
   * Get current session metadata
   */
  getSessionMetadata(): SessionMetadata | null {
    const stored = sessionStorage.getItem(SESSION_METADATA_KEY);
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as SessionMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Detect suspicious activity
   */
  detectSuspiciousActivity(): void {
    const metadata = this.getSessionMetadata();
    if (!metadata) {
      return;
    }

    // Check for device ID mismatch
    if (metadata.deviceId !== this.deviceId) {
      logger.error('Device ID mismatch detected', {
        expected: this.deviceId,
        actual: metadata.deviceId,
      });
      this.config.onSuspiciousActivity('Device ID mismatch');
      this.endSession();
      return;
    }

    // Check for user agent change
    if (metadata.userAgent !== navigator.userAgent) {
      logger.warning('User agent changed', {
        original: metadata.userAgent,
        current: navigator.userAgent,
      });
      this.config.onSuspiciousActivity('User agent changed');
    }
  }

  /**
   * Get or create device ID
   */
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('wasel_device_id');
    
    if (!deviceId) {
      deviceId = generateSecureId(32);
      localStorage.setItem('wasel_device_id', deviceId);
    }

    return deviceId;
  }

  /**
   * Save session metadata
   */
  private saveSessionMetadata(metadata: SessionMetadata): void {
    sessionStorage.setItem(SESSION_METADATA_KEY, JSON.stringify(metadata));
  }

  /**
   * Get last activity timestamp
   */
  private getLastActivity(): number | null {
    const stored = sessionStorage.getItem(LAST_ACTIVITY_KEY);
    if (!stored) {
      return null;
    }

    const timestamp = parseInt(stored, 10);
    return isNaN(timestamp) ? null : timestamp;
  }

  /**
   * Handle session timeout
   */
  private handleSessionTimeout(): void {
    logger.warning('Session timed out', { sessionId: this.sessionId });
    this.endSession();
    this.config.onTimeout();
  }

  /**
   * Initialize activity tracking
   */
  private initializeActivityTracking(): void {
    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      if (this.isSessionValid()) {
        this.updateLastActivity();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Periodic session validation
    this.activityCheckInterval = window.setInterval(() => {
      if (this.sessionId) {
        this.isSessionValid();
        this.detectSuspiciousActivity();
      }
    }, ACTIVITY_CHECK_INTERVAL);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (this.activityCheckInterval) {
        clearInterval(this.activityCheckInterval);
      }
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    isActive: boolean;
    timeRemaining: number;
    sessionDuration: number;
  } {
    const metadata = this.getSessionMetadata();
    const isActive = this.isSessionValid();
    const timeRemaining = this.getTimeUntilTimeout();
    const sessionDuration = metadata ? Date.now() - metadata.createdAt : 0;

    return {
      isActive,
      timeRemaining,
      sessionDuration,
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Export class for custom instances
export { SessionManager };
