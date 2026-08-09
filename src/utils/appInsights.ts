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

let appInsights: ApplicationInsights | null = null;

export function initializeAppInsights(): void {
    const instrumentationKey = import.meta.env.VITE_APP_INSIGHTS_KEY;

    // Only initialize if instrumentation key is provided
    if (!instrumentationKey) {
        console.debug('Application Insights not configured (VITE_APP_INSIGHTS_KEY not set)');
        return;
    }

    try {
        appInsights = new ApplicationInsights({
            config: {
                instrumentationKey,
                enableAutoRouteTracking: true,
                enableAjaxErrorStatusText: true,
                enableCorsCorrelation: true,
                distributedTracingMode: DistributedTracingModes.AI_AND_W3C,
                // Capture frontend performance metrics
                maxAjaxCallsPerView: 500,
                maxMessageLimit: 10000,
                // Disable automatic exception catching in development
                disableExceptionTracking: false,
                // Enable console error tracking
                loggingLevelConsole: 1,
            },
        });

        appInsights.loadAppInsights();
        appInsights.trackPageView();

        // Track unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            if (appInsights) {
                appInsights.trackException({
                    exception: event.reason,
                    severityLevel: 2, // Error
                });
            }
        });

        // Track errors from error boundaries
        window.addEventListener('error', (event) => {
            if (appInsights) {
                appInsights.trackException({
                    exception: event.error || new Error(event.message),
                    severityLevel: 2, // Error
                });
            }
        });

        console.debug('Application Insights initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Application Insights:', error);
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
