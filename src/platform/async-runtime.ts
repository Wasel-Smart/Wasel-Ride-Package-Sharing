/**
 * Async Runtime
 *
 * Single entry point that starts the durable event broker and the production
 * worker pool. Call `startAsyncRuntime()` once from the app bootstrap (browser
 * only) so domain events flow into the broker and are processed by workers.
 */

import { eventBroker, startEventBroker, stopEventBroker, type BrokerMessage } from './event-broker';
import { productionWorkerRegistry } from './production-workers';

let started = false;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export interface NotificationDispatchInput {
  userId: string;
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
}

/**
 * Publishes a notification dispatch to the broker. The notification-worker
 * consumes `notifications.dispatch` and persists the notification, so callers
 * fire-and-forget without blocking the request path.
 */
export function dispatchNotification(input: NotificationDispatchInput): void {
  const message: BrokerMessage = {
    id: makeId('ntf'),
    topic: 'notifications.dispatch',
    payload: input,
    producer: 'app',
    traceId: makeId('trace'),
    occurredAt: new Date().toISOString(),
    attempts: 0,
  };
  void eventBroker.publish(message);
}

export async function startAsyncRuntime(): Promise<void> {
  if (started || typeof window === 'undefined') return;
  started = true;
  try {
    await startEventBroker();
    await productionWorkerRegistry.startAll();
    console.info('[async-runtime] started', {
      broker: eventBroker.kind,
      workers: productionWorkerRegistry.list(),
    });
  } catch (error) {
    started = false;
    console.error('[async-runtime] failed to start', error);
  }
}

export async function stopAsyncRuntime(): Promise<void> {
  if (!started) return;
  started = false;
  try {
    await productionWorkerRegistry.stopAll();
    await stopEventBroker();
  } catch (error) {
    console.error('[async-runtime] failed to stop', error);
  }
}
