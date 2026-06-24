/**
 * userBehaviorAnalytics.ts — Wasel user behaviour tracking
 *
 * Captures:
 *  • Session events (page views, clicks, search interactions)
 *  • Funnel steps (search → select → book → complete)
 *  • Cohort signals (new vs returning, day-of-week patterns)
 *  • Retention markers (last seen, streak, churn risk)
 *
 * Data is persisted locally and flushed to Supabase growthEngine
 * in batches to keep network cost minimal.
 */

import { trackGrowthEvent } from './growthEngine';
import { allowLocalPersistenceFallback } from './runtimePolicy';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FunnelStage = 'searched' | 'selected' | 'booked' | 'completed' | 'cancelled';
export type ServiceType = 'ride' | 'bus' | 'package' | 'referral' | 'wallet';

export interface SessionEvent {
  type: 'page_view' | 'search' | 'click' | 'filter' | 'scroll_depth' | 'error';
  label: string;
  value?: number;
  timestamp: string;
}

export interface UserSession {
  id: string;
  userId?: string;
  startedAt: string;
  lastActivityAt: string;
  pageViews: number;
  searches: number;
  events: SessionEvent[];
}

export interface RetentionProfile {
  firstSeenAt: string;
  lastSeenAt: string;
  totalSessions: number;
  totalSearches: number;
  totalBookings: number;
  streakDays: number;
  churnRisk: 'low' | 'medium' | 'high';
  cohort: 'new' | 'returning' | 'loyal' | 'at-risk';
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const SESSION_KEY = 'wasel-uba-session';
const RETENTION_KEY = 'wasel-uba-retention';
const FLUSH_QUEUE_KEY = 'wasel-uba-flush-queue';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min inactivity = new session

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ─── Session management ───────────────────────────────────────────────────────

function getOrCreateSession(userId?: string): UserSession {
  const existing = readJson<UserSession | null>(SESSION_KEY, null);
  const now = Date.now();

  if (
    existing &&
    now - new Date(existing.lastActivityAt).getTime() < SESSION_TIMEOUT_MS
  ) {
    return { ...existing, lastActivityAt: new Date().toISOString() };
  }

  // New session
  return {
    id: genId(),
    userId,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    pageViews: 0,
    searches: 0,
    events: [],
  };
}

function saveSession(session: UserSession): void {
  writeJson(SESSION_KEY, {
    ...session,
    events: session.events.slice(-50), // keep last 50 events per session
  });
}

// ─── Retention profile ────────────────────────────────────────────────────────

function getRetentionProfile(): RetentionProfile {
  return readJson<RetentionProfile>(RETENTION_KEY, {
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    totalSessions: 0,
    totalSearches: 0,
    totalBookings: 0,
    streakDays: 0,
    churnRisk: 'low',
    cohort: 'new',
  });
}

function updateRetentionProfile(patch: Partial<RetentionProfile>): RetentionProfile {
  const current = getRetentionProfile();
  const updated = { ...current, ...patch };
  writeJson(RETENTION_KEY, updated);
  return updated;
}

function computeChurnRisk(profile: RetentionProfile): 'low' | 'medium' | 'high' {
  const daysSinceLastSeen =
    (Date.now() - new Date(profile.lastSeenAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastSeen > 21) return 'high';
  if (daysSinceLastSeen > 7) return 'medium';
  return 'low';
}

function computeCohort(profile: RetentionProfile): RetentionProfile['cohort'] {
  if (profile.totalSessions <= 1) return 'new';
  if (profile.totalBookings >= 5 && profile.streakDays >= 3) return 'loyal';
  if (computeChurnRisk(profile) !== 'low') return 'at-risk';
  return 'returning';
}

// ─── Flush queue ──────────────────────────────────────────────────────────────

interface FlushItem {
  eventName: string;
  funnelStage: FunnelStage;
  serviceType: ServiceType;
  from?: string;
  to?: string;
  valueJod?: number;
  userId?: string;
}

function enqueueFlush(item: FlushItem): void {
  if (!allowLocalPersistenceFallback()) return;
  const queue = readJson<FlushItem[]>(FLUSH_QUEUE_KEY, []);
  writeJson(FLUSH_QUEUE_KEY, [...queue, item].slice(-100));
}

async function flushToBackend(userId?: string): Promise<void> {
  if (!allowLocalPersistenceFallback()) return;
  const queue = readJson<FlushItem[]>(FLUSH_QUEUE_KEY, []);
  if (queue.length === 0) return;

  writeJson(FLUSH_QUEUE_KEY, []); // optimistic clear

  const results = await Promise.allSettled(
    queue.map((item) =>
      trackGrowthEvent({ ...item, userId: item.userId ?? userId }),
    ),
  );

  // Re-enqueue failed items
  const failed = queue.filter((_, i) => results[i]?.status === 'rejected');
  if (failed.length > 0) {
    const remaining = readJson<FlushItem[]>(FLUSH_QUEUE_KEY, []);
    writeJson(FLUSH_QUEUE_KEY, [...failed, ...remaining].slice(-100));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Track a page view.
 */
export function trackPageView(path: string, userId?: string): void {
  if (!allowLocalPersistenceFallback()) return;

  const session = getOrCreateSession(userId);
  session.pageViews += 1;
  session.events.push({ type: 'page_view', label: path, timestamp: new Date().toISOString() });
  saveSession(session);
}

/**
 * Track a ride/bus/package search.
 */
export function trackSearch(params: {
  from: string;
  to: string;
  serviceType: ServiceType;
  userId?: string;
}): void {
  if (!allowLocalPersistenceFallback()) return;

  const session = getOrCreateSession(params.userId);
  session.searches += 1;
  session.events.push({
    type: 'search',
    label: `${params.from} → ${params.to}`,
    timestamp: new Date().toISOString(),
  });
  saveSession(session);

  const retention = getRetentionProfile();
  updateRetentionProfile({
    totalSearches: retention.totalSearches + 1,
    lastSeenAt: new Date().toISOString(),
  });

  enqueueFlush({
    eventName: 'ride_search',
    funnelStage: 'searched',
    serviceType: params.serviceType,
    from: params.from,
    to: params.to,
    userId: params.userId,
  });
}

/**
 * Track a funnel conversion event.
 */
export function trackFunnelEvent(params: {
  stage: FunnelStage;
  serviceType: ServiceType;
  from?: string;
  to?: string;
  valueJod?: number;
  userId?: string;
}): void {
  if (!allowLocalPersistenceFallback()) return;

  const session = getOrCreateSession(params.userId);
  session.events.push({
    type: 'click',
    label: `funnel:${params.stage}`,
    value: params.valueJod,
    timestamp: new Date().toISOString(),
  });
  saveSession(session);

  if (params.stage === 'booked' || params.stage === 'completed') {
    const retention = getRetentionProfile();
    updateRetentionProfile({
      totalBookings: retention.totalBookings + 1,
      lastSeenAt: new Date().toISOString(),
    });
  }

  enqueueFlush({
    eventName: `funnel_${params.stage}`,
    funnelStage: params.stage,
    serviceType: params.serviceType,
    from: params.from,
    to: params.to,
    valueJod: params.valueJod,
    userId: params.userId,
  });
}

/**
 * Track a generic UI interaction (button click, filter apply, etc.).
 */
export function trackInteraction(label: string, value?: number, userId?: string): void {
  if (!allowLocalPersistenceFallback()) return;

  const session = getOrCreateSession(userId);
  session.events.push({ type: 'click', label, value, timestamp: new Date().toISOString() });
  saveSession(session);
}

/**
 * Mark a new session start. Call once on app mount.
 */
export function startSession(userId?: string): void {
  const session = getOrCreateSession(userId);
  saveSession(session);

  const retention = getRetentionProfile();
  const now = new Date();
  const lastSeen = new Date(retention.lastSeenAt);
  const dayDiff = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));

  const newStreak =
    dayDiff === 1
      ? retention.streakDays + 1
      : dayDiff === 0
      ? retention.streakDays
      : 0;

  const updated = updateRetentionProfile({
    totalSessions: retention.totalSessions + 1,
    lastSeenAt: now.toISOString(),
    streakDays: newStreak,
  });

  updateRetentionProfile({
    churnRisk: computeChurnRisk(updated),
    cohort: computeCohort(updated),
  });

  // Flush queued events
  void flushToBackend(userId);
}

/**
 * Get the current retention profile.
 */
export function getRetentionSnapshot(): RetentionProfile {
  return getRetentionProfile();
}

/**
 * Get the active session.
 */
export function getActiveSession(): UserSession {
  return getOrCreateSession();
}

/**
 * Manually flush queued events (e.g. on app background/close).
 */
export async function flushAnalytics(userId?: string): Promise<void> {
  await flushToBackend(userId);
}
