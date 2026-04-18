import { motion } from 'motion/react';
import { LANDING_COLORS, landingPanel } from '../../features/home/landing/landingTypes';
import { LANDING_DISPLAY, LANDING_FONT } from '../../features/home/landingConstants';
import type { RideBookingRecord } from '../../services/rideLifecycle';
import type { RideResult } from '../../modules/rides/ride.types';
import { RideCard, type RideCardCopy } from './RideCard';

export interface RideResultsCopy {
  idleTitle: string;
  idleDescription: string;
  emptyTitle: string;
  emptyDescription: string;
  sectionTitle: string;
  sectionDescription: string;
  countSuffix: string;
  loadMoreLabel: string;
  card: RideCardCopy;
}

interface RideResultsProps {
  loading: boolean;
  searched: boolean;
  results: RideResult[];
  totalResultsCount: number;
  recommendedRideId?: string;
  requestsByRideId: Record<string, RideBookingRecord>;
  requestingRideId?: string;
  hasMore: boolean;
  copy: RideResultsCopy;
  onRequestRide: (ride: RideResult) => void;
  onLoadMore: () => void;
}

function RideResultSkeleton() {
  return (
    <div
      style={{
        ...landingPanel(28),
        padding: 22,
        display: 'grid',
        gap: 16,
        opacity: 0.72,
      }}
    >
      <div
        style={{
          height: 18,
          width: '34%',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
        }}
      />
      <div
        style={{
          height: 28,
          width: '60%',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
        }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
          gap: 12,
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            style={{ height: 88, borderRadius: 20, background: 'rgba(255,255,255,0.06)' }}
          />
        ))}
      </div>
    </div>
  );
}

function ResultEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <section
      style={{
        ...landingPanel(28),
        padding: '44px clamp(20px, 4vw, 40px)',
        textAlign: 'center',
        display: 'grid',
        gap: 12,
      }}
    >
      <div
        style={{
          color: LANDING_COLORS.cyan,
          fontFamily: LANDING_DISPLAY,
          fontSize: '1.7rem',
          fontWeight: 700,
        }}
      >
        {title}
      </div>
      <p
        style={{
          margin: 0,
          color: LANDING_COLORS.muted,
          fontFamily: LANDING_FONT,
          fontSize: '0.98rem',
        }}
      >
        {description}
      </p>
    </section>
  );
}

export function RideResults({
  loading,
  searched,
  results,
  totalResultsCount,
  recommendedRideId,
  requestsByRideId,
  requestingRideId,
  hasMore,
  copy,
  onRequestRide,
  onLoadMore,
}: RideResultsProps) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <RideResultSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!searched) {
    return <ResultEmptyState title={copy.idleTitle} description={copy.idleDescription} />;
  }

  if (results.length === 0) {
    return <ResultEmptyState title={copy.emptyTitle} description={copy.emptyDescription} />;
  }

  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'end',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <h3
            style={{
              margin: 0,
              color: LANDING_COLORS.text,
              fontFamily: LANDING_DISPLAY,
              fontSize: 'clamp(1.3rem, 2.4vw, 1.8rem)',
            }}
          >
            {copy.sectionTitle}
          </h3>
          <p
            style={{
              margin: 0,
              color: LANDING_COLORS.muted,
              fontFamily: LANDING_FONT,
              fontSize: '0.92rem',
            }}
          >
            {copy.sectionDescription}
          </p>
        </div>
        <div
          style={{
            color: LANDING_COLORS.soft,
            fontFamily: LANDING_FONT,
            fontSize: '0.9rem',
            fontWeight: 700,
          }}
        >
          {totalResultsCount} {copy.countSuffix}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {results.map((ride, index) => (
          <motion.div
            key={ride.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.04 }}
          >
            <RideCard
              ride={ride}
              recommended={ride.id === recommendedRideId}
              booking={requestsByRideId[ride.id] ?? null}
              requesting={requestingRideId === ride.id}
              copy={copy.card}
              onRequest={onRequestRide}
            />
          </motion.div>
        ))}
      </div>

      {hasMore ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onLoadMore}
            style={{
              minHeight: 48,
              padding: '0 20px',
              borderRadius: 18,
              border: `1px solid ${LANDING_COLORS.border}`,
              background: 'rgba(255,255,255,0.05)',
              color: LANDING_COLORS.text,
              fontFamily: LANDING_FONT,
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {copy.loadMoreLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}
