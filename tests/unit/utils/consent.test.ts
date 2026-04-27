import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getConsentDecision,
  hasTelemetryConsent,
  setConsentDecision,
  emitConsentDecision,
  recordConsentDecision,
  CONSENT_STORAGE_KEY,
  CONSENT_DECISION_EVENT,
} from '@/utils/consent';

describe('getConsentDecision', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns null when nothing stored', () => {
    expect(getConsentDecision()).toBeNull();
  });

  it('returns "accepted" when stored', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    expect(getConsentDecision()).toBe('accepted');
  });

  it('returns "declined" when stored', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'declined');
    expect(getConsentDecision()).toBe('declined');
  });

  it('returns null for unknown values', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'maybe');
    expect(getConsentDecision()).toBeNull();
  });

  it('returns null when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(getConsentDecision()).toBeNull();
    spy.mockRestore();
  });

  it('reads from legacy key as fallback', () => {
    // legacy key is 'wasel:analytics-consent-v1'
    localStorage.setItem('wasel:analytics-consent-v1', 'accepted');
    expect(getConsentDecision()).toBe('accepted');
  });
});

describe('hasTelemetryConsent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns false when no decision stored', () => {
    expect(hasTelemetryConsent()).toBe(false);
  });

  it('returns true when accepted', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    expect(hasTelemetryConsent()).toBe(true);
  });

  it('returns false when declined', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'declined');
    expect(hasTelemetryConsent()).toBe(false);
  });
});

describe('setConsentDecision', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('stores "accepted" in canonical key', () => {
    setConsentDecision('accepted');
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('accepted');
  });

  it('stores "declined" in canonical key', () => {
    setConsentDecision('declined');
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('declined');
  });

  it('cleans up legacy keys after setting', () => {
    localStorage.setItem('wasel:analytics-consent-v1', 'accepted');
    setConsentDecision('accepted');
    expect(localStorage.getItem('wasel:analytics-consent-v1')).toBeNull();
  });

  it('handles setItem failure gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setConsentDecision('accepted')).not.toThrow();
    spy.mockRestore();
  });
});

describe('emitConsentDecision', () => {
  it('dispatches the consent event with accepted=true', () => {
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener(CONSENT_DECISION_EVENT, handler);

    emitConsentDecision('accepted');

    expect(events).toHaveLength(1);
    expect(events[0].detail.accepted).toBe(true);
    expect(events[0].detail.decision).toBe('accepted');
    window.removeEventListener(CONSENT_DECISION_EVENT, handler);
  });

  it('dispatches the consent event with accepted=false', () => {
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener(CONSENT_DECISION_EVENT, handler);

    emitConsentDecision('declined');

    expect(events[0].detail.accepted).toBe(false);
    window.removeEventListener(CONSENT_DECISION_EVENT, handler);
  });

  it('handles dispatchEvent failure gracefully', () => {
    const spy = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => {
      throw new Error('DOMException');
    });
    expect(() => emitConsentDecision('accepted')).not.toThrow();
    spy.mockRestore();
  });
});

describe('recordConsentDecision', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('both stores and emits the decision', () => {
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener(CONSENT_DECISION_EVENT, handler);

    recordConsentDecision('accepted');

    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(events).toHaveLength(1);
    window.removeEventListener(CONSENT_DECISION_EVENT, handler);
  });

  it('records declined decision', () => {
    recordConsentDecision('declined');
    expect(hasTelemetryConsent()).toBe(false);
  });
});
