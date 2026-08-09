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
  const randomPart = (options.random ?? (() => crypto.randomUUID().replace(/-/g, '').slice(0, 9)))();

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
