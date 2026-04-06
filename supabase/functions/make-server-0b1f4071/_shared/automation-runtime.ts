export type AutomationJobType =
  | 'demand_recovery'
  | 'corridor_conversion'
  | 'pricing_refresh'
  | 'retention_nudge'
  | 'reminder_dispatch'
  | 'support_sla'
  | 'support_follow_up'
  | 'revenue_observe';

export type AutomationJobRecord = {
  job_id: string;
  user_id?: string | null;
  job_type: AutomationJobType;
  corridor_id?: string | null;
  corridor_key?: string | null;
  route_scope?: string | null;
  origin_location?: string | null;
  destination_location?: string | null;
  job_status?: string | null;
  payload?: Record<string, unknown> | null;
  run_after?: string | null;
  attempts_count?: number | null;
  locked_at?: string | null;
  last_attempt_at?: string | null;
  processed_by?: string | null;
  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
};

export type ReminderFrequency = 'weekdays' | 'daily' | 'weekly';

export type AutomationNotificationPlan = {
  type: 'trip_updates' | 'promotions' | 'critical_alerts';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: Array<'in_app' | 'push' | 'email' | 'sms' | 'whatsapp'>;
  actionUrl?: string;
};

function formatCurrency(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toFixed(2)} JOD` : null;
}

export function describeRoute(job: Pick<AutomationJobRecord, 'origin_location' | 'destination_location' | 'corridor_id'>) {
  if (job.origin_location && job.destination_location) {
    return `${job.origin_location} to ${job.destination_location}`;
  }
  if (job.corridor_id) {
    return job.corridor_id;
  }
  return 'your corridor';
}

export function buildAutomationActionUrl(job: Pick<AutomationJobRecord, 'origin_location' | 'destination_location'>) {
  if (!job.origin_location || !job.destination_location) return undefined;
  return `/app/find-ride?from=${encodeURIComponent(job.origin_location)}&to=${encodeURIComponent(job.destination_location)}&search=1`;
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

function toPayloadRecord(payload: AutomationJobRecord['payload']) {
  return payload && typeof payload === 'object' ? payload : {};
}

export function buildAutomationFailurePatch(args: {
  attemptsCount: number;
  errorMessage: string;
  maxAttempts: number;
}) {
  const now = new Date();
  const exhausted = args.attemptsCount >= args.maxAttempts;
  const retryDelayMinutes = Math.min(90, Math.max(10, args.attemptsCount * 10));

  return exhausted
    ? {
        job_status: 'failed',
        last_error: args.errorMessage,
        locked_at: null,
        completed_at: now.toISOString(),
        updated_at: now.toISOString(),
      }
    : {
        job_status: 'queued',
        last_error: args.errorMessage,
        locked_at: null,
        run_after: new Date(now.getTime() + (retryDelayMinutes * 60_000)).toISOString(),
        completed_at: null,
        updated_at: now.toISOString(),
      };
}

function parseTimeParts(time: string) {
  const [hours, minutes] = time.split(':').map((value) => Number(value));
  return {
    hours: Number.isFinite(hours) ? hours : 7,
    minutes: Number.isFinite(minutes) ? minutes : 30,
  };
}

function toLocalDate(date = new Date()) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  return next;
}

export function nextReminderDate(
  frequency: ReminderFrequency,
  preferredTime: string,
  fromDate = new Date(),
) {
  const next = toLocalDate(fromDate);
  const { hours, minutes } = parseTimeParts(preferredTime);
  next.setHours(hours, minutes, 0, 0);

  if (next.getTime() <= fromDate.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 6);
  }

  if (frequency === 'weekdays') {
    while (next.getDay() === 5 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

export function buildAutomationNotification(
  job: AutomationJobRecord,
  context?: {
    reminderLabel?: string | null;
    reminderFrequency?: string | null;
    nextWaveWindow?: string | null;
    supportSubject?: string | null;
    supportPriority?: string | null;
  },
): AutomationNotificationPlan | null {
  const route = describeRoute(job);
  const payload = toPayloadRecord(job.payload);
  const actionUrl = buildAutomationActionUrl(job);

  switch (job.job_type) {
    case 'demand_recovery':
      return {
        type: 'trip_updates',
        title: `Demand is returning on ${route}`,
        message: `Search intent is building on ${route}. Re-open the lane before the next rider wave converts elsewhere.`,
        priority: 'high',
        channels: ['in_app', 'push', 'email'],
        actionUrl,
      };
    case 'corridor_conversion':
      return {
        type: 'trip_updates',
        title: `Finish the booking on ${route}`,
        message: `Wasel is seeing active corridor interest on ${route}. Finish the booking flow while seats are still available.`,
        priority: 'high',
        channels: ['in_app', 'push', 'email'],
        actionUrl,
      };
    case 'pricing_refresh': {
      const price =
        formatCurrency((payload.priceQuote as Record<string, unknown> | undefined)?.finalPriceJod) ??
        formatCurrency(payload.valueJod);
      return {
        type: 'promotions',
        title: `Fresh pricing landed on ${route}`,
        message: price
          ? `The latest automated price check on ${route} is ${price}. This is a strong moment to convert the trip.`
          : `Pricing automation refreshed ${route}. Check the latest market window before demand shifts again.`,
        priority: 'medium',
        channels: ['in_app', 'push', 'email'],
        actionUrl,
      };
    }
    case 'retention_nudge':
      return {
        type: 'trip_updates',
        title: `Keep ${route} active`,
        message: `Wasel is still tracking recurring demand on ${route}. A quick revisit keeps your lane warm and conversion-ready.`,
        priority: 'medium',
        channels: ['in_app', 'push', 'email'],
        actionUrl,
      };
    case 'reminder_dispatch':
      return {
        type: 'trip_updates',
        title: `Route reminder: ${context?.reminderLabel ?? route}`,
        message: context?.nextWaveWindow
          ? `${context.nextWaveWindow}. Your recurring corridor is ready for another check-in.`
          : `Your recurring corridor is ready for another check-in.`,
        priority: 'medium',
        channels: ['in_app', 'push', 'email', 'sms'],
        actionUrl,
      };
    case 'support_sla':
      return {
        type: 'critical_alerts',
        title: `Support escalated your request`,
        message: context?.supportSubject
          ? `Wasel escalated "${context.supportSubject}" so it stays inside SLA.`
          : `Wasel escalated your open support request so it stays inside SLA.`,
        priority: context?.supportPriority === 'urgent' ? 'urgent' : 'high',
        channels: ['in_app', 'email', 'sms'],
      };
    case 'support_follow_up':
      return {
        type: 'critical_alerts',
        title: `Support is following up`,
        message: context?.supportSubject
          ? `Wasel is still working on "${context.supportSubject}".`
          : `Wasel is still working on your support request.`,
        priority: 'high',
        channels: ['in_app', 'email'],
      };
    case 'revenue_observe':
    default:
      return null;
  }
}
