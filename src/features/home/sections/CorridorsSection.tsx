import { useId } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Route } from 'lucide-react';
import { C } from '../HomePageShared';
import type { CorridorCard } from './types';
import { tx } from '../../../locales/tx';
import { toAppHref } from '../../../hooks/useIframeSafeNavigate';
import { handleSpaLinkClick } from '../../../utils/linkNavigation';

interface CorridorsSectionProps {
  corridorCards: CorridorCard[];
  onNavigate: ( path: string, source?: string ) => void;
}

// Stylised Jordan postcards — pure SVG so the page stays
// image-light while every corridor still gets its own skyline.
interface SceneryVariant {
  skyTop: string;
  skyBottom: string;
  sun: string;
  far: string;
  mid: string;
  near: string;
}

const SCENERY_VARIANTS = {
  dawn: {
    skyTop: '#0a1f3a', skyBottom: '#132b4d',
    sun: '#8deBff', far: '#1e3a5f', mid: '#16294a', near: '#0e1d38',
  },
  sea: {
    skyTop: '#062b3a', skyBottom: '#0a3a4d',
    sun: '#ffd08a', far: '#0e4a5a', mid: '#0a3a4a', near: '#072e3c',
  },
  rose: {
    skyTop: '#3a1626', skyBottom: '#4d1f2e',
    sun: '#ffbe5c', far: '#5a2436', mid: '#451b2a', near: '#331422',
  },
  hills: {
    skyTop: '#122e1a', skyBottom: '#1a3d24',
    sun: '#d8ffb0', far: '#1e4d2a', mid: '#173a21', near: '#102a18',
  },
  deepsea: {
    skyTop: '#081d3a', skyBottom: '#0d2a52',
    sun: '#b0e0ff', far: '#12345e', mid: '#0d2a4a', near: '#091f38',
  },
  desert: {
    skyTop: '#3a2410', skyBottom: '#4d2f14',
    sun: '#ffd08a', far: '#5a3a1a', mid: '#452c14', near: '#33200e',
  },
  dusk: {
    skyTop: '#1e1a3a', skyBottom: '#2a2452',
    sun: '#c8b0ff', far: '#2e2a5a', mid: '#241f48', near: '#1a1638',
  },
} as const satisfies Record<string, SceneryVariant>;

// Match on both scripts so live (English) and fallback
// (Arabic) corridor titles resolve to the same skyline.
const SCENERY_MATCHERS: Array<[ RegExp, keyof typeof SCENERY_VARIANTS ]> = [
  [ /wadi rum|وادي رم/i, 'desert' ],
  [ /petra|البتراء/i, 'rose' ],
  [ /dead sea|البحر الميت/i, 'deepsea' ],
  [ /aqaba|العقبة/i, 'sea' ],
  [ /irbid|إربد|jerash|جرش|ajloun|عجلون/i, 'hills' ],
  [ /zarqa|الزرقاء/i, 'dusk' ],
  [ /amman|عمّان|عمان/i, 'dawn' ],
];

function sceneryFor( title: string ): SceneryVariant {
  for ( const [ pattern, variant ] of SCENERY_MATCHERS ) {
    if ( pattern.test( title ) ) {
      return SCENERY_VARIANTS[ variant ];
    }
  }
  return SCENERY_VARIANTS.dawn;
}

function DestinationScenery( { title }: { title: string } ) {
  const rawId = useId();
  const uid = rawId.replace( /[^a-zA-Z0-9]/g, '' );
  const v = sceneryFor( title );
  const skyId = `wasel-scene-sky-${ uid }`;

  return (
    <span className="wasel-scenery" aria-hidden="true">
      <svg viewBox="0 0 400 118" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id={ skyId } x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ v.skyTop } />
            <stop offset="100%" stopColor={ v.skyBottom } />
          </linearGradient>
        </defs>
        <rect width="400" height="118" fill={ `url(#${ skyId })` } />
        <circle
          className="wasel-scenery-sun"
          cx="316"
          cy="30"
          r="15"
          fill={ v.sun }
          opacity="0.9"
        />
        <path d="M0 78 L70 44 L140 74 L220 38 L300 70 L400 40 L400 118 L0 118 Z" fill={ v.far } opacity="0.75" />
        <path d="M0 92 L90 62 L180 88 L270 58 L350 86 L400 66 L400 118 L0 118 Z" fill={ v.mid } opacity="0.85" />
        <path d="M0 106 L110 84 L210 102 L310 80 L400 98 L400 118 L0 118 Z" fill={ v.near } />
        <path
          d="M-10 118 C 90 96, 180 112, 260 100 S 380 92, 410 104"
          fill="none"
          stroke={ v.sun }
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    </span>
  );
}

export function CorridorsSection({ corridorCards, onNavigate }: CorridorsSectionProps) {
  return (
    <motion.section initial={false} className="wasel-home-section">
      <div className="wasel-home-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="wasel-home-section-icon">
            <Route size={16} />
          </div>
          <h2 className="wasel-home-section-title">
            {tx('homeSections.corridorsReadyNow')}
          </h2>
        </div>
        <a
          href={toAppHref('/find-ride')}
          className="wasel-home-section-action"
          onClick={event => handleSpaLinkClick(event, () => { void onNavigate('/app/find-ride', 'corridors_browse_all'); })}
        >
          {tx('homeSections.browseRides')}
          <ChevronRight size={12} color={'var(--primary)'} />
        </a>
      </div>
      <div className="wasel-home-corridors">
        {corridorCards.map(card => (
          <a
            key={card.key}
            href={toAppHref(card.path)}
            onClick={event => handleSpaLinkClick(event, () => { void onNavigate(card.path, 'corridor_card'); })}
            className="wasel-home-corridor"
            style={{
              padding: 0,
              overflow: 'hidden',
              background: card.featured
                ? `linear-gradient(180deg, ${C.cyanDim}, ${'var(--card)'})`
                : undefined,
              border: `1px solid ${card.featured ? 'var(--border)' : 'var(--border)'}`,
            }}
          >
            <DestinationScenery title={card.title} />
            <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div className="wasel-home-corridor-badge" style={{ color: card.accent, borderColor: `${card.accent}24` }}>
                  <span className="wasel-home-corridor-badge-dot" style={{ background: card.accent, color: card.accent }} />
                  {card.featured ? tx('homeSections.bestNow') : card.meta}
                </div>
              </div>
              <div className="wasel-home-corridor-title">{card.title}</div>
              <div className="wasel-home-corridor-detail">{card.detail}</div>
              {card.insight ? (
                <div className="wasel-home-corridor-insight">{card.insight}</div>
              ) : null}
              <div className="wasel-home-corridor-cta" style={{ color: card.accent }}>
                {tx('homeSections.openCorridor')}
                <ArrowRight size={13} />
              </div>
            </div>
          </a>
        ))}
      </div>
    </motion.section>
  );
}
