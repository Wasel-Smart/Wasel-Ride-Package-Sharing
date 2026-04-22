/**
 * WalletStorageAdapter
 *
 * Owns all localStorage read/write operations for wallet snapshots
 * and demo payment intents. Extracted from walletApi.ts which
 * previously mixed API calls, business logic, and raw I/O in the
 * same module.
 *
 * RESPONSIBILITIES
 * ────────────────
 *  ✓ Persist and retrieve wallet snapshots with TTL expiry
 *  ✓ Persist and settle demo payment intents
 *  ✓ Determine fallback eligibility
 *
 * NOT RESPONSIBLE FOR
 * ───────────────────
 *  ✗ Making network requests
 *  ✗ Transforming business data
 *  ✗ Any wallet business rules
 */

import type { WalletReliabilityMeta, WalletSnapshot } from '../walletApi';

// ─── Keys & constants ─────────────────────────────────────────────────────────

const SNAPSHOT_PREFIX = 'wasel-wallet-snapshot-v2';
const PAYMENT_INTENT_PREFIX = 'wasel-demo-payment-intent-v1';

/** How long a persisted snapshot is considered fresh (2 minutes). */
const SNAPSHOT_MAX_AGE_MS = 2 * 60_000;

// ─── Internal persisted shapes ────────────────────────────────────────────────

interface PersistedSnapshot {
  snapshot: WalletSnapshot;
  storedAt: number;
}

export interface PersistedPaymentIntent {
  intent: {
    clientSecret: string | null;
    id: string;
    status: string;
  };
  settled: boolean;
  storedAt: number;
  userId: string;
}

// ─── Key builders ─────────────────────────────────────────────────────────────

function snapshotKey(userId: string): string {
  return `${SNAPSHOT_PREFIX}:${userId}`;
}

function paymentIntentKey(paymentIntentId: string): string {
  return `${PAYMENT_INTENT_PREFIX}:${paymentIntentId}`;
}

// ─── Safe storage accessor ────────────────────────────────────────────────────

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// ─── Wallet snapshot ──────────────────────────────────────────────────────────

/**
 * Persist a wallet snapshot to localStorage.
 * No-op when storage is unavailable.
 */
export function persistWalletSnapshot(
  userId: string,
  snapshot: WalletSnapshot,
): void {
  const storage = getStorage();
  if (!storage) return;

  const payload: PersistedSnapshot = { storedAt: Date.now(), snapshot };
  try {
    storage.setItem(snapshotKey(userId), JSON.stringify(payload));
  } catch {
    /* quota exceeded or storage locked */
  }
}

/**
 * Read a wallet snapshot from localStorage.
 * Returns null if absent, expired, or malformed.
 */
export function readPersistedWalletSnapshot(userId: string): WalletSnapshot | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(snapshotKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedSnapshot;
    if (!parsed?.snapshot || typeof parsed.storedAt !== 'number') return null;
    if (Date.now() - parsed.storedAt > SNAPSHOT_MAX_AGE_MS) return null;

    return parsed.snapshot;
  } catch {
    return null;
  }
}

/**
 * Build a reliability meta object signalling the snapshot's source.
 */
export function makeReliabilityMeta(degraded = false): WalletReliabilityMeta {
  return {
    degraded,
    fetchedAt: new Date().toISOString(),
    source: 'edge-api',
  };
}

// ─── Demo payment intents ─────────────────────────────────────────────────────

/** Persist a demo payment intent. */
export function persistDemoIntent(record: PersistedPaymentIntent): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(paymentIntentKey(record.intent.id), JSON.stringify(record));
  } catch {
    /* quota exceeded */
  }
}

/** Read a demo payment intent by id. Returns null if absent or malformed. */
export function readDemoIntent(paymentIntentId: string): PersistedPaymentIntent | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(paymentIntentKey(paymentIntentId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedPaymentIntent;
    if (!parsed?.intent?.id || !parsed.userId) return null;

    return parsed;
  } catch {
    return null;
  }
}

/** Mark a demo payment intent as settled (succeeded). */
export function settleDemoIntent(
  paymentIntentId: string,
): PersistedPaymentIntent['intent'] | null {
  const existing = readDemoIntent(paymentIntentId);
  if (!existing) return null;

  const settled: PersistedPaymentIntent = {
    ...existing,
    settled: true,
    storedAt: Date.now(),
    intent: { ...existing.intent, status: 'succeeded' },
  };
  persistDemoIntent(settled);
  return settled.intent;
}

/** Read the status of a demo payment intent without settling it. */
export function readDemoIntentStatus(
  paymentIntentId: string,
): Pick<PersistedPaymentIntent['intent'], 'id' | 'status'> & { settled: boolean } | null {
  const existing = readDemoIntent(paymentIntentId);
  if (!existing) return null;

  return {
    id: existing.intent.id,
    settled: existing.settled,
    status: existing.intent.status,
  };
}
