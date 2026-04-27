/**
 * Distributed Tracing — Wasel Platform
 * 
 * End-to-end request tracing across microservices with OpenTelemetry.
 */

import { trace, context, type Span, type Tracer, SpanStatusCode } from '@opentelemetry/api';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface SpanAttributes {
  [key: string]: string | number | boolean;
}

class DistributedTracer {
  private tracer: Tracer;

  constructor() {
    this.tracer = trace.getTracer('wasel-frontend', '1.0.0');
  }

  startSpan(name: string, attributes?: SpanAttributes): Span {
    const span = this.tracer.startSpan(name, {
      attributes: {
        'service.name': 'wasel-frontend',
        'service.version': '1.0.0',
        ...attributes,
      },
    });
    return span;
  }

  async traceAsync<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: SpanAttributes,
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    
    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  traceSync<T>(
    name: string,
    fn: (span: Span) => T,
    attributes?: SpanAttributes,
  ): T {
    const span = this.startSpan(name, attributes);
    
    try {
      const result = context.with(trace.setSpan(context.active(), span), () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  getCurrentTraceContext(): TraceContext | null {
    const span = trace.getSpan(context.active());
    if (!span) return null;

    const spanContext = span.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  addEvent(name: string, attributes?: SpanAttributes): void {
    const span = trace.getSpan(context.active());
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  setAttributes(attributes: SpanAttributes): void {
    const span = trace.getSpan(context.active());
    if (span) {
      span.setAttributes(attributes);
    }
  }
}

export const distributedTracer = new DistributedTracer();

export function traceApiCall<T>(
  serviceName: string,
  method: string,
  path: string,
  fn: () => Promise<T>,
): Promise<T> {
  return distributedTracer.traceAsync(
    `${serviceName}.${method} ${path}`,
    async (span) => {
      span.setAttributes({
        'http.method': method,
        'http.url': path,
        'service.target': serviceName,
      });
      return fn();
    },
  );
}

export function traceComponentRender(componentName: string, fn: () => void): void {
  distributedTracer.traceSync(
    `render.${componentName}`,
    (span) => {
      span.setAttributes({
        'component.name': componentName,
        'component.type': 'react',
      });
      fn();
    },
  );
}
