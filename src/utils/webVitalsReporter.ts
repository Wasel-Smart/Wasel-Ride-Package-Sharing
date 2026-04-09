/**
 * Web Vitals Reporter
 *
 * Collects real Core Web Vitals (LCP, CLS, INP, FCP, TTFB) from every
 * browser session and writes them to the `web_vitals` Supabase table so
 * you have a live performance budget instead of aspirational Lighthouse numbers.
 *
 * Table schema (run once in Supabase):
 *
 *   create table if not exists web_vitals (
 *     id          uuid primary key default gen_random_uuid(),
 *     name        text not null,
 *     value       numeric not null,
 *     rating      text not null,   -- 'good' | 'needs-improvement' | 'poor'
 *     delta       numeric,
 *     page        text,
 *     user_agent  text,
 *     recorded_at timestamptz default now()
 *   );
 *   alter table web_vitals enable row level security;
 *   -- Allow anonymous inserts (writes only, no reads from client)
 *   create policy "vitals_insert" on web_vitals for insert with check (true);
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { supabase } from '../services/core';

type MetricsClient = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
    select: (columns: string) => {
      gte: (
        column: string,
        value: string,
      ) => Promise<{
        data: Array<{ name: string; value: number; rating: string }> | null;
        error: unknown;
      }>;
    };
  };
};

// ─── Thresholds (aligned with lighthouserc.json) ──────────────────────────────
const BUDGETS: Record<string, { good: number; poor: number }> = {
  LCP:  { good: 2500,  poor: 4000  },
  CLS:  { good: 0.1,   poor: 0.25  },
  INP:  { good: 200,   poor: 500   },
  FCP:  { good: 1800,  poor: 3000  },
  TTFB: { good: 800,   poor: 1800  },
};

function rating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const budget = BUDGETS[name];
  if (!budget) return 'good';
  if (value <= budget.good) return 'good';
  if (value <= budget.poor) return 'needs-improvement';
  return 'poor';
}

async function report(metric: Metric): Promise<void> {
  const r = rating(metric.name, metric.value);

  // Always log to console in dev
  if (import.meta.env.DEV) {
    const colour = r === 'good' ? '#22c55e' : r === 'needs-improvement' ? '#f59e0b' : '#ef4444';
    console.log(`%c[WebVitals] ${metric.name}: ${metric.value.toFixed(2)} (${r})`, `color:${colour};font-weight:bold`);
  }

  // Skip write if Supabase isn't configured
  const metricsClient = supabase as MetricsClient | null;
  if (!metricsClient) return;

  try {
    await metricsClient.from('web_vitals').insert({
      name:       metric.name,
      value:      metric.value,
      rating:     r,
      delta:      metric.delta,
      page:       typeof window !== 'undefined' ? window.location.pathname : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch {
    // Never crash the app due to analytics
  }
}

/**
 * Call once from main.tsx — wires all five Core Web Vitals.
 *
 * Uses `reportAllChanges: false` (default) so each metric fires once
 * with its final stable value, minimising write volume.
 */
export function initWebVitalsReporter(): void {
  onLCP(report);
  onCLS(report);
  onINP(report);
  onFCP(report);
  onTTFB(report);
}

/**
 * Optional: pull a summary of recent vitals for the admin dashboard.
 * Returns null when the table doesn't exist yet.
 */
export async function fetchVitalsSummary(days = 7): Promise<{
  metric: string;
  avg: number;
  p75: number;
  rating: string;
}[] | null> {
  const metricsClient = supabase as MetricsClient | null;
  if (!metricsClient) return null;
  try {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data, error } = await metricsClient
      .from('web_vitals')
      .select('name, value, rating')
      .gte('recorded_at', since);

    if (error || !data) return null;

    const grouped = new Map<string, number[]>();
    for (const row of data) {
      const arr = grouped.get(row.name) ?? [];
      arr.push(row.value);
      grouped.set(row.name, arr);
    }

    return Array.from(grouped.entries()).map(([metric, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const avg  = sorted.reduce((s, v) => s + v, 0) / sorted.length;
      const p75  = sorted[Math.floor(sorted.length * 0.75)] ?? avg;
      return { metric, avg: Math.round(avg), p75: Math.round(p75), rating: rating(metric, p75) };
    });
  } catch {
    return null;
  }
}
