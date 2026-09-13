import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Route } from 'lucide-react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Navigation, Sparkles } from 'lucide-react';
import { C } from '../HomePageShared';
import type { CorridorCard } from './types';
import { tx } from '../../../locales/tx';
import { useLanguage } from '../../../contexts/LanguageContext';

interface CorridorsSectionProps {
  corridorCards: CorridorCard[];
  onNavigate: ( path: string, source?: string ) => void;
}

export function CorridorsSection ( { corridorCards, onNavigate }: CorridorsSectionProps ) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <motion.section initial={ false } className="wasel-home-section">
      <div className="wasel-home-section-header">
        <div style={ { display: 'flex', alignItems: 'center', gap: 10 } }>
          <div className="wasel-home-section-icon">
            <Route size={ 16 } />
            <div style={ { display: 'flex', alignItems: 'center', gap: 12 } }>
              <div
                className="wasel-home-section-icon"
                style={ {
                  background: 'rgba(0, 229, 255, 0.12)',
                  border: '1px solid rgba(0, 229, 255, 0.25)',
                  color: '#00E5FF',
                  boxShadow: '0 0 16px rgba(0, 229, 255, 0.15)',
                } }
              >
                <Navigation size={ 16 } />
              </div>
              <h2 className="wasel-home-section-title">
                { tx( 'homeSections.corridorsReadyNow' ) }
              </h2>
              <div>
                <div
                  style={ {
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#00E5FF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  } }
                >
                  <Sparkles size={ 11 } />
                  { ar ? 'حركة المسارات اللحظية' : 'Live High-Frequency Corridors' }
                </div>
                <h2 className="wasel-home-section-title" style={ { marginTop: 2 } }>
                  { tx( 'homeSections.corridorsReadyNow' ) }
                </h2>
              </div>
            </div>
            <button type="button" className="wasel-home-section-action" onClick={ () => { void onNavigate( '/app/find-ride', 'corridors_browse_all' ); } }>
              { tx( 'homeSections.browseRides' ) }
              <ChevronRight size={ 12 } color={ C.cyan } />

              <button
                type="button"
                className="wasel-home-section-action"
                onClick={ () => { void onNavigate( '/find-ride', 'corridors_browse_all' ); } }
                style={ {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                } }
              >
                <span>{ tx( 'homeSections.browseRides' ) }</span>
                { ar ? <ChevronLeft size={ 14 } color={ C.cyan } /> : <ChevronRight size={ 14 } color={ C.cyan } /> }
              </button>
          </div>

          <div className="wasel-home-corridors">
            { corridorCards.map( card => (
              <button
                <motion.button
            type="button"
                key={ card.key }
                onClick={ () => { void onNavigate( card.path, 'corridor_card' ); } }
                whileHover={ { y: -3, scale: 1.01 } }
                whileTap={ { scale: 0.99 } }
                transition={ { duration: 0.18, ease: [ 0.16, 1, 0.3, 1 ] } }
                className="wasel-home-corridor"
                style={ {
                  background: card.featured
                    ? `linear-gradient(180deg, ${ C.cyanDim }, ${ C.card })`
                    : undefined,
                  border: `1px solid ${ card.featured ? C.cyanDim : 'rgba(20,127,228,0.08)' }`,
                ? `linear-gradient(180deg, rgba(0, 229, 255, 0.12) 0%, rgba(8, 29, 57, 0.85) 100%)`
                  : 'rgba(8, 29, 57, 0.72)',
                  border: `1px solid ${ card.featured ? 'rgba(0, 229, 255, 0.35)' : 'rgba(20, 127, 228, 0.16)' }`,
            borderTop: `1px solid ${ card.featured ? '#00E5FF' : card.accent }60`,
            }}
          >
            <div
              style={ {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              } }
            >
              <div className="wasel-home-corridor-badge" style={ { color: card.accent, borderColor: `${ card.accent }24` } }>
                <span className="wasel-home-corridor-badge-dot" style={ { background: card.accent, color: card.accent } } />
                { card.featured ? tx( 'homeSections.bestNow' ) : card.meta }
                <div
                  className="wasel-home-corridor-badge"
                  style={ {
                    color: card.accent,
                    borderColor: `${ card.accent }35`,
                    background: `${ card.accent }12`,
                  } }
                >
                  <span
                    className="wasel-home-corridor-badge-dot"
                    style={ { background: card.accent, boxShadow: `0 0 8px ${ card.accent }` } }
                  />
                  { card.featured ? ( ar ? 'الأكثر طلباً اليوم' : 'Highest Demand Today' ) : card.meta }
                </div>
              </div>
              <div className="wasel-home-corridor-title">{ card.title }</div>
              <div className="wasel-home-corridor-detail">{ card.detail }</div>

              <div className="wasel-home-corridor-title" style={ { fontSize: '1.1rem', marginTop: 4 } }>
                { card.title }
              </div>

              <div
                className="wasel-home-corridor-detail"
                style={ {
                  color: '#f8fbff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                } }
              >
                { card.detail }
              </div>

              { card.insight ? (
              <div className="wasel-home-corridor-insight">{card.insight}</div>
              <div
                className="wasel-home-corridor-insight"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: '0.76rem',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {card.insight}
              </div>
              ) : null }
              <div className="wasel-home-corridor-cta" style={ { color: card.accent } }>
                { tx( 'homeSections.openCorridor' ) }
                <ArrowRight size={ 13 } />

                <div
                  className="wasel-home-corridor-cta"
                  style={ {
                    color: card.accent,
                    marginTop: 'auto',
                    paddingTop: 10,
                  } }
                >
                  <span>{ tx( 'homeSections.openCorridor' ) }</span>
                  { ar ? <ArrowLeft size={ 14 } /> : <ArrowRight size={ 14 } /> }
                </div>
              </button>
            </motion.button>
        ))}
          </div>
        </motion.section>
        );
}
