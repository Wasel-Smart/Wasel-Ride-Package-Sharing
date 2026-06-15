export type OfflineActionType =
  | 'RIDE_REQUEST'
  | 'RIDE_CANCEL'
  | 'RIDE_RATING'
  | 'PACKAGE_REQUEST'
  | 'PROFILE_UPDATE';

export type OfflineAction<TPayload = unknown> = {
  id: string;
  type: OfflineActionType;
  payload: TPayload;
  timestamp: number;
  retries: number;
};

export function createOfflineAction<TPayload>(
  action: Pick<OfflineAction<TPayload>, 'type' | 'payload'>,
  options: { now?: number; random?: () => number } = {},
): OfflineAction<TPayload> {
  const now = options.now ?? Date.now();
  const random = options.random ?? Math.random;

  return {
    ...action,
    id: `action_${now}_${random().toString(36).slice(2, 11)}`,
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
