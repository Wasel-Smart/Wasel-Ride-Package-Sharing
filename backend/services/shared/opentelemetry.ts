import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('wasel-backend');

export interface TraceOptions {
  serviceName: string;
  spanName: string;
  attributes?: Record<string, string | number | boolean>;
}

export function startSpan<T>(options: TraceOptions, fn: () => Promise<T>): Promise<T> {
  const span = tracer.startSpan(options.spanName, {
    attributes: {
      'service.name': options.serviceName,
      ...options.attributes,
    },
  });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

export function getActiveSpan() {
  return trace.getSpan(context.active());
}

export function addEvent(name: string, attributes?: Record<string, string | number | boolean>) {
  const span = getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}