import {
  createOfflineAction,
  incrementOfflineRetry,
  resolveOfflineQueueResult,
} from './offlineQueue';

describe('offline queue model', () => {
  it('creates stable offline action metadata', () => {
    const action = createOfflineAction(
      { type: 'PACKAGE_REQUEST', payload: { trackingCode: 'PKG-1' } },
      { now: 1000, random: () => 0.5 },
    );

    expect(action).toEqual({
      id: 'action_1000_i',
      type: 'PACKAGE_REQUEST',
      payload: { trackingCode: 'PKG-1' },
      timestamp: 1000,
      retries: 0,
    });
  });

  it('removes successful actions and preserves failed replacements', () => {
    const queue = [
      createOfflineAction({ type: 'RIDE_REQUEST', payload: { id: 1 } }, { now: 1, random: () => 0.1 }),
      createOfflineAction({ type: 'PACKAGE_REQUEST', payload: { id: 2 } }, { now: 2, random: () => 0.2 }),
    ];
    const retried = { ...queue[1], retries: 1 };

    expect(resolveOfflineQueueResult(queue, [queue[0].id], [retried])).toEqual([retried]);
  });

  it('drops actions after the retry budget is exhausted', () => {
    const action = createOfflineAction({ type: 'PROFILE_UPDATE', payload: {} });

    expect(incrementOfflineRetry({ ...action, retries: 2 }, 3)?.retries).toBe(3);
    expect(incrementOfflineRetry({ ...action, retries: 3 }, 3)).toBeNull();
  });
});
