/**
 * Application Insights Configuration
 *
 * Sets up Azure Application Insights for performance monitoring, exception tracking,
 * and user analytics. This enables observability for production deployments.
 */

import {
    ApplicationInsights,
    DistributedTracingModes,
} from '@microsoft/applicationinsights-web';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

let appInsights: ApplicationInsights | null = null;

export function initializeAppInsights(): void {
    // Prefer connection string (modern); fall back to instrumentation key (legacy).
    const connectionString = import.meta.env.VITE_APP_INSIGHTS_CONNECTION_STRING as string | undefined;
    const instrumentationKey = import.meta.env.VITE_APP_INSIGHTS_KEY as string | undefined;

    if (!connectionString && !instrumentationKey) {
        return;
    }

    try {
        appInsights = new ApplicationInsights({
            config: {
                ...(connectionString ? { connectionString } : { instrumentationKey }),
                enableAutoRouteTracking: true,
                enableAjaxErrorStatusText: true,
                enableCorsCorrelation: true,
                distributedTracingMode: DistributedTracingModes.AI_AND_W3C,
                maxAjaxCallsPerView: 500,
                maxMessageLimit: 10000,
                disableExceptionTracking: false,
                loggingLevelConsole: import.meta.env.DEV ? 1 : 0,
            },
        });

        appInsights.loadAppInsights();
        appInsights.trackPageView();

        // Wire real Web Vitals into App Insights as custom metrics.
        onCLS(({ value }) => appInsights?.trackMetric({ name: 'web_vital_CLS', average: value }));
        onFCP(({ value }) => appInsights?.trackMetric({ name: 'web_vital_FCP', average: value }));
        onINP(({ value }) => appInsights?.trackMetric({ name: 'web_vital_INP', average: value }));
        onLCP(({ value }) => appInsights?.trackMetric({ name: 'web_vital_LCP', average: value }));
        onTTFB(({ value }) => appInsights?.trackMetric({ name: 'web_vital_TTFB', average: value }));

        window.addEventListener('unhandledrejection', (event) => {
            if (appInsights) {
                const exception = event.reason instanceof Error
                    ? event.reason
                    : new Error(String(event.reason ?? 'Unhandled promise rejection'));
                appInsights.trackException({ exception, severityLevel: 2 });
            }
        });

        window.addEventListener('error', (event) => {
            if (appInsights) {
                appInsights.trackException({
                    exception: event.error instanceof Error ? event.error : new Error(event.message),
                    severityLevel: 2,
                });
            }
        });

    } catch {
        // Initialization failure is non-fatal; telemetry will be unavailable.
    }
}

export function getAppInsights(): ApplicationInsights | null {
    return appInsights;
}

/**
 * Track custom events for business metrics
 */
export function trackCustomEvent(name: string, properties?: Record<string, string | number>) {
    appInsights?.trackEvent({ name, properties });
}

/**
 * Track page views with custom properties
 */
export function trackPageView(name: string, properties?: Record<string, string | number>) {
    appInsights?.trackPageView({ name, properties });
}

/**
 * Track exceptions
 */
export function trackException(error: Error | unknown, severityLevel: 0 | 1 | 2 | 3 = 2) {
    const exception = error instanceof Error ? error : new Error(String(error));
    appInsights?.trackException({ exception, severityLevel });
}

/**
 * Track performance metrics
 */
export function trackMetric(name: string, value: number, properties?: Record<string, string | number>) {
    appInsights?.trackEvent({
        name: `metric_${name}`,
        properties: {
            value: String(value),
            ...properties,
        },
    });
}
