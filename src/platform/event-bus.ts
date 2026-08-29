import type { DomainEventEnvelope, DomainEventPayloadMap, DomainEventType } from '../domain/events';
import { publishDomainEvent } from './event-broker';

type DomainEventListener<TType extends DomainEventType> = (
  event: DomainEventEnvelope<TType>,
) => void;

type AnyListener = (event: DomainEventEnvelope) => void;

function createTraceId(): string {
  return `trace-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function createEventId(): string {
  return `evt-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function createDomainEvent<TType extends DomainEventType>(
  type: TType,
  payload: DomainEventPayloadMap[TType],
  producer: string,
  traceId: string = createTraceId(),
): DomainEventEnvelope<TType> {
  return {
    id: createEventId(),
    type,
    payload,
    producer,
    traceId,
    occurredAt: new Date().toISOString(),
  };
}

class InMemoryDomainEventBus {
  private listeners = new Map<DomainEventType, Set<AnyListener>>();
  private anyListeners = new Set<AnyListener>();
  private history: DomainEventEnvelope[] = [];
  private static readonly MAX_HISTORY = 100;

  publish<TType extends DomainEventType>(event: DomainEventEnvelope<TType>): void {
    this.history.unshift(event);
    if (this.history.length > InMemoryDomainEventBus.MAX_HISTORY) {
      this.history.length = InMemoryDomainEventBus.MAX_HISTORY;
    }

    this.listeners.get(event.type)?.forEach(listener => {
      listener(event);
    });

    this.anyListeners.forEach(listener => {
      listener(event);
    });

    publishDomainEvent(event);
  }

  subscribe<TType extends DomainEventType>(
    type: TType,
    listener: DomainEventListener<TType>,
  ): () => void {
    const group = this.listeners.get(type) ?? new Set<AnyListener>();
    group.add(listener as AnyListener);
    this.listeners.set(type, group);

    return () => {
      group.delete(listener as AnyListener);
    };
  }

  subscribeAll(listener: AnyListener): () => void {
    this.anyListeners.add(listener);
    return () => {
      this.anyListeners.delete(listener);
    };
  }

  getRecentEvents(): DomainEventEnvelope[] {
    return [...this.history];
  }
}

export const domainEventBus = new InMemoryDomainEventBus();

export { publishDomainEvent } from './event-broker';
