import { trace, type Span, type Tracer } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  WebTracerProvider,
} from '@opentelemetry/sdk-trace-web';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

interface OpenTelemetryOptions {
  environment: string;
  exporterUrl?: string;
  serviceName: string;
  serviceVersion: string;
}

let tracer: Tracer | null = null;
let providerRegistered = false;

function createSpanProcessor(exporterUrl?: string) {
  if (exporterUrl) {
    return new BatchSpanProcessor(new OTLPTraceExporter({ url: exporterUrl }));
  }

  if (import.meta.env.DEV) {
    return new BatchSpanProcessor(new ConsoleSpanExporter());
  }

  return null;
}

export function initializeOpenTelemetry(options: OpenTelemetryOptions): Tracer | null {
  if (providerRegistered) {
    return tracer;
  }

  try {
    const spanProcessor = createSpanProcessor(options.exporterUrl);
    const provider = new WebTracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: options.serviceName,
        [ATTR_SERVICE_VERSION]: options.serviceVersion,
        'deployment.environment': options.environment,
      }),
      ...(spanProcessor ? { spanProcessors: [spanProcessor] } : {}),
    });
    provider.register();

    tracer = trace.getTracer(options.serviceName, options.serviceVersion);
    providerRegistered = true;
    return tracer;
  } catch {
    return null;
  }
}

export function getOpenTelemetryTracer(): Tracer | null {
  return tracer;
}

export function startOpenTelemetrySpan(name: string): Span | null {
  return tracer?.startSpan(name) ?? null;
}
