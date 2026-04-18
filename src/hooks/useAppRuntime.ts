import { useEffect } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { probeBackendHealth, startAvailabilityPolling, warmUpServer } from '../services/core';
import { CONSENT_DECISION_EVENT, hasTelemetryConsent } from '../utils/consent';
import { scheduleDeferredTask } from '../utils/runtimeScheduling';

let telemetryModulesPromise: Promise<{
  initSentry: () => void;
  detectLongTasks: () => void;
  initPerformanceMonitoring: () => void;
}> | null = null;

function loadTelemetryModules() {
  if (!telemetryModulesPromise) {
    telemetryModulesPromise = Promise.all([
      import('../utils/monitoring'),
      import('../utils/performance'),
    ]).then(([monitoringModule, performanceModule]) => ({
      initSentry: monitoringModule.initSentry,
      detectLongTasks: performanceModule.detectLongTasks,
      initPerformanceMonitoring: performanceModule.initPerformanceMonitoring,
    }));
  }
  return telemetryModulesPromise;
}

export function useMonitoringSetup() {
  useEffect(() => {
    let disposed = false;
    const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname;
    const isPublicEntryPath = currentPath === '/';
    let cancelMonitoringSetup = () => {};
    let monitoringScheduled = false;

    const scheduleMonitoringSetup = () => {
      if (disposed || monitoringScheduled || !hasTelemetryConsent()) {
        return;
      }

      monitoringScheduled = true;
      cancelMonitoringSetup = scheduleDeferredTask(async () => {
        if (disposed) return;

        const telemetry = await loadTelemetryModules();
        telemetry.initSentry();
        telemetry.initPerformanceMonitoring();
        telemetry.detectLongTasks();
      }, isPublicEntryPath ? 2_500 : 1_500);
    };

    const handleConsentDecision = (event: Event) => {
      const decisionEvent = event as CustomEvent<{ accepted?: boolean }>;
      if (decisionEvent.detail?.accepted) {
        scheduleMonitoringSetup();
      }
    };

    scheduleMonitoringSetup();
    window.addEventListener(CONSENT_DECISION_EVENT, handleConsentDecision as EventListener);

    return () => {
      disposed = true;
      cancelMonitoringSetup();
      window.removeEventListener(CONSENT_DECISION_EVENT, handleConsentDecision as EventListener);
    };
  }, []);
}

export function useServerWarmup() {
  useEffect(() => {
    let disposed = false;
    let stopPolling: () => void = () => {};
    const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname;
    const isPublicEntryPath = currentPath === '/';

    const cancelWarmup = scheduleDeferredTask(async () => {
      if (disposed) return;

      stopPolling = startAvailabilityPolling(120_000);
      await warmUpServer();
      await probeBackendHealth();
    }, isPublicEntryPath ? 2_200 : 900);

    return () => {
      disposed = true;
      cancelWarmup();
      stopPolling();
    };
  }, []);
}

export function useNetworkSync() {
  useEffect(() => {
    let disposed = false;

    const syncOnlineState = () => {
      const online = typeof navigator === 'undefined' ? true : navigator.onLine;
      onlineManager.setOnline(online);
      if (online && !disposed) {
        void probeBackendHealth();
      }
    };

    syncOnlineState();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', syncOnlineState);
      window.addEventListener('offline', syncOnlineState);
    }

    return () => {
      disposed = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', syncOnlineState);
        window.removeEventListener('offline', syncOnlineState);
      }
    };
  }, []);
}
