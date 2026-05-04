/**
 * Session Management Utility
 * 
 * Implements secure session handling with:
 * - Session timeout
 * - Concurrent session detection
 * - Activity tracking
 * - Automatic cleanup
 */

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute
const MAX_CONCURRENT_SESSIONS = 3;
const SESSION_KEY = 'wasel-session-metadata';

interface SessionMetadata {
  sessionId: string;
  userId: string;
  lastActivity: number;
  createdAt: number;
  deviceId: string;
  ipAddress?: string;
  userAgent?: string;
}

interface SessionStore {
  current: SessionMetadata | null;
  all: SessionMetadata[];
}

/**
 * Generate unique device ID
 */
function generateDeviceId(): string {
  const stored = localStorage.getItem('wasel-device-id');
  if (stored) return stored;
  
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const deviceId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  
  localStorage.setItem('wasel-device-id', deviceId);
  return deviceId;
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get current session metadata
 */
function getSessionStore(): SessionStore {
  if (typeof sessionStorage === 'undefined') {
    return { current: null, all: [] };
  }
  
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return { current: null, all: [] };
    
    return JSON.parse(stored) as SessionStore;
  } catch {
    return { current: null, all: [] };
  }
}

/**
 * Save session metadata
 */
function saveSessionStore(store: SessionStore): void {
  if (typeof sessionStorage === 'undefined') return;
  
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Failed to save session metadata:', error);
  }
}

/**
 * Create new session
 */
export function createSession(userId: string): SessionMetadata {
  const now = Date.now();
  const session: SessionMetadata = {
    sessionId: generateSessionId(),
    userId,
    lastActivity: now,
    createdAt: now,
    deviceId: generateDeviceId(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  
  const store = getSessionStore();
  store.current = session;
  store.all = [session, ...store.all.slice(0, MAX_CONCURRENT_SESSIONS - 1)];
  
  saveSessionStore(store);
  startActivityTracking();
  
  return session;
}

/**
 * Update session activity
 */
export function updateSessionActivity(): void {
  const store = getSessionStore();
  if (!store.current) return;
  
  store.current.lastActivity = Date.now();
  saveSessionStore(store);
}

/**
 * Check if session is expired
 */
export function isSessionExpired(): boolean {
  const store = getSessionStore();
  if (!store.current) return true;
  
  const timeSinceActivity = Date.now() - store.current.lastActivity;
  return timeSinceActivity > SESSION_TIMEOUT_MS;
}

/**
 * Get time until session expires
 */
export function getTimeUntilExpiry(): number {
  const store = getSessionStore();
  if (!store.current) return 0;
  
  const timeSinceActivity = Date.now() - store.current.lastActivity;
  const remaining = SESSION_TIMEOUT_MS - timeSinceActivity;
  
  return Math.max(0, remaining);
}

/**
 * Destroy current session
 */
export function destroySession(): void {
  const store = getSessionStore();
  if (!store.current) return;
  
  store.all = store.all.filter(s => s.sessionId !== store.current?.sessionId);
  store.current = null;
  
  saveSessionStore(store);
  stopActivityTracking();
}

/**
 * Get all active sessions for user
 */
export function getActiveSessions(): SessionMetadata[] {
  const store = getSessionStore();
  const now = Date.now();
  
  return store.all.filter(session => {
    const timeSinceActivity = now - session.lastActivity;
    return timeSinceActivity <= SESSION_TIMEOUT_MS;
  });
}

/**
 * Check for concurrent sessions
 */
export function hasConcurrentSessions(): boolean {
  const active = getActiveSessions();
  return active.length > 1;
}

/**
 * Terminate specific session
 */
export function terminateSession(sessionId: string): void {
  const store = getSessionStore();
  
  if (store.current?.sessionId === sessionId) {
    destroySession();
    return;
  }
  
  store.all = store.all.filter(s => s.sessionId !== sessionId);
  saveSessionStore(store);
}

/**
 * Terminate all other sessions
 */
export function terminateOtherSessions(): void {
  const store = getSessionStore();
  if (!store.current) return;
  
  store.all = [store.current];
  saveSessionStore(store);
}

/**
 * Get current session
 */
export function getCurrentSession(): SessionMetadata | null {
  const store = getSessionStore();
  return store.current;
}

let activityTrackingInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start tracking user activity
 */
function startActivityTracking(): void {
  if (activityTrackingInterval) return;
  if (typeof window === 'undefined') return;
  
  // Update activity on user interactions
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  const updateActivity = () => updateSessionActivity();
  
  events.forEach(event => {
    window.addEventListener(event, updateActivity, { passive: true });
  });
  
  // Check for expiry periodically
  activityTrackingInterval = setInterval(() => {
    if (isSessionExpired()) {
      destroySession();
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
  }, ACTIVITY_CHECK_INTERVAL);
}

/**
 * Stop tracking user activity
 */
function stopActivityTracking(): void {
  if (!activityTrackingInterval) return;
  
  clearInterval(activityTrackingInterval);
  activityTrackingInterval = null;
}

/**
 * Initialize session management
 */
export function initializeSessionManagement(): void {
  if (typeof window === 'undefined') return;
  
  // Clean up expired sessions on load
  const store = getSessionStore();
  const now = Date.now();
  
  store.all = store.all.filter(session => {
    const timeSinceActivity = now - session.lastActivity;
    return timeSinceActivity <= SESSION_TIMEOUT_MS;
  });
  
  if (store.current) {
    const timeSinceActivity = now - store.current.lastActivity;
    if (timeSinceActivity > SESSION_TIMEOUT_MS) {
      store.current = null;
    }
  }
  
  saveSessionStore(store);
  
  // Start tracking if session exists
  if (store.current) {
    startActivityTracking();
  }
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    stopActivityTracking();
  });
}

/**
 * Session warning threshold (5 minutes before expiry)
 */
const WARNING_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Check if session is about to expire
 */
export function isSessionAboutToExpire(): boolean {
  const remaining = getTimeUntilExpiry();
  return remaining > 0 && remaining <= WARNING_THRESHOLD_MS;
}

/**
 * Extend session (refresh activity)
 */
export function extendSession(): void {
  updateSessionActivity();
}

export const SessionManager = {
  createSession,
  updateSessionActivity,
  isSessionExpired,
  getTimeUntilExpiry,
  destroySession,
  getActiveSessions,
  hasConcurrentSessions,
  terminateSession,
  terminateOtherSessions,
  getCurrentSession,
  initializeSessionManagement,
  isSessionAboutToExpire,
  extendSession,
  SESSION_TIMEOUT_MS,
  MAX_CONCURRENT_SESSIONS,
};

export default SessionManager;
