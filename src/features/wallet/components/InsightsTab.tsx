/**
 * InsightsTab — Wallet Dashboard insights/analytics tab
 *
 * Replaced the heavyweight Recharts dependency with native charts so the
 * wallet insights view stays visual without adding a large vendor chunk.
 */

import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { WaselColors } from '../../../tokens/wasel-tokens';
import type { InsightsData } from '../../../services/walletApi';
import { PIE_COLORS } from './walletSharedMeta';

interface InsightsTabProps {
  insights: InsightsData | null;
  isRTL: boolean;
  t: Record<string, string>;
}

type TrendPoint = InsightsData['monthlyTrend'][number];

function formatMoney(value: number) {
  return value.toFixed(2);
}

function buildDonutBackground(entries: Array<{ value: number; color: string }>) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (total <= 0) {
    return 'conic-gradient(rgba(148, 163, 184, 0.22) 0deg 360deg)';
  }

  let offset = 0;
  const segments = entries.map((entry) => {
    const share = (entry.value / total) * 360;
    const nextOffset = offset + share;
    const segment = `${entry.color} ${offset}deg ${nextOffset}deg`;
    offset = nextOffset;
    return segment;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

function MonthlyTrendChart({
  data,
  spentLabel,
  earnedLabel,
}: {
  data: TrendPoint[];
  spentLabel: string;
  earnedLabel: string;
}) {
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) => [point.earned, point.spent]),
  );

  return (
    <div className="space-y-4">
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {data.map((point) => {
          const earnedHeight = `${Math.max(8, (point.earned / maxValue) * 100)}%`;
          const spentHeight = `${Math.max(8, (point.spent / maxValue) * 100)}%`;

          return (
            <div key={point.month} className="flex min-w-0 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end justify-center gap-2 rounded-2xl border border-white/6 bg-slate-950/40 px-2 py-3">
                <div className="flex flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-medium text-slate-300 tabular-nums">
                    {formatMoney(point.earned)}
                  </span>
                  <div
                    className="w-full max-w-4 rounded-t-xl shadow-[0_0_16px_rgba(20,184,166,0.22)]"
                    style={{
                      height: earnedHeight,
                      minHeight: 10,
                      background: `linear-gradient(180deg, ${WaselColors.teal}, rgba(20, 184, 166, 0.35))`,
                    }}
                  />
                </div>
                <div className="flex flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-medium text-slate-300 tabular-nums">
                    {formatMoney(point.spent)}
                  </span>
                  <div
                    className="w-full max-w-4 rounded-t-xl shadow-[0_0_16px_rgba(217,119,6,0.22)]"
                    style={{
                      height: spentHeight,
                      minHeight: 10,
                      background: `linear-gradient(180deg, ${WaselColors.bronze}, rgba(217, 119, 6, 0.34))`,
                    }}
                  />
                </div>
              </div>
              <span className="text-xs font-medium text-slate-400">{point.month}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: WaselColors.teal }}
          />
          <span>{earnedLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: WaselColors.bronze }}
          />
          <span>{spentLabel}</span>
        </div>
      </div>
    </div>
  );
}

function CategoryBreakdownChart({
  entries,
  t,
}: {
  entries: Array<{ name: string; value: number; color: string }>;
  t: Record<string, string>;
}) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const donutBackground = buildDonutBackground(
    entries.map(({ value, color }) => ({ value, color })),
  );

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="flex w-full justify-center sm:w-auto">
        <div
          className="relative h-36 w-36 rounded-full border border-white/8 shadow-[0_12px_42px_rgba(15,23,42,0.35)]"
          style={{ background: donutBackground }}
          aria-label={t.categoryBreakdown}
          role="img"
        >
          <div className="absolute inset-[22px] rounded-full border border-white/8 bg-slate-950/90" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {t.total ?? 'Total'}
            </span>
            <span className="mt-1 text-lg font-bold text-slate-50 tabular-nums">
              {formatMoney(total)}
            </span>
            <span className="text-[11px] text-slate-400">{t.jod}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {entries.map((entry) => {
          const share = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={entry.name} className="rounded-xl border border-white/6 bg-slate-950/35 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate text-xs text-muted-foreground capitalize">
                    {entry.name.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-foreground tabular-nums">
                  <span>{formatMoney(entry.value)} {t.jod}</span>
                  <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-slate-300">
                    {share}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InsightsTab({ insights, isRTL, t }: InsightsTabProps) {
  if (!insights) {
    return (
      <div className="py-12 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
        <p className="text-sm text-muted-foreground">{t.processing}</p>
      </div>
    );
  }

  const categoryEntries = Object.entries(insights.categoryBreakdown).map(([name, value], index) => ({
    name,
    value: Number(value ?? 0),
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="rounded-xl p-4">
          <div className="mb-1 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-red-400" />
            <span className="text-xs text-muted-foreground">{t.spent}</span>
          </div>
          <p className="tabular-nums text-2xl font-bold text-foreground">
            {formatMoney(insights.thisMonthSpent)}
          </p>
          <div className="mt-1 flex items-center gap-1">
            {insights.changePercent > 0 ? (
              <TrendingUp className="h-3 w-3 text-red-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-green-400" />
            )}
            <span
              className={`text-xs ${
                insights.changePercent > 0 ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {Math.abs(insights.changePercent)}% {t.vsLastMonth}
            </span>
          </div>
        </Card>

        <Card className="rounded-xl p-4">
          <div className="mb-1 flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-green-400" />
            <span className="text-xs text-muted-foreground">{t.earned}</span>
          </div>
          <p className="tabular-nums text-2xl font-bold text-foreground">
            {formatMoney(insights.thisMonthEarned)}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <Zap className="h-3 w-3 text-teal-400" />
            <span className="text-xs text-teal-400">
              {insights.carbonSaved.toFixed(0)} kg {t.carbonSaved}
            </span>
          </div>
        </Card>
      </div>

      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t.monthlyTrend}</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart
            data={insights.monthlyTrend}
            spentLabel={t.spent}
            earnedLabel={t.earned}
          />
        </CardContent>
      </Card>

      {categoryEntries.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.categoryBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart entries={categoryEntries} t={t} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
