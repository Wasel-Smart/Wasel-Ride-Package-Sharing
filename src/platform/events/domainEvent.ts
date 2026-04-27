export interface DomainEventMetadata {
  actorId?: string | null;
  aggregateId?: string | null;
  causationId?: string | null;
  correlationId?: string | null;
  locale?: string | null;
  traceId?: string | null;
  [key: string]: unknown;
}

export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: string;
  name: string;
  domain: string;
  occurredAt: string;
  version: number;
  payload: TPayload;
  metadata: DomainEventMetadata;
}

export interface CreateDomainEventInput<TPayload> {
  name: string;
  domain: string;
  payload: TPayload;
  metadata?: DomainEventMetadata;
  version?: number;
}

export function createDomainEvent<TPayload>(
  input: CreateDomainEventInput<TPayload>,
): DomainEvent<TPayload> {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: input.name,
    domain: input.domain,
    occurredAt: new Date().toISOString(),
    version: input.version ?? 1,
    payload: input.payload,
    metadata: input.metadata ?? {},
  };
}

export function isDomainEvent(value: unknown): value is DomainEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<DomainEvent>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.domain === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.version === 'number' &&
    typeof candidate.metadata === 'object' &&
    candidate.metadata !== null
  );
}
