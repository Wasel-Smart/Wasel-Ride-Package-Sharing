export type OfflineActionType =
  | 'RIDE_REQUEST'
  | 'RIDE_CANCEL'
  | 'RIDE_RATING'
  | 'PACKAGE_REQUEST'
  | 'PROFILE_UPDATE'
  | 'SCHEDULED_RIDE_CREATE'
  | 'ISSUE_REPORT';

export type OfflineAction<TPayload = unknown> = {
  id: string;
  type: OfflineActionType;
  payload: TPayload;
  timestamp: number;
  retries: number;
};

export function createOfflineAction<TPayload>(
  action: Pick<OfflineAction<TPayload>, 'type' | 'payload'>,
  options: { now?: number; random?: () => string } = {},
): OfflineAction<TPayload> {
  const now = options.now ?? Date.now();
  // Hermes (React Native's JS engine) ships no `crypto` global at all unless
  // a polyfill (react-native-get-random-values, expo-crypto, etc.) is
  // installed — this project has none, so calling crypto.randomUUID()
  // unconditionally would throw the first time any offline action is queued.
  // This id is only used as a local dedup/idempotency key, not for anything
  // security-sensitive, so a Math.random()-based fallback is safe and keeps
  // offline queueing working without adding a new native dependency.
  const randomPart = (
    options.random ??
    (() => {
      const hasCryptoRandomUUID =
        typeof globalThis.crypto !== 'undefined' &&
        typeof globalThis.crypto.randomUUID === 'function';
      if (hasCryptoRandomUUID) {
        return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 9);
      }
      return Math.random().toString(36).slice(2, 11);
    })
  )();

  return {
    ...action,
    id: `action_${now}_${randomPart}`,
    timestamp: now,
    retries: 0,
  };
}

export function resolveOfflineQueueResult<TPayload>(
  currentQueue: OfflineAction<TPayload>[],
  successfulIds: string[],
  failedActions: OfflineAction<TPayload>[],
): OfflineAction<TPayload>[] {
  const successful = new Set(successfulIds);
  const failedById = new Map(failedActions.map(action => [action.id, action]));

  return currentQueue
    .filter(action => !successful.has(action.id))
    .map(action => failedById.get(action.id) ?? action);
}

export function incrementOfflineRetry<TPayload>(
  action: OfflineAction<TPayload>,
  maxRetries = 3,
): OfflineAction<TPayload> | null {
  if (action.retries >= maxRetries) {
    return null;
  }

  return {
    ...action,
    retries: action.retries + 1,
  };
}
