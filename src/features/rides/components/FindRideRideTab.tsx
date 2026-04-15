import { AnimatePresence, motion } from 'motion/react';
import {
  Brain,
  Calendar,
  CheckCircle2,
  MapPin,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { MapWrapper } from '../../../components/MapWrapper';
import type { CorridorOpportunity } from '../../../config/wasel-movement-network';
import type {
  RecurringRouteSuggestion,
  RouteReminder,
} from '../../../services/movementRetention';
import type { MovementPriceQuote } from '../../../services/movementPricing';
import type { LiveCorridorSignal } from '../../../services/routeDemandIntelligence';
import { CITIES, type Ride } from '../../../pages/waselCoreRideData';
import {
  DS,
  midpoint,
  pill,
  r,
} from '../../../pages/waselServiceShared';
import { FindRideCard } from './FindRideCard';

type SortOption = 'price' | 'time' | 'rating';

type LatLng = {
  lat: number;
  lng: number;
};

type NearbyCorridorPreview = {
  ride: Ride;
  priceLabel: string;
};

type FindRideLabels = {
  from: string;
  to: string;
  date: string;
  searching: string;
  cheapest: string;
  earliest: string;
  topRated: string;
  noRidesFound: string;
  clearDateFilter: string;
  openBusFallback: string;
  nearbyCorridors: string;
  recentSearches: string;
  bookedTrips: string;
  noTripsYet: string;
};

type FindRideStaticCopy = {
  noResultsIcon: string;
  notifyMe: string;
};

export type FindRideRideTabProps = {
  labels: FindRideLabels;
  staticCopy: FindRideStaticCopy;
  from: string;
  to: string;
  date: string;
  loading: boolean;
  searched: boolean;
  sort: SortOption;
  searchError: string | null;
  bookingMessage: string | null;
  retentionMessage: string | null;
  waitlistMessage: string | null;
  routeReadinessLabel: string;
  corridorRidesCount: number;
  demandStatsActive: number;
  selectedSignal: LiveCorridorSignal | null;
  selectedPriceQuote: MovementPriceQuote | null;
  corridorPlan: CorridorOpportunity | null;
  featuredSignals: LiveCorridorSignal[];
  results: Ride[];
  bookedRideIds: Set<string>;
  pendingRideIds: Set<string>;
  nearbyCorridors: NearbyCorridorPreview[];
  recurringSuggestions: RecurringRouteSuggestion[];
  savedReminders: RouteReminder[];
  savedReminderIds: Set<string>;
  recentSearches: string[];
  bookedRideSummaries: string[];
  searchFromCoord: LatLng;
  searchToCoord: LatLng;
  onSetFrom: (value: string) => void;
  onSetTo: (value: string) => void;
  onSetDate: (value: string) => void;
  onSearch: () => void;
  onSetSort: (value: SortOption) => void;
  onOpenRide: (ride: Ride) => void;
  onFocusCorridor: (from: string, to: string) => void;
  onSaveReminder: (corridorId: string) => void;
  onClearDateFilter: () => void;
  onOpenBusFallback: () => void;
  onDemandCapture: () => void;
  formatRouteReminderSchedule: (reminder: RouteReminder) => string;
  resolveSignalForRide: (ride: Ride) => LiveCorridorSignal | null;
};

type AlertBannerProps = {
  icon: LucideIcon;
  tone: string;
  background: string;
  border: string;
  message: string;
};

function RideCardSkeleton() {
  return (
    <div style={{
      background: DS.card,
      borderRadius: r(20),
      border: `1px solid ${DS.border}`,
      overflow: 'hidden',
      boxShadow: 'var(--wasel-shadow-card)',
    }}>
      <div style={{ height: 3, background: DS.gradC, opacity: 0.4 }} />
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="skeleton-base" style={{ width: 46, height: 46, borderRadius: r(14) }} />
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="skeleton-base sk-line" style={{ width: 120 }} />
              <div className="skeleton-base sk-line-sm" style={{ width: 80 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8, alignItems: 'flex-end' }}>
            <div className="skeleton-base sk-line-lg" style={{ width: 60 }} />
            <div className="skeleton-base sk-line-sm" style={{ width: 44 }} />
          </div>
        </div>
        <div className="skeleton-base sk-rect" style={{ height: 64, marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[80, 64, 72].map((w) => (
            <div key={w} className="skeleton-base" style={{ height: 24, width: w, borderRadius: 999 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertBanner({
  icon: Icon,
  tone,
  background,
  border,
  message,
}: AlertBannerProps) {
  return (
    <div
      style={{
        marginTop: 14,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        background,
        border,
        borderRadius: r(16),
        padding: '14px 16px',
        fontSize: '0.84rem',
        lineHeight: 1.6,
        boxShadow: `0 4px 16px ${tone}14`,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: r(10), flexShrink: 0,
        background: `${tone}18`, border: `1px solid ${tone}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={15} color={tone} />
      </div>
      <span style={{ color: DS.text, paddingTop: 6 }}>{message}</span>
    </div>
  );
}

type SignalMetric = {
  label: string;
  value: string;
  sub: string;
  tone: string;
};

function SignalMetricGrid({ items }: { items: SignalMetric[] }) {
  return (
    <div
      className="sp-3col"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 12,
        marginTop: 14,
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            background: DS.card2,
            borderRadius: r(14),
            padding: '14px 15px',
            border: `1px solid ${DS.border}`,
            transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = DS.borderH;
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--wasel-shadow-sm)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = DS.border;
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          <div
            style={{
              color: DS.muted,
              fontSize: '0.68rem',
              fontWeight: 800,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: '0.96rem',
              lineHeight: 1.4,
              marginBottom: 6,
              background: `linear-gradient(135deg, ${item.tone}, color-mix(in srgb, ${item.tone} 70%, white))`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {item.value}
          </div>
          <div
            style={{
              color: DS.sub,
              fontSize: '0.75rem',
              lineHeight: 1.55,
            }}
          >
            {item.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

type RideSearchPanelProps = {
  labels: FindRideLabels;
  from: string;
  to: string;
  date: string;
  loading: boolean;
  routeReadinessLabel: string;
  corridorRidesCount: number;
  demandStatsActive: number;
  selectedSignal: LiveCorridorSignal | null;
  selectedPriceQuote: MovementPriceQuote | null;
  corridorPlan: CorridorOpportunity | null;
  searchFromCoord: LatLng;
  searchToCoord: LatLng;
  searchError: string | null;
  bookingMessage: string | null;
  retentionMessage: string | null;
  onSetFrom: (value: string) => void;
  onSetTo: (value: string) => void;
  onSetDate: (value: string) => void;
  onSearch: () => void;
};

function RideSearchPanel({
  labels,
  from,
  to,
  date,
  loading,
  routeReadinessLabel,
  corridorRidesCount,
  demandStatsActive,
  selectedSignal,
  selectedPriceQuote,
  corridorPlan,
  searchFromCoord,
  searchToCoord,
  searchError,
  bookingMessage,
  retentionMessage,
  onSetFrom,
  onSetTo,
  onSetDate,
  onSearch,
}: RideSearchPanelProps) {
  const metricItems: SignalMetric[] = [
    {
      label: 'Readiness',
      value: routeReadinessLabel,
      sub: selectedSignal
        ? `${selectedSignal.activeSupply} live departures · ${selectedSignal.liveBookings} bookings`
        : `${corridorRidesCount} live departures on this lane`,
      tone: DS.cyan,
    },
    {
      label: 'Price window',
      value: selectedPriceQuote ? `${selectedPriceQuote.finalPriceJod} JOD` : 'Search to unlock',
      sub: selectedPriceQuote
        ? `${selectedPriceQuote.discountJod} JOD saved via ${selectedPriceQuote.explanation}`
        : `Shared demand unlocks the best price · ${demandStatsActive} active alerts`,
      tone: DS.green,
    },
    {
      label: 'Best move',
      value:
        selectedSignal?.nextWaveWindow
        ?? corridorPlan?.autoGroupWindow
        ?? 'Choose the lane first',
      sub:
        selectedSignal?.recommendedPickupPoint
        ?? corridorPlan?.pickupPoints[0]
        ?? 'Pickup appears after a route is selected',
      tone: DS.gold,
    },
  ];

  return (
    <div
      style={{
        background: DS.card,
        borderRadius: r(20),
        padding: 24,
        border: `1px solid ${DS.border}`,
        marginBottom: 24,
      }}
    >
      <div
        className="sp-search-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 180px',
          gap: 12,
          marginBottom: 14,
        }}
      >
        {[
          { label: labels.from, value: from, setter: onSetFrom, icon: DS.green },
          { label: labels.to, value: to, setter: onSetTo, icon: DS.cyan },
        ].map((field) => (
          <div key={field.label}>
            <label
              style={{
                display: 'block',
                fontSize: '0.7rem',
                color: DS.muted,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              {field.label}
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: DS.card2,
                borderRadius: r(12),
                padding: '0 14px',
                border: `1px solid ${DS.border}`,
                height: 46,
              }}
            >
              <MapPin size={15} color={field.icon} />
              <select
                value={field.value}
                onChange={(event) => field.setter(event.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: DS.text,
                  fontFamily: DS.F,
                  fontSize: '0.9rem',
                  flex: 1,
                  outline: 'none',
                }}
              >
                {CITIES.map((city) => (
                  <option key={city} value={city} style={{ background: DS.card }}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.7rem',
              color: DS.muted,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            {labels.date}
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: DS.card2,
              borderRadius: r(12),
              padding: '0 14px',
              border: `1px solid ${DS.border}`,
              height: 46,
            }}
          >
            <Calendar size={15} color={DS.muted} />
            <input
              type="date"
              value={date}
              onChange={(event) => onSetDate(event.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                background: 'transparent',
                border: 'none',
                color: DS.text,
                fontFamily: DS.F,
                fontSize: '0.85rem',
                flex: 1,
                outline: 'none',
                colorScheme: 'light dark',
              }}
            />
          </div>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSearch}
        data-testid="find-ride-search"
        style={{
          width: '100%',
          height: 52,
          borderRadius: r(14),
          border: 'none',
          background: DS.gradC,
          color: '#fff',
          fontWeight: 800,
          fontSize: '1rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 20,
              height: 20,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTop: '2px solid #fff',
              borderRadius: '50%',
            }}
          />
        ) : (
          <Search size={18} />
        )}
        {loading ? labels.searching : 'Search'}
      </motion.button>

      <SignalMetricGrid items={metricItems} />

      <div
        style={{
          marginTop: 14,
          background: DS.card2,
          borderRadius: r(14),
          padding: 12,
          border: `1px solid ${DS.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 10,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                color: DS.muted,
                fontSize: '0.72rem',
                fontWeight: 700,
                margin: '0 0 4px',
              }}
            >
              Corridor preview
            </p>
            <p style={{ color: DS.sub, fontSize: '0.8rem', margin: 0 }}>
              {selectedSignal
                ? 'Open the map, then book with clearer timing and pickup context.'
                : 'Preview the lane before you commit to the booking.'}
            </p>
          </div>
          <span style={{ ...pill(selectedSignal ? DS.green : DS.cyan), fontSize: '0.72rem' }}>
            {selectedSignal
              ? `${selectedSignal.routeOwnershipScore}/100 route fit`
              : corridorPlan?.density ?? 'steady density'}
          </span>
        </div>
        <MapWrapper
          mode="static"
          center={midpoint(searchFromCoord, searchToCoord)}
          pickupLocation={searchFromCoord}
          dropoffLocation={searchToCoord}
          height={180}
          showMosques={false}
          showRadars={false}
        />
      </div>

      {searchError ? (
        <AlertBanner
          icon={Shield}
          tone={DS.gold}
          background={`${DS.gold}12`}
          border={`1px solid ${DS.gold}30`}
          message={searchError}
        />
      ) : null}
      {bookingMessage ? (
        <AlertBanner
          icon={CheckCircle2}
          tone={DS.green}
          background="rgba(107,181,21,0.10)"
          border="1px solid rgba(107,181,21,0.28)"
          message={bookingMessage}
        />
      ) : null}
      {retentionMessage ? (
        <AlertBanner
          icon={Sparkles}
          tone={DS.cyan}
          background={`${DS.cyan}12`}
          border={`1px solid ${DS.cyan}30`}
          message={retentionMessage}
        />
      ) : null}
    </div>
  );
}

type RideBriefPanelsProps = {
  corridorPlan: CorridorOpportunity | null;
  selectedSignal: LiveCorridorSignal | null;
  featuredSignals: LiveCorridorSignal[];
  onFocusCorridor: (from: string, to: string) => void;
};

function RideBriefPanels({
  corridorPlan,
  selectedSignal,
  featuredSignals,
  onFocusCorridor,
}: RideBriefPanelsProps) {
  const routeBriefLines = selectedSignal
    ? [
        selectedSignal.recommendedReason,
        `Pickup: ${selectedSignal.recommendedPickupPoint}.`,
        `Next wave: ${selectedSignal.nextWaveWindow}.`,
      ]
    : corridorPlan?.intelligenceSignals ?? [
        'Start with the lane.',
        'Check price and pickup.',
        'Use demand to save more.',
      ];

  return (
    <div
      className="sp-2col"
      style={{
        display: 'grid',
        gridTemplateColumns: '1.15fr 0.85fr',
        gap: 14,
        marginBottom: 22,
      }}
    >
      <div
        style={{
          background: DS.card,
          borderRadius: r(18),
          padding: '18px 18px 16px',
          border: `1px solid ${DS.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: r(12),
              background: `${DS.cyan}12`,
              border: `1px solid ${DS.cyan}28`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Brain size={18} color={DS.cyan} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800 }}>Route brief</div>
            <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
              Key route details.
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {routeBriefLines.map((line) => (
            <div
              key={line}
              style={{
                borderRadius: r(14),
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                padding: '12px 14px',
                color: '#fff',
                fontSize: '0.82rem',
                lineHeight: 1.65,
              }}
            >
              {line}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(corridorPlan?.movementLayers ?? ['people', 'goods', 'services']).map((layer) => (
            <span key={layer} style={pill(DS.green)}>
              <Sparkles size={10} /> {layer}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          background: DS.card,
          borderRadius: r(18),
          padding: '18px 18px 16px',
          border: `1px solid ${DS.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: r(12),
              background: `${DS.gold}12`,
              border: `1px solid ${DS.gold}28`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <TrendingUp size={18} color={DS.gold} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800 }}>Priority corridors</div>
            <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
              Easy alternatives.
            </div>
          </div>
        </div>
        {featuredSignals.length > 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {featuredSignals.map((corridor) => (
              <button
                key={corridor.id}
                onClick={() => onFocusCorridor(corridor.from, corridor.to)}
                style={{
                  textAlign: 'left',
                  borderRadius: r(14),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  padding: '12px 14px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>
                      {corridor.label}
                    </div>
                    <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                      Demand {corridor.forecastDemandScore} | {corridor.priceQuote.finalPriceJod} JOD | Confidence {corridor.routeOwnershipScore}
                    </div>
                  </div>
                  <span style={pill(DS.cyan)}>{corridor.pricePressure}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div
            style={{
              borderRadius: r(14),
              border: `1px solid ${DS.border}`,
              background: DS.card2,
              padding: '14px 15px',
              color: DS.sub,
              fontSize: '0.8rem',
              lineHeight: 1.6,
            }}
          >
            Stronger live lanes will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

type RideResultsSectionProps = {
  labels: FindRideLabels;
  staticCopy: FindRideStaticCopy;
  from: string;
  to: string;
  loading: boolean;
  searched: boolean;
  sort: SortOption;
  results: Ride[];
  bookedRideIds: Set<string>;
  pendingRideIds: Set<string>;
  selectedSignal: LiveCorridorSignal | null;
  waitlistMessage: string | null;
  demandStatsActive: number;
  nearbyCorridors: NearbyCorridorPreview[];
  onSetSort: (value: SortOption) => void;
  onOpenRide: (ride: Ride) => void;
  onClearDateFilter: () => void;
  onOpenBusFallback: () => void;
  onDemandCapture: () => void;
  resolveSignalForRide: (ride: Ride) => LiveCorridorSignal | null;
};

function RideResultsSection({
  labels,
  staticCopy,
  from,
  to,
  loading,
  searched,
  sort,
  results,
  bookedRideIds,
  pendingRideIds,
  selectedSignal,
  waitlistMessage,
  demandStatsActive,
  nearbyCorridors,
  onSetSort,
  onOpenRide,
  onClearDateFilter,
  onOpenBusFallback,
  onDemandCapture,
  resolveSignalForRide,
}: RideResultsSectionProps) {
  return (
    <>
      <div
        className="sp-results-header"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>
            {searched
              ? `Matches for ${from} to ${to}`
              : 'Priority corridors ready now'}
          </h2>
          <div style={{ color: DS.muted, fontSize: '0.74rem' }}>
            {searched
              ? `${results.length} route match${results.length !== 1 ? 'es' : ''} ready to compare`
              : `Showing ${results.length} departures with the clearest fit first`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedSignal ? (
            <span style={pill(DS.cyan)}>
              {selectedSignal.priceQuote.finalPriceJod} JOD · {selectedSignal.nextWaveWindow}
            </span>
          ) : null}
          <div className="sp-sort-bar" style={{ display: 'flex', gap: 6 }}>
            {([
              ['price', labels.cheapest],
              ['time', labels.earliest],
              ['rating', labels.topRated],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => onSetSort(key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '99px',
                  border: `1px solid ${sort === key ? DS.cyan : DS.border}`,
                  background: sort === key ? `${DS.cyan}15` : DS.card2,
                  color: sort === key ? DS.cyan : DS.sub,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AnimatePresence>
          {loading ? (
            <>
              <RideCardSkeleton />
              <RideCardSkeleton />
              <RideCardSkeleton />
            </>
          ) : results.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: DS.card,
                borderRadius: r(20),
                padding: '60px 24px',
                textAlign: 'center',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>{staticCopy.noResultsIcon}</div>
              <h3 style={{ color: '#fff', fontWeight: 800, marginBottom: 8 }}>
                {labels.noRidesFound}
              </h3>
              <p style={{ color: DS.sub, fontSize: '0.875rem' }}>
                No live match yet. Save the route and check again
                {selectedSignal ? ` around ${selectedSignal.nextWaveWindow}` : ''}.
              </p>

              <div
                className="sp-empty-actions"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  marginTop: 18,
                }}
              >
                <button
                  onClick={onClearDateFilter}
                  style={{
                    height: 44,
                    borderRadius: r(12),
                    border: `1px solid ${DS.border}`,
                    background: DS.card2,
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {labels.clearDateFilter}
                </button>
                <button
                  onClick={onOpenBusFallback}
                  style={{
                    height: 44,
                    borderRadius: r(12),
                    border: 'none',
                    background: DS.gradG,
                    color: '#fff',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {labels.openBusFallback}
                </button>
              </div>

              <button
                onClick={onDemandCapture}
                style={{
                  marginTop: 10,
                  width: '100%',
                  height: 44,
                  borderRadius: r(12),
                  border: `1px solid ${DS.cyan}35`,
                  background: `${DS.cyan}12`,
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {staticCopy.notifyMe}
              </button>

              {waitlistMessage || demandStatsActive > 0 ? (
                <div style={{ marginTop: 12, color: DS.sub, fontSize: '0.78rem', lineHeight: 1.5 }}>
                  {waitlistMessage
                    ?? `${demandStatsActive} active alert${demandStatsActive === 1 ? '' : 's'}.`}
                </div>
              ) : null}

              {nearbyCorridors.length > 0 ? (
                <div style={{ marginTop: 20, textAlign: 'left' }}>
                  <div style={{ color: '#fff', fontWeight: 800, marginBottom: 10 }}>
                    {labels.nearbyCorridors}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {nearbyCorridors.map(({ ride, priceLabel }) => (
                      <button
                        key={ride.id}
                        onClick={() => onOpenRide(ride)}
                        style={{
                          textAlign: 'left',
                          borderRadius: r(14),
                          border: `1px solid ${DS.border}`,
                          background: DS.card2,
                          padding: '12px 14px',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>
                              {ride.from} to {ride.to}
                            </div>
                            <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                              {ride.time} | {ride.driver.name}
                            </div>
                          </div>
                          <span style={{ ...pill(ride.seatsAvailable > 0 ? DS.cyan : DS.gold) }}>
                            {priceLabel}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </motion.div>
          ) : (
            results.map((ride) => (
              <FindRideCard
                key={ride.id}
                ride={ride}
                booked={bookedRideIds.has(ride.id)}
                pending={pendingRideIds.has(ride.id)}
                signal={resolveSignalForRide(ride)}
                onOpen={() => onOpenRide(ride)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

type RideMemoryPanelsProps = {
  labels: FindRideLabels;
  recurringSuggestions: RecurringRouteSuggestion[];
  savedReminders: RouteReminder[];
  savedReminderIds: Set<string>;
  recentSearches: string[];
  bookedRideSummaries: string[];
  onFocusCorridor: (from: string, to: string) => void;
  onSaveReminder: (corridorId: string) => void;
  formatRouteReminderSchedule: (reminder: RouteReminder) => string;
};

function RideMemoryPanels({
  labels,
  recurringSuggestions,
  savedReminders,
  savedReminderIds,
  recentSearches,
  bookedRideSummaries,
  onFocusCorridor,
  onSaveReminder,
  formatRouteReminderSchedule,
}: RideMemoryPanelsProps) {
  const historyCards = [
    {
      title: labels.recentSearches,
      items: recentSearches,
      empty: 'Search a route to save it here.',
    },
    {
      title: labels.bookedTrips,
      items: bookedRideSummaries,
      empty: labels.noTripsYet,
    },
  ];

  return (
    <div
      className="sp-2col"
      style={{
        display: 'grid',
        gridTemplateColumns: '1.15fr 0.85fr',
        gap: 14,
        marginTop: 18,
      }}
    >
      <div
        style={{
          background: DS.card,
          borderRadius: r(18),
          padding: '18px 18px 16px',
          border: `1px solid ${DS.border}`,
        }}
      >
        <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>
          Recurring routes
        </div>
        <div style={{ color: DS.muted, fontSize: '0.78rem', lineHeight: 1.6, marginBottom: 12 }}>
          Save routes you use often.
        </div>

        {recurringSuggestions.length > 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {recurringSuggestions.slice(0, 3).map((suggestion) => {
              const alreadySaved = savedReminderIds.has(suggestion.corridorId);
              return (
                <div
                  key={suggestion.corridorId}
                  style={{
                    borderRadius: r(14),
                    border: `1px solid ${DS.border}`,
                    background: DS.card2,
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>
                        {suggestion.label}
                      </div>
                      <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                        {suggestion.confidenceScore}/100 confidence | {suggestion.priceQuote.finalPriceJod} JOD now
                      </div>
                    </div>
                    <span style={pill(DS.green)}>{suggestion.recommendedFrequency}</span>
                  </div>

                  <div style={{ color: DS.sub, fontSize: '0.76rem', lineHeight: 1.55, marginTop: 8 }}>
                    {suggestion.reason}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    <button
                      onClick={() => onFocusCorridor(suggestion.from, suggestion.to)}
                      style={{
                        height: 38,
                        padding: '0 14px',
                        borderRadius: '999px',
                        border: `1px solid ${DS.border}`,
                        background: DS.card,
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Open route
                    </button>
                    <button
                      onClick={() => onSaveReminder(suggestion.corridorId)}
                      style={{
                        height: 38,
                        padding: '0 14px',
                        borderRadius: '999px',
                        border: 'none',
                        background: alreadySaved ? DS.gradG : DS.gradC,
                        color: '#fff',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {alreadySaved ? 'Saved' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: DS.muted, fontSize: '0.8rem', lineHeight: 1.55 }}>
            Search a few more routes to see suggestions here.
          </div>
        )}

        {savedReminders.length > 0 ? (
          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem' }}>
              Saved reminders
            </div>
            {savedReminders.slice(0, 3).map((reminder) => (
              <div
                key={reminder.id}
                style={{
                  borderRadius: r(12),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  padding: '11px 12px',
                }}
              >
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>
                  {reminder.label}
                </div>
                <div style={{ color: DS.muted, fontSize: '0.73rem', marginTop: 4 }}>
                  {formatRouteReminderSchedule(reminder)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {historyCards.map((card) => (
          <div
            key={card.title}
            style={{
              background: DS.card,
              borderRadius: r(18),
              padding: '18px 18px 16px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>{card.title}</div>
            {card.items.length > 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {card.items.map((item) => (
                  <div
                    key={item}
                    style={{
                      borderRadius: r(12),
                      border: `1px solid ${DS.border}`,
                      background: DS.card2,
                      padding: '11px 12px',
                      color: '#fff',
                      fontSize: '0.78rem',
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: DS.muted, fontSize: '0.8rem' }}>{card.empty}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FindRideRideTab({
  labels,
  staticCopy,
  from,
  to,
  date,
  loading,
  searched,
  sort,
  searchError,
  bookingMessage,
  retentionMessage,
  waitlistMessage,
  routeReadinessLabel,
  corridorRidesCount,
  demandStatsActive,
  selectedSignal,
  selectedPriceQuote,
  corridorPlan,
  featuredSignals,
  results,
  bookedRideIds,
  pendingRideIds,
  nearbyCorridors,
  recurringSuggestions,
  savedReminders,
  savedReminderIds,
  recentSearches,
  bookedRideSummaries,
  searchFromCoord,
  searchToCoord,
  onSetFrom,
  onSetTo,
  onSetDate,
  onSearch,
  onSetSort,
  onOpenRide,
  onFocusCorridor,
  onSaveReminder,
  onClearDateFilter,
  onOpenBusFallback,
  onDemandCapture,
  formatRouteReminderSchedule,
  resolveSignalForRide,
}: FindRideRideTabProps) {
  return (
    <>
      <RideSearchPanel
        labels={labels}
        from={from}
        to={to}
        date={date}
        loading={loading}
        routeReadinessLabel={routeReadinessLabel}
        corridorRidesCount={corridorRidesCount}
        demandStatsActive={demandStatsActive}
        selectedSignal={selectedSignal}
        selectedPriceQuote={selectedPriceQuote}
        corridorPlan={corridorPlan}
        searchFromCoord={searchFromCoord}
        searchToCoord={searchToCoord}
        searchError={searchError}
        bookingMessage={bookingMessage}
        retentionMessage={retentionMessage}
        onSetFrom={onSetFrom}
        onSetTo={onSetTo}
        onSetDate={onSetDate}
        onSearch={onSearch}
      />

      <RideBriefPanels
        corridorPlan={corridorPlan}
        selectedSignal={selectedSignal}
        featuredSignals={featuredSignals}
        onFocusCorridor={onFocusCorridor}
      />

      <RideResultsSection
        labels={labels}
        staticCopy={staticCopy}
        from={from}
        to={to}
        loading={loading}
        searched={searched}
        sort={sort}
        results={results}
        bookedRideIds={bookedRideIds}
        pendingRideIds={pendingRideIds}
        selectedSignal={selectedSignal}
        waitlistMessage={waitlistMessage}
        demandStatsActive={demandStatsActive}
        nearbyCorridors={nearbyCorridors}
        onSetSort={onSetSort}
        onOpenRide={onOpenRide}
        onClearDateFilter={onClearDateFilter}
        onOpenBusFallback={onOpenBusFallback}
        onDemandCapture={onDemandCapture}
        resolveSignalForRide={resolveSignalForRide}
      />

      <RideMemoryPanels
        labels={labels}
        recurringSuggestions={recurringSuggestions}
        savedReminders={savedReminders}
        savedReminderIds={savedReminderIds}
        recentSearches={recentSearches}
        bookedRideSummaries={bookedRideSummaries}
        onFocusCorridor={onFocusCorridor}
        onSaveReminder={onSaveReminder}
        formatRouteReminderSchedule={formatRouteReminderSchedule}
      />
    </>
  );
}

