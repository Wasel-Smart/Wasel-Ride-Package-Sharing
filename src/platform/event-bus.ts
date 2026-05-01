import type { DomainEventEnvelope, DomainEventPayloadMap, DomainEventType } from '../domain/events';

type DomainEventListener<TType extends DomainEventType> = (
  event: DomainEventEnvelope<TType>,
) => void;

type AnyListener = (event: DomainEventEnvelope) => void;

function createTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

  publish<TType extends DomainEventType>(event: DomainEventEnvelope<TType>): void {
    this.history.unshift(event);
    this.history = this.history.slice(0, 200);

    this.listeners.get(event.type)?.forEach((listener) => {
      listener(event);
    });

    this.anyListeners.forEach((listener) => {
      listener(event);
    });
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
