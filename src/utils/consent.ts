export type ConsentDecision = 'accepted' | 'declined' | null;

export const CONSENT_DECISION_EVENT = 'wasel:consent-decision';
export const CONSENT_STORAGE_KEY = 'wasel_analytics_consent_v1';

const LEGACY_CONSENT_STORAGE_KEYS = [
  CONSENT_STORAGE_KEY,
  'wasel:analytics-consent-v1',
] as const;

function isConsentDecision(value: unknown): value is Exclude<ConsentDecision, null> {
  return value === 'accepted' || value === 'declined';
}

export function getConsentDecision(): ConsentDecision {
  if (typeof window === 'undefined') {
    return null;
  }

  for (const key of LEGACY_CONSENT_STORAGE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (isConsentDecision(raw)) {
        return raw;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function hasTelemetryConsent(): boolean {
  return getConsentDecision() === 'accepted';
}

export function setConsentDecision(decision: Exclude<ConsentDecision, null>): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Write only to the canonical current key
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, decision);
  } catch {
    return;
  }

  // Clean up any legacy keys to avoid stale state
  for (const key of LEGACY_CONSENT_STORAGE_KEYS) {
    if (key === CONSENT_STORAGE_KEY) continue;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore cleanup failures
    }
  }
}

export function emitConsentDecision(decision: Exclude<ConsentDecision, null>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(CONSENT_DECISION_EVENT, {
      detail: {
        accepted: decision === 'accepted',
        decision,
      },
    }));
  } catch {
    // The banner should still dismiss even if custom events are unavailable.
  }
}

export function recordConsentDecision(decision: Exclude<ConsentDecision, null>): void {
  setConsentDecision(decision);
  emitConsentDecision(decision);
}
