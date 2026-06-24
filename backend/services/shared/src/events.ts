export type DomainEventType = string;
export interface DomainEventEnvelope<TType extends DomainEventType> {
  id?: string;
  type: TType;
  payload: Record<string, unknown>;
  producer?: string;
  traceId?: string;
  occurredAt?: string;
}

export interface EventBusAdapter {
  publish<TType extends DomainEventType>(event: DomainEventEnvelope<TType>): Promise<void>;
  subscribe(groupName: string, consumerName: string, stream: string): Promise<void>;
}

export interface RedisStreamConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
  maxRetries: number;
  retryDelayMs: number;
}

export interface ConsumerConfig {
  groupName: string;
  consumerName: string;
  blockMs?: number;
  count?: number;
}

export interface PublishOptions {
  maxlen?: number;
  approximate?: boolean;
}
