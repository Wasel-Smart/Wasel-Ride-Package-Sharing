import { motion } from 'motion/react';
import { Search } from 'lucide-react';
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
        padding: 24,
        display: 'grid',
        gap: 16,
        opacity: 0.6,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.08)' }}
        />
        <div style={{ flex: 1, display: 'grid', gap: 8 }}>
          <div
            style={{
              height: 16,
              width: '40%',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
            }}
          />
          <div
            style={{
              height: 12,
              width: '25%',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.06)',
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            style={{ height: 72, borderRadius: 16, background: 'rgba(255,255,255,0.05)' }}
          />
        ))}
      </div>
      <div style={{ height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  );
}

function ResultEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <section
      style={{
        ...landingPanel(28),
        padding: '56px clamp(24px, 5vw, 48px)',
        textAlign: 'center',
        display: 'grid',
        gap: 16,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          margin: '0 auto',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.05) 100%)',
          border: '1px solid rgba(6,182,212,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Search size={32} color={LANDING_COLORS.cyan} />
      </div>
      <div
        style={{
          color: '#fff',
          fontFamily: LANDING_DISPLAY,
          fontSize: 'clamp(1.3rem, 2.5vw, 1.7rem)',
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>
      <p
        style={{
          margin: 0,
          color: LANDING_COLORS.muted,
          fontFamily: LANDING_FONT,
          fontSize: '1rem',
          maxWidth: 400,
          margin: '0 auto',
          lineHeight: 1.6,
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
    <section style={{ display: 'grid', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'end',
          gap: 16,
          flexWrap: 'wrap',
          padding: '0 4px',
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <h3
            style={{
              margin: 0,
              color: '#fff',
              fontFamily: LANDING_DISPLAY,
              fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)',
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {copy.sectionTitle}
          </h3>
          <p
            style={{
              margin: 0,
              color: LANDING_COLORS.muted,
              fontFamily: LANDING_FONT,
              fontSize: '0.95rem',
              maxWidth: 480,
              lineHeight: 1.5,
            }}
          >
            {copy.sectionDescription}
          </p>
        </div>
        <div
          style={{
            background: 'rgba(6,182,212,0.12)',
            border: '1px solid rgba(6,182,212,0.25)',
            color: LANDING_COLORS.cyan,
            fontFamily: LANDING_FONT,
            fontSize: '0.85rem',
            fontWeight: 800,
            padding: '8px 16px',
            borderRadius: 99,
            whiteSpace: 'nowrap',
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
