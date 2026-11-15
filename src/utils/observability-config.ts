/**
 * src/utils/observability-config.ts
 *
 * Runtime validation of observability configuration.
 * Fails closed in production when required DSNs/endpoints are missing or
 * contain placeholder values, so silent telemetry loss is never shipped.
 */

export interface ObservabilityConfigIssue {
  key: string;
  message: string;
  severity: 'error' | 'warning';
}

const PLACEHOLDER_PATTERNS = [
  /paste_your/i,
  /your_key/i,
  /your_app/i,
  /your_dsn/i,
  /your_secret/i,
  /placeholder/i,
  /example\.com/i,
  /set_real/i,
  /todo/i,
  /^$/,
];

function isPlaceholder(value: string | undefined): boolean {
  if (!value) { return true; }
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(value.trim()));
}

const REQUIRED_PROD_OBSERVABILITY_KEYS = [
  'VITE_SENTRY_DSN',
  'VITE_APP_INSIGHTS_CONNECTION_STRING',
] as const;

export function validateObservabilityConfig(
  envSource: Record<string, string | undefined>,
  isProd: boolean = false,
): ObservabilityConfigIssue[] {
  const issues: ObservabilityConfigIssue[] = [];

  for (const key of REQUIRED_PROD_OBSERVABILITY_KEYS) {
    const value = envSource[key];
    if (isPlaceholder(value)) {
      if (isProd) {
        issues.push({
          key,
          message: `${key} is not configured — production telemetry will be silent. Set a real value in Vercel.`,
          severity: 'error',
        });
      } else {
        issues.push({
          key,
          message: `${key} is not configured — remote error capture is disabled in non-dev environments.`,
          severity: 'warning',
        });
      }
    } else if (value && PLACEHOLDER_PATTERNS.some(pattern => pattern.test(value.trim()))) {
      issues.push({
        key,
        message: `${key} contains a placeholder value — replace with real credentials before production.`,
        severity: 'error',
      });
    }
  }

  // OTLP endpoint: warn if configured but looks like a placeholder
  const otlpEndpoint = envSource.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;
  if (otlpEndpoint && isPlaceholder(otlpEndpoint)) {
    issues.push({
      key: 'VITE_OTEL_EXPORTER_OTLP_ENDPOINT',
      message: 'VITE_OTEL_EXPORTER_OTLP_ENDPOINT contains a placeholder value — distributed tracing will not export.',
      severity: 'warning',
    });
  }

  return issues;
}

export function validateObservabilityConfigStrict(
  envSource: Record<string, string | undefined>,
  isProd: boolean = false,
): { ok: boolean; issues: ObservabilityConfigIssue[] } {
  const issues = validateObservabilityConfig(envSource, isProd);
  return {
    ok: issues.every(issue => issue.severity !== 'error'),
    issues,
  };
}
