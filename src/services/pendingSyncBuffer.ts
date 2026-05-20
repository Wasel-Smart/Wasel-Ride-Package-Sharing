import { clearRuntimeState, readRuntimeState, writeRuntimeState } from '../utils/runtimeStore';

export type PendingSyncRecord<T> = {
  id: string;
  payload: T;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string;
};

function queueKey(queueName: string): string {
  return `wasel.pending-sync:${queueName}`;
}

function makeId(queueName: string): string {
  return `${queueName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readPendingSyncRecords<T>(queueName: string): PendingSyncRecord<T>[] {
  const stored = readRuntimeState<unknown>(queueKey(queueName), []);
  return Array.isArray(stored) ? (stored as PendingSyncRecord<T>[]) : [];
}

function writePendingSyncRecords<T>(queueName: string, records: PendingSyncRecord<T>[]): void {
  writeRuntimeState(queueKey(queueName), records);
}

export function replacePendingSyncRecords<T>(
  queueName: string,
  records: PendingSyncRecord<T>[],
): void {
  if (records.length === 0) {
    clearRuntimeState(queueKey(queueName));
    return;
  }

  writePendingSyncRecords(queueName, records);
}

export function upsertPendingSyncRecord<T>(
  queueName: string,
  payload: T,
  matcher?: (record: PendingSyncRecord<T>) => boolean,
): PendingSyncRecord<T> {
  const records = readPendingSyncRecords<T>(queueName);
  const now = new Date().toISOString();
  const index = matcher ? records.findIndex(matcher) : -1;
  const existing = index >= 0 ? records[index] : undefined;

  if (existing) {
    const next: PendingSyncRecord<T> = {
      ...existing,
      payload,
      updatedAt: now,
    };
    records[index] = next;
    writePendingSyncRecords(queueName, records);
    return next;
  }

  const next: PendingSyncRecord<T> = {
    id: makeId(queueName),
    payload,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
  };
  writePendingSyncRecords(queueName, [...records, next]);
  return next;
}

export async function flushPendingSyncQueue<T>(
  queueName: string,
  handler: (record: PendingSyncRecord<T>) => Promise<void>,
): Promise<{ processed: number; pending: number }> {
  const records = readPendingSyncRecords<T>(queueName);
  if (records.length === 0) {
    return { processed: 0, pending: 0 };
  }

  const remaining: PendingSyncRecord<T>[] = [];
  let processed = 0;

  for (const record of records) {
    try {
      await handler(record);
      processed += 1;
    } catch (error) {
      remaining.push({
        ...record,
        attempts: record.attempts + 1,
        updatedAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : 'Pending sync failed',
      });
    }
  }

  if (remaining.length === 0) {
    clearRuntimeState(queueKey(queueName));
  } else {
    writePendingSyncRecords(queueName, remaining);
  }

  return { processed, pending: remaining.length };
}

export function clearPendingSyncQueue(queueName: string): void {
  clearRuntimeState(queueKey(queueName));
}
