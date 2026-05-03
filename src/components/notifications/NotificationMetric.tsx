/**
 * NotificationMetric.tsx
 *
 * A single summary stat tile shown in the notification center header.
 * Kept as its own file so it can be tested and reused independently.
 */

type NotificationMetricProps = {
  label: string;
  value: string | number;
  /** Tailwind class string for gradient + text colour */
  tone: string;
};

export function NotificationMetric({ label, value, tone }: NotificationMetricProps) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${tone}`}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
