import { isDomainEvent, type DomainEvent } from './domainEvent';

type EventHandler<TEvent extends DomainEvent = DomainEvent> =
  (event: TEvent) => void | Promise<void>;

interface ReplayOptions {
  domain?: string;
  eventName?: string;
  since?: string;
  until?: string;
}

interface EventSubscription {
  id: string;
  domain?: string;
  eventName?: string;
  handler: EventHandler;
}

const EVENT_HISTORY_LIMIT = 2000;

export class PlatformEventBus {
  private readonly history: DomainEvent[] = [];
  private readonly subscriptions = new Map<string, EventSubscription>();

  async publish<TEvent extends DomainEvent>(event: TEvent): Promise<TEvent> {
    if (!isDomainEvent(event)) {
      throw new Error('Only valid domain events can be published.');
    }

    this.history.push(event);
    if (this.history.length > EVENT_HISTORY_LIMIT) {
      this.history.splice(0, this.history.length - EVENT_HISTORY_LIMIT);
    }

    const matchingSubscriptions = Array.from(this.subscriptions.values()).filter((subscription) => {
      if (subscription.domain && subscription.domain !== event.domain) {
        return false;
      }
      if (subscription.eventName && subscription.eventName !== event.name) {
        return false;
      }
      return true;
    });

    await Promise.allSettled(
      matchingSubscriptions.map((subscription) => Promise.resolve(subscription.handler(event))),
    );

    return event;
  }

  subscribe<TEvent extends DomainEvent = DomainEvent>(
    handler: EventHandler<TEvent>,
    options: Omit<EventSubscription, 'handler' | 'id'> = {},
  ): () => void {
    const id = globalThis.crypto?.randomUUID?.() ?? `sub-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.subscriptions.set(id, {
      id,
      domain: options.domain,
      eventName: options.eventName,
      handler: handler as EventHandler,
    });

    return () => {
      this.subscriptions.delete(id);
    };
  }

  getHistory(options: ReplayOptions = {}): DomainEvent[] {
    return this.history.filter((event) => {
      if (options.domain && event.domain !== options.domain) {
        return false;
      }
      if (options.eventName && event.name !== options.eventName) {
        return false;
      }
      if (options.since && event.occurredAt < options.since) {
        return false;
      }
      if (options.until && event.occurredAt > options.until) {
        return false;
      }
      return true;
    });
  }

  async replay(
    handler: EventHandler,
    options: ReplayOptions = {},
  ): Promise<number> {
    const events = this.getHistory(options);
    for (const event of events) {
      await handler(event);
    }
    return events.length;
  }

  clear(): void {
    this.history.splice(0, this.history.length);
    this.subscriptions.clear();
  }
}

export const platformEventBus = new PlatformEventBus();

export function publishDomainEvent<TEvent extends DomainEvent>(event: TEvent): Promise<TEvent> {
  return platformEventBus.publish(event);
}

export function subscribeToDomainEvent<TEvent extends DomainEvent = DomainEvent>(
  handler: EventHandler<TEvent>,
  options: { domain?: string; eventName?: string } = {},
): () => void {
  return platformEventBus.subscribe(handler, options);
}

export function getDomainEventHistory(options?: ReplayOptions): DomainEvent[] {
  return platformEventBus.getHistory(options);
}

export function replayDomainEvents(
  handler: EventHandler,
  options?: ReplayOptions,
): Promise<number> {
  return platformEventBus.replay(handler, options);
}
