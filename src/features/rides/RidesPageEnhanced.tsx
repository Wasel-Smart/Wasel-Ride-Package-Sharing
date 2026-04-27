import { useState } from 'react';
import { MapPin, Navigation, Users, Clock, Star, Car } from 'lucide-react';
import { PageShell, PageHeader, StatCard, DataPanel, ActionButton, GlassCard } from '../../services/pageComponents';
import { DesignSystem } from '../../services/designSystem';

export function RidesPageEnhanced() {
  const [searchMode, setSearchMode] = useState<'now' | 'schedule'>('now');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const handlePlaceholderAction = () => undefined;

  const stats = [
    {
      label: 'Active Rides',
      value: '127',
      detail: 'Live rides available across major corridors right now.',
      accent: DesignSystem.colors.cyan.base,
    },
    {
      label: 'Avg Match Time',
      value: '< 3 min',
      detail: 'Median time from request to driver confirmation.',
      accent: DesignSystem.colors.green.base,
    },
    {
      label: 'Network Coverage',
      value: '94%',
      detail: 'Percentage of Jordan corridors with active service.',
      accent: DesignSystem.colors.blue.base,
    },
    {
      label: 'Trust Score',
      value: '4.8/5',
      detail: 'Average driver rating across all active routes.',
      accent: DesignSystem.colors.gold.base,
    },
  ];

  const popularRoutes = [
    { from: 'Amman', to: 'Zarqa', rides: 23, avgPrice: 12.5, eta: 28, demand: 0.82 },
    { from: 'Amman', to: 'Irbid', rides: 18, avgPrice: 18.0, eta: 62, demand: 0.76 },
    { from: 'Amman', to: 'Aqaba', rides: 12, avgPrice: 45.0, eta: 235, demand: 0.93 },
    { from: 'Irbid', to: 'Zarqa', rides: 8, avgPrice: 15.5, eta: 67, demand: 0.53 },
  ];

  const liveRides = [
    {
      id: '1',
      driver: 'Ahmad K.',
      rating: 4.9,
      vehicle: 'Toyota Camry',
      from: 'Amman',
      to: 'Zarqa',
      price: 12.5,
      seats: 3,
      eta: 5,
      verified: true,
    },
    {
      id: '2',
      driver: 'Sara M.',
      rating: 4.8,
      vehicle: 'Honda Accord',
      from: 'Amman',
      to: 'Irbid',
      price: 18.0,
      seats: 2,
      eta: 8,
      verified: true,
    },
    {
      id: '3',
      driver: 'Omar H.',
      rating: 4.7,
      vehicle: 'Hyundai Elantra',
      from: 'Amman',
      to: 'Madaba',
      price: 8.5,
      seats: 4,
      eta: 12,
      verified: false,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        badge="Ride Discovery Engine"
        title="Find Your Ride"
        description="Intelligent ride matching powered by real-time corridor analysis, driver verification, and instant availability across Jordan's mobility network."
        formulas={['match_score = 0.4×trust + 0.3×speed + 0.3×price', 'eta = distance / (velocity × reliability)']}
        actions={
          <>
            <ActionButton
              label="My Trips"
              onClick={handlePlaceholderAction}
              variant="outline"
              icon={<Clock size={16} />}
            />
            <ActionButton
              label="Offer Ride"
              onClick={handlePlaceholderAction}
              variant="ghost"
              icon={<Car size={16} />}
            />
          </>
        }
      />

      <section style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <GlassCard padding={24}>
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <div style={{
              fontSize: DesignSystem.typography.fontSize.xs,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: DesignSystem.colors.cyan.base,
              marginBottom: 8,
            }}>
              Search Mode
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['now', 'schedule'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSearchMode(mode)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: DesignSystem.radius.md,
                    border: `1px solid ${searchMode === mode ? DesignSystem.colors.cyan.base : DesignSystem.colors.border.base}`,
                    background: searchMode === mode ? DesignSystem.colors.cyan.dim : 'rgba(255,255,255,0.04)',
                    color: searchMode === mode ? DesignSystem.colors.cyan.base : DesignSystem.colors.text.primary,
                    cursor: 'pointer',
                    fontWeight: DesignSystem.typography.fontWeight.bold,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {mode === 'now' ? 'Now' : 'Schedule'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: DesignSystem.typography.fontSize.sm,
                fontWeight: DesignSystem.typography.fontWeight.semibold,
                marginBottom: 8,
                color: DesignSystem.colors.text.secondary,
              }}>
                From
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: DesignSystem.colors.text.muted,
                  }}
                />
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="Pickup location"
                  style={{
                    width: '100%',
                    height: 44,
                    paddingLeft: 40,
                    paddingRight: 14,
                    borderRadius: DesignSystem.radius.md,
                    border: `1px solid ${DesignSystem.colors.border.base}`,
                    background: 'rgba(0, 0, 0, 0.22)',
                    color: DesignSystem.colors.text.primary,
                    fontSize: DesignSystem.typography.fontSize.base,
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={(e) => e.target.style.borderColor = DesignSystem.colors.cyan.border}
                  onBlur={(e) => e.target.style.borderColor = DesignSystem.colors.border.base}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: DesignSystem.typography.fontSize.sm,
                fontWeight: DesignSystem.typography.fontWeight.semibold,
                marginBottom: 8,
                color: DesignSystem.colors.text.secondary,
              }}>
                To
              </label>
              <div style={{ position: 'relative' }}>
                <Navigation
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: DesignSystem.colors.text.muted,
                  }}
                />
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Destination"
                  style={{
                    width: '100%',
                    height: 44,
                    paddingLeft: 40,
                    paddingRight: 14,
                    borderRadius: DesignSystem.radius.md,
                    border: `1px solid ${DesignSystem.colors.border.base}`,
                    background: 'rgba(0, 0, 0, 0.22)',
                    color: DesignSystem.colors.text.primary,
                    fontSize: DesignSystem.typography.fontSize.base,
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                  onFocus={(e) => e.target.style.borderColor = DesignSystem.colors.cyan.border}
                  onBlur={(e) => e.target.style.borderColor = DesignSystem.colors.border.base}
                />
              </div>
            </div>
          </div>

          <ActionButton
            label="Search Rides"
            onClick={handlePlaceholderAction}
            variant="primary"
            icon={<Navigation size={16} />}
          />
        </div>
      </GlassCard>

      <section style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.9fr)' }}>
        <DataPanel
          title="Live Ride Matches"
          icon={<Car size={18} color={DesignSystem.colors.cyan.base} />}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            {liveRides.map((ride) => (
              <div
                key={ride.id}
                style={{
                  padding: '16px 18px',
                  borderRadius: 20,
                  border: `1px solid ${DesignSystem.colors.border.base}`,
                  background: 'rgba(255,255,255,0.03)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = DesignSystem.colors.cyan.border;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = DesignSystem.colors.border.base;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: DesignSystem.typography.fontWeight.bold, fontSize: DesignSystem.typography.fontSize.lg }}>
                        {ride.driver}
                      </span>
                      {ride.verified && (
                        <div style={{
                          padding: '2px 6px',
                          borderRadius: DesignSystem.radius.full,
                          background: DesignSystem.colors.green.dim,
                          color: DesignSystem.colors.green.base,
                          fontSize: DesignSystem.typography.fontSize.xs,
                          fontWeight: DesignSystem.typography.fontWeight.bold,
                        }}>
                          Verified
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: DesignSystem.typography.fontSize.sm, color: DesignSystem.colors.text.muted, marginTop: 4 }}>
                      {ride.vehicle}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={14} fill={DesignSystem.colors.gold.base} color={DesignSystem.colors.gold.base} />
                    <span style={{ fontWeight: DesignSystem.typography.fontWeight.bold }}>{ride.rating}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: DesignSystem.typography.fontSize.base }}>
                    <span style={{ color: DesignSystem.colors.cyan.base }}>{ride.from}</span>
                    {' → '}
                    <span style={{ color: DesignSystem.colors.blue.base }}>{ride.to}</span>
                  </div>
                  <div style={{ fontSize: DesignSystem.typography.fontSize.xl, fontWeight: DesignSystem.typography.fontWeight.black, color: DesignSystem.colors.cyan.base }}>
                    {ride.price.toFixed(2)} JOD
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: DesignSystem.typography.fontSize.sm, color: DesignSystem.colors.text.muted }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} />
                    {ride.seats} seats
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} />
                    {ride.eta} min
                  </div>
                </div>

                <button
                  style={{
                    width: '100%',
                    marginTop: 14,
                    height: 40,
                    borderRadius: DesignSystem.radius.md,
                    border: `1px solid ${DesignSystem.colors.cyan.border}`,
                    background: DesignSystem.colors.cyan.dim,
                    color: DesignSystem.colors.cyan.base,
                    fontWeight: DesignSystem.typography.fontWeight.bold,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = DesignSystem.colors.cyan.base;
                    e.currentTarget.style.color = DesignSystem.colors.bg.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = DesignSystem.colors.cyan.dim;
                    e.currentTarget.style.color = DesignSystem.colors.cyan.base;
                  }}
                >
                  Request Ride
                </button>
              </div>
            ))}
          </div>
        </DataPanel>

        <DataPanel
          title="Popular Routes"
          icon={<MapPin size={18} color={DesignSystem.colors.gold.base} />}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {popularRoutes.map((route, index) => (
              <div
                key={index}
                style={{
                  padding: '12px 14px',
                  borderRadius: 16,
                  border: `1px solid ${DesignSystem.colors.border.base}`,
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ fontWeight: DesignSystem.typography.fontWeight.bold, marginBottom: 6 }}>
                  {route.from} → {route.to}
                </div>
                <div style={{ display: 'grid', gap: 4, fontSize: DesignSystem.typography.fontSize.xs, color: DesignSystem.colors.text.muted }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{route.rides} rides</span>
                    <span>{route.avgPrice.toFixed(2)} JOD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>ETA {route.eta} min</span>
                    <span style={{ color: DesignSystem.colors.cyan.base }}>
                      {Math.round(route.demand * 100)}% demand
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataPanel>
      </section>
    </PageShell>
  );
}
