import { describe, expect, it } from 'vitest';
import {
  buildSupportSlaDueAt,
  getAutomationJobRunAfter,
  splitRouteLabel,
} from './automationScheduling';

describe('automationScheduling', () => {
  it('delays demand recovery jobs into a real background window', () => {
    const runAfter = new Date(getAutomationJobRunAfter('demand_recovery', new Date('2026-04-04T08:00:00.000Z')));
    expect(runAfter.toISOString()).toBe('2026-04-04T08:20:00.000Z');
  });

  it('assigns tighter SLAs to urgent support tickets', () => {
    const dueAt = new Date(buildSupportSlaDueAt('urgent', new Date('2026-04-04T08:00:00.000Z')));
    expect(dueAt.toISOString()).toBe('2026-04-04T10:00:00.000Z');
  });

  it('splits route labels without crashing on empty values', () => {
    expect(splitRouteLabel('Amman to Irbid')).toEqual({ from: 'Amman', to: 'Irbid' });
    expect(splitRouteLabel('')).toEqual({ from: null, to: null });
  });
});
