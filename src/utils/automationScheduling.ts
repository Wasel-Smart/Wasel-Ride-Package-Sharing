export type AutomationJobType =
  | 'demand_recovery'
  | 'corridor_conversion'
  | 'pricing_refresh'
  | 'retention_nudge'
  | 'reminder_dispatch'
  | 'support_sla'
  | 'support_follow_up'
  | 'revenue_observe';

export type SupportSlaPriority = 'low' | 'normal' | 'high' | 'urgent';

function shiftMinutes(fromDate: Date, minutes: number) {
  return new Date(fromDate.getTime() + (minutes * 60_000));
}

function shiftHours(fromDate: Date, hours: number) {
  return shiftMinutes(fromDate, hours * 60);
}

export function getAutomationJobRunAfter(
  jobType: AutomationJobType,
  fromDate = new Date(),
): string {
  switch (jobType) {
    case 'demand_recovery':
      return shiftMinutes(fromDate, 20).toISOString();
    case 'corridor_conversion':
      return shiftMinutes(fromDate, 12).toISOString();
    case 'pricing_refresh':
      return shiftMinutes(fromDate, 45).toISOString();
    case 'retention_nudge':
      return shiftHours(fromDate, 12).toISOString();
    case 'support_follow_up':
      return shiftMinutes(fromDate, 30).toISOString();
    case 'revenue_observe':
      return shiftHours(fromDate, 2).toISOString();
    case 'support_sla':
    case 'reminder_dispatch':
    default:
      return fromDate.toISOString();
  }
}

export function buildSupportSlaDueAt(
  priority: SupportSlaPriority,
  fromDate = new Date(),
): string {
  switch (priority) {
    case 'urgent':
      return shiftHours(fromDate, 2).toISOString();
    case 'high':
      return shiftHours(fromDate, 12).toISOString();
    case 'normal':
      return shiftHours(fromDate, 24).toISOString();
    case 'low':
    default:
      return shiftHours(fromDate, 48).toISOString();
  }
}

export function splitRouteLabel(routeLabel?: string | null) {
  const parts = String(routeLabel ?? '')
    .split(/\s+to\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    from: parts[0] ?? null,
    to: parts[1] ?? null,
  };
}
