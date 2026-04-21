import { useState } from 'react';
import { Wallet, TrendingUp, Shield, Zap, CreditCard, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { PageShell, PageHeader, StatCard, DataPanel, MetricRow, ActionButton, InfoCard } from '../../services/pageComponents';
import { DesignSystem } from '../../services/designSystem';

export function WalletDashboardEnhanced() {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'insights'>('overview');

  // Mock data
  const balance = 245.50;
  const pendingAmount = 32.00;
  const monthlySpend = 189.30;
  const savingsRate = 0.18;

  const stats = [
    {
      label: 'Available Balance',
      value: `${balance.toFixed(2)} JOD`,
      detail: 'Ready for instant transactions across all services.',
      accent: DesignSystem.colors.cyan.base,
    },
    {
      label: 'Pending',
      value: `${pendingAmount.toFixed(2)} JOD`,
      detail: 'Funds in transit from recent ride completions.',
      accent: DesignSystem.colors.blue.base,
    },
    {
      label: 'Monthly Spend',
      value: `${monthlySpend.toFixed(2)} JOD`,
      detail: 'Total movement across rides, packages, and services.',
      accent: DesignSystem.colors.gold.base,
    },
    {
      label: 'Savings Rate',
      value: `${Math.round(savingsRate * 100)}%`,
      detail: 'Efficiency gain from shared rides and package bundling.',
      accent: DesignSystem.colors.green.base,
    },
  ];

  const recentTransactions = [
    { id: '1', type: 'ride', from: 'Amman', to: 'Zarqa', amount: -12.50, status: 'completed', time: '2 hours ago' },
    { id: '2', type: 'topup', amount: 50.00, status: 'completed', time: '1 day ago' },
    { id: '3', type: 'package', from: 'Irbid', to: 'Amman', amount: -8.00, status: 'pending', time: '2 days ago' },
    { id: '4', type: 'ride', from: 'Amman', to: 'Aqaba', amount: -45.00, status: 'completed', time: '3 days ago' },
  ];

  const metrics = [
    { label: 'Ride efficiency', value: 0.82, color: DesignSystem.colors.cyan.base },
    { label: 'Package utilization', value: 0.64, color: DesignSystem.colors.gold.base },
    { label: 'Payment reliability', value: 0.96, color: DesignSystem.colors.green.base },
  ];

  const insights = [
    {
      icon: <TrendingUp size={18} color={DesignSystem.colors.cyan.base} />,
      title: 'Spending pattern',
      value: '↓ 12%',
      body: 'Your monthly spend decreased by 12% through optimized ride sharing.',
      accent: DesignSystem.colors.cyan.base,
    },
    {
      icon: <Shield size={18} color={DesignSystem.colors.green.base} />,
      title: 'Trust score',
      value: '96/100',
      body: 'Excellent payment history and consistent transaction completion.',
      accent: DesignSystem.colors.green.base,
    },
    {
      icon: <Zap size={18} color={DesignSystem.colors.gold.base} />,
      title: 'Quick actions',
      value: '3 saved',
      body: 'Frequent routes saved for one-tap booking and instant payment.',
      accent: DesignSystem.colors.gold.base,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        badge="Financial Control Center"
        title="Wallet Dashboard"
        description="Complete visibility into your mobility finances with real-time balance tracking, transaction history, and intelligent spending insights."
        formulas={['balance = available + pending', 'efficiency = (saved / total) × 100']}
        actions={
          <>
            <ActionButton
              label="Add Funds"
              onClick={() => console.log('Add funds')}
              variant="primary"
              icon={<CreditCard size={16} />}
            />
            <ActionButton
              label="Transaction History"
              onClick={() => console.log('History')}
              variant="outline"
              icon={<Clock size={16} />}
            />
          </>
        }
      />

      <section style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {(['overview', 'transactions', 'insights'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              height: 38,
              padding: '0 18px',
              borderRadius: DesignSystem.radius.full,
              border: `1px solid ${activeTab === tab ? DesignSystem.colors.cyan.base : DesignSystem.colors.border.base}`,
              background: activeTab === tab ? DesignSystem.colors.cyan.dim : 'rgba(255,255,255,0.03)',
              color: activeTab === tab ? DesignSystem.colors.cyan.base : DesignSystem.colors.text.muted,
              cursor: 'pointer',
              fontWeight: DesignSystem.typography.fontWeight.black,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: DesignSystem.typography.fontSize.xs,
              transition: 'all 0.2s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </section>

      {activeTab === 'overview' && (
        <section style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.9fr)' }}>
          <DataPanel
            title="Recent Transactions"
            icon={<Wallet size={18} color={DesignSystem.colors.cyan.base} />}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 18,
                    border: `1px solid ${DesignSystem.colors.border.base}`,
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {tx.amount > 0 ? (
                      <ArrowDownLeft size={16} color={DesignSystem.colors.green.base} />
                    ) : (
                      <ArrowUpRight size={16} color={DesignSystem.colors.cyan.base} />
                    )}
                    <div>
                      <div style={{ fontWeight: DesignSystem.typography.fontWeight.bold }}>
                        {tx.type === 'topup' ? 'Top Up' : `${tx.from} → ${tx.to}`}
                      </div>
                      <div style={{ fontSize: DesignSystem.typography.fontSize.xs, color: DesignSystem.colors.text.muted }}>
                        {tx.time}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontWeight: DesignSystem.typography.fontWeight.black,
                    color: tx.amount > 0 ? DesignSystem.colors.green.base : DesignSystem.colors.text.primary,
                  }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} JOD
                  </div>
                </div>
              ))}
            </div>
          </DataPanel>

          <DataPanel
            title="Performance Metrics"
            icon={<TrendingUp size={18} color={DesignSystem.colors.gold.base} />}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              {metrics.map((metric) => (
                <MetricRow key={metric.label} {...metric} />
              ))}
            </div>
          </DataPanel>
        </section>
      )}

      {activeTab === 'insights' && (
        <section style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {insights.map((insight) => (
            <InfoCard key={insight.title} {...insight} />
          ))}
        </section>
      )}
    </PageShell>
  );
}
