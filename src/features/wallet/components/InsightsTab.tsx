/**
 * InsightsTab — Wallet Dashboard insights/analytics tab
 * Extracted from WalletDashboard to reduce file size
 */

import {
  ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { WaselColors } from '../../../tokens/wasel-tokens';
import { PIE_COLORS } from './walletSharedMeta';
import type { InsightsData } from '../../../services/walletApi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface InsightsTabProps {
  insights: InsightsData | null;
  isRTL: boolean;
  t: Record<string, string>;
}

export function InsightsTab({ insights, isRTL, t }: InsightsTabProps) {
  if (!insights) {
    return (
      <div className="text-center py-12" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{t.processing}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Month summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-red-400" />
            <span className="text-xs text-muted-foreground">{t.spent}</span>
          </div>
          <p className="text-2xl font-bold text-foreground tabular-nums">{insights.thisMonthSpent.toFixed(2)}</p>
          <div className="flex items-center gap-1 mt-1">
            {insights.changePercent > 0 ? (
              <TrendingUp className="w-3 h-3 text-red-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-green-400" />
            )}
            <span className={`text-xs ${insights.changePercent > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {Math.abs(insights.changePercent)}% {t.vsLastMonth}
            </span>
          </div>
        </Card>
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft className="w-4 h-4 text-green-400" />
            <span className="text-xs text-muted-foreground">{t.earned}</span>
          </div>
          <p className="text-2xl font-bold text-foreground tabular-nums">{insights.thisMonthEarned.toFixed(2)}</p>
          <div className="flex items-center gap-1 mt-1">
            <Zap className="w-3 h-3 text-teal-400" />
            <span className="text-xs text-teal-400">
              {insights.carbonSaved.toFixed(0)} kg {t.carbonSaved}
            </span>
          </div>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t.monthlyTrend}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={insights.monthlyTrend} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: WaselColors.navyCard, border: `1px solid ${WaselColors.space4}`, borderRadius: 8 }}
                labelStyle={{ color: '#F1F5F9' }}
              />
              <Bar dataKey="earned" fill={WaselColors.teal} radius={[4, 4, 0, 0]} name={t.earned} />
              <Bar dataKey="spent" fill={WaselColors.bronze} radius={[4, 4, 0, 0]} name={t.spent} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {Object.keys(insights.categoryBreakdown).length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.categoryBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={Object.entries(insights.categoryBreakdown).map(([name, value]) => ({ name, value }))}
                    cx="50%" cy="50%"
                    innerRadius={35} outerRadius={55}
                    dataKey="value"
                  >
                    {Object.keys(insights.categoryBreakdown).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {Object.entries(insights.categoryBreakdown).map(([cat, val], i) => (
                  <div key={cat} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground capitalize">{cat.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="text-xs font-medium text-foreground tabular-nums">{(val as number).toFixed(2)} {t.jod}</span>
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
