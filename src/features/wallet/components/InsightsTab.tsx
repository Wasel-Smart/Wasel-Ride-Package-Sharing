/**
 * InsightsTab - Wallet Dashboard insights/analytics tab
 * Uses inline SVG charts to avoid shipping a large charting runtime for one tab.
 */

import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { WaselColors } from '../../../tokens/wasel-tokens';
import { PIE_COLORS } from './WalletShared';
import type { InsightsData } from '../../../services/walletApi';

interface InsightsTabProps {
  insights: InsightsData | null;
  isRTL: boolean;
  t: Record<string, string>;
}

type TrendPoint = InsightsData['monthlyTrend'][number];
type CategoryPoint = { name: string; value: number; color: string };

const BAR_CHART_WIDTH = 520;
const BAR_CHART_HEIGHT = 200;
const BAR_CHART_MARGIN = { top: 12, right: 12, bottom: 28, left: 40 };
const DONUT_RADIUS = 42;
const DONUT_STROKE = 18;

function formatCompactValue(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return value.toFixed(value >= 100 ? 0 : 1);
}

function MiniTrendChart({
  data,
  earnedLabel,
  spentLabel,
}: {
  data: TrendPoint[];
  earnedLabel: string;
  spentLabel: string;
}) {
  const chartData = data.slice(-6);
  const maxValue = Math.max(1, ...chartData.flatMap(point => [point.earned, point.spent]));
  const innerWidth = BAR_CHART_WIDTH - BAR_CHART_MARGIN.left - BAR_CHART_MARGIN.right;
  const innerHeight = BAR_CHART_HEIGHT - BAR_CHART_MARGIN.top - BAR_CHART_MARGIN.bottom;
  const slotWidth = innerWidth / Math.max(chartData.length, 1);
  const groupWidth = Math.min(32, Math.max(18, slotWidth * 0.56));
  const barWidth = Math.max(7, Math.floor(groupWidth / 2) - 2);
  const ticks = Array.from({ length: 4 }, (_, index) => {
    const value = maxValue * (1 - index / 3);
    const y = BAR_CHART_MARGIN.top + (innerHeight / 3) * index;
    return { value, y };
  });

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${BAR_CHART_WIDTH} ${BAR_CHART_HEIGHT}`}
        className="h-[200px] w-full overflow-visible"
        role="img"
        aria-label={`${earnedLabel} and ${spentLabel} monthly trend`}
      >
        {ticks.map((tick, index) => (
          <g key={index}>
            <line
              x1={BAR_CHART_MARGIN.left}
              x2={BAR_CHART_WIDTH - BAR_CHART_MARGIN.right}
              y1={tick.y}
              y2={tick.y}
              stroke="#1E293B"
              strokeDasharray="3 3"
            />
            <text
              x={BAR_CHART_MARGIN.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              fill="#94A3B8"
              fontSize="11"
            >
              {formatCompactValue(tick.value)}
            </text>
          </g>
        ))}

        {chartData.map((point, index) => {
          const x = BAR_CHART_MARGIN.left + slotWidth * index + (slotWidth - groupWidth) / 2;
          const earnedHeight = (point.earned / maxValue) * innerHeight;
          const spentHeight = (point.spent / maxValue) * innerHeight;
          const baseline = BAR_CHART_MARGIN.top + innerHeight;

          return (
            <g key={`${point.month}-${index}`}>
              <rect
                x={x}
                y={baseline - earnedHeight}
                width={barWidth}
                height={Math.max(earnedHeight, 2)}
                rx="4"
                fill={WaselColors.teal}
              >
                <title>{`${point.month}: ${earnedLabel} ${point.earned.toFixed(2)}`}</title>
              </rect>
              <rect
                x={x + barWidth + 4}
                y={baseline - spentHeight}
                width={barWidth}
                height={Math.max(spentHeight, 2)}
                rx="4"
                fill={WaselColors.bronze}
              >
                <title>{`${point.month}: ${spentLabel} ${point.spent.toFixed(2)}`}</title>
              </rect>
              <text
                x={x + groupWidth / 2}
                y={BAR_CHART_HEIGHT - 10}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="11"
              >
                {point.month}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: WaselColors.teal }} />
          {earnedLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: WaselColors.bronze }} />
          {spentLabel}
        </span>
      </div>
    </div>
  );
}

function MiniCategoryDonut({ data }: { data: CategoryPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const circumference = 2 * Math.PI * DONUT_RADIUS;
  let offset = 0;

  return (
    <svg
      viewBox="0 0 120 120"
      className="h-[120px] w-[120px] shrink-0"
      role="img"
      aria-label="Wallet category breakdown"
    >
      <circle
        cx="60"
        cy="60"
        r={DONUT_RADIUS}
        fill="none"
        stroke="rgba(148, 163, 184, 0.18)"
        strokeWidth={DONUT_STROKE}
      />
      {total > 0 &&
        data.map(item => {
          const arc = (item.value / total) * circumference;
          const circle = (
            <circle
              key={item.name}
              cx="60"
              cy="60"
              r={DONUT_RADIUS}
              fill="none"
              stroke={item.color}
              strokeWidth={DONUT_STROKE}
              strokeDasharray={`${arc} ${circumference - arc}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
              strokeLinecap="round"
            >
              <title>{`${item.name}: ${item.value.toFixed(2)}`}</title>
            </circle>
          );

          offset += arc;
          return circle;
        })}
      <text x="60" y="55" textAnchor="middle" fill="#F8FAFC" fontSize="16" fontWeight="700">
        {total.toFixed(0)}
      </text>
      <text x="60" y="72" textAnchor="middle" fill="#94A3B8" fontSize="10">
        total
      </text>
    </svg>
  );
}

export function InsightsTab({ insights, isRTL, t }: InsightsTabProps) {
  void isRTL;

  if (!insights) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{t.processing}</p>
      </div>
    );
  }

  const categoryData = Object.entries(insights.categoryBreakdown).map(([name, value], index) => ({
    name,
    value,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-red-400" />
            <span className="text-xs text-muted-foreground">{t.spent}</span>
          </div>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {insights.thisMonthSpent.toFixed(2)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {insights.changePercent > 0 ? (
              <TrendingUp className="w-3 h-3 text-red-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-green-400" />
            )}
            <span
              className={`text-xs ${insights.changePercent > 0 ? 'text-red-400' : 'text-green-400'}`}
            >
              {Math.abs(insights.changePercent)}% {t.vsLastMonth}
            </span>
          </div>
        </Card>
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft className="w-4 h-4 text-green-400" />
            <span className="text-xs text-muted-foreground">{t.earned}</span>
          </div>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {insights.thisMonthEarned.toFixed(2)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Zap className="w-3 h-3 text-teal-400" />
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
          <MiniTrendChart
            data={insights.monthlyTrend}
            earnedLabel={t.earned}
            spentLabel={t.spent}
          />
        </CardContent>
      </Card>

      {categoryData.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.categoryBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <MiniCategoryDonut data={categoryData} />
              <div className="flex-1 space-y-2">
                {categoryData.map(item => (
                  <div key={item.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {item.name.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-foreground tabular-nums">
                      {item.value.toFixed(2)} {t.jod}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
