import { ArrowRight } from 'lucide-react';
import { DeferredLandingMap } from '../../../components/layout/DeferredLandingMap';
import { LANDING_DISPLAY } from '../../../styles/shared-ui';
import { LANDING_COLORS, lc } from './landingTypes';
import { PREMIUM_BUTTON } from './landingSectionShared';

type LandingMapSectionProps = {
  ar: boolean;
  onNavigate?: (path: string) => void;
  mobilityOsPath?: string;
  findRidePath?: string;
  packagesPath?: string;
};

export function LandingMapSection({
  ar,
  onNavigate,
  mobilityOsPath,
  findRidePath,
  packagesPath,
}: LandingMapSectionProps) {
  const educationCards = [
    {
      title: ar ? 'تدفق الرحلة' : 'Ride flow',
      detail: ar ? 'حيث تتحرك الرحلات.' : 'Where rides are moving.',
      accent: LANDING_COLORS.cyan,
    },
    {
      title: ar ? 'تدفق الحزمة' : 'Package flow',
      detail: ar ? 'حيث تتحرك الحزم.' : 'Where packages are moving.',
      accent: LANDING_COLORS.gold,
    },
    {
      title: ar ? 'تحديثات التتبع' : 'Tracking updates',
      detail: ar ? 'تعرض حالة الطلب الحالية.' : 'Shows the current trip or package status.',
      accent: LANDING_COLORS.green,
    },
  ] as const;

  return (
    <section aria-labelledby="ride-corridor-map-title" style={{ display: 'grid', gap: 20 }}>
      <div
        className="landing-map-shell wasel-lift-card"
        style={{
          position: 'relative',
          padding: 24,
          borderRadius: 28,
          background: 'var(--service-background)',
          boxShadow: 'var(--wasel-shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <div style={{ minWidth: 0, flex: 1, maxWidth: 560 }}>
            <div
              style={{
                color: 'var(--wasel-cyan)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                fontWeight: 800,
                marginBottom: 6,
              }}
            >
              {lc(ar ? 'خريطة مباشرة' : 'Live Map')}
            </div>
            <h2
              id="ride-corridor-map-title"
              style={{
                margin: 0,
                fontFamily: LANDING_DISPLAY,
                fontSize: '1.4rem',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: LANDING_COLORS.text,
              }}
            >
              {lc(ar ? 'الممرات المشتركة للرحلات والطرود.' : 'Shared corridors for rides and packages.')}
            </h2>
            <p
              style={{
                margin: '10px 0 0',
                color: LANDING_COLORS.soft,
                fontSize: '0.95rem',
                lineHeight: 1.6,
              }}
            >
              {lc(
                ar
                  ? 'الرحلات والحزم تشترك في نفس الممرات.'
                  : 'Rides and packages share the same corridors.',
              )}
            </p>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 14,
              background: 'var(--wasel-app-surface)',
              color: LANDING_COLORS.soft,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <span
              className="landing-live-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: LANDING_COLORS.green,
                boxShadow: `0 0 8px ${LANDING_COLORS.green}`,
              }}
            />
            {lc(ar ? 'جوال + سطح مكتب' : 'Mobile + desktop')}
          </div>
        </div>

        <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden' }}>
          <DeferredLandingMap ar={ar} />
        </div>

        <div
          className="landing-map-education-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginTop: 20,
          }}
        >
          {educationCards.map(card => (
            <div
              key={card.title}
              className="wasel-lift-card"
              style={{
                padding: '18px 22px',
                borderRadius: 20,
                background: 'var(--wasel-panel-muted)',
                border: `1px solid ${card.accent}22`,
                display: 'grid',
                gap: 10,
                transition: 'transform 180ms ease, box-shadow 180ms ease',
              }}
            >
              <div
                style={{
                  color: card.accent,
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                {card.title}
              </div>
              <div style={{ color: LANDING_COLORS.soft, fontSize: '0.88rem', lineHeight: 1.55 }}>
                {card.detail}
              </div>
            </div>
          ))}
        </div>

        {onNavigate && (mobilityOsPath || findRidePath || packagesPath) ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--wasel-border)',
            }}
          >
            <div
              style={{
                color: LANDING_COLORS.soft,
                fontSize: '0.88rem',
                lineHeight: 1.6,
                maxWidth: 400,
              }}
            >
              {lc(ar ? 'ابدأ هنا، ثم افتح التدفق الصحيح.' : 'Start here, then open the right flow.')}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {mobilityOsPath ? (
                <button
                  type="button"
                  onClick={() => onNavigate(mobilityOsPath)}
                  style={{
                    ...PREMIUM_BUTTON.primary,
                    minHeight: 46,
                    padding: '0 20px',
                    fontSize: '0.88rem',
                  }}
                >
                  {lc(ar ? 'افتح خريطة الرحلات' : 'Open ride map')}
                  <ArrowRight size={14} style={{ marginLeft: 8 }} />
                </button>
              ) : null}
              {findRidePath ? (
                <button
                  type="button"
                  onClick={() => onNavigate(findRidePath)}
                  style={{
                    ...PREMIUM_BUTTON.secondary,
                    minHeight: 46,
                    padding: '0 20px',
                    fontSize: '0.88rem',
                  }}
                >
                  {lc(ar ? 'الرحلات' : 'Rides')}
                </button>
              ) : null}
              {packagesPath ? (
                <button
                  type="button"
                  onClick={() => onNavigate(packagesPath)}
                  style={{
                    ...PREMIUM_BUTTON.secondary,
                    minHeight: 46,
                    padding: '0 20px',
                    fontSize: '0.88rem',
                  }}
                >
                  {lc(ar ? 'الحزم' : 'Packages')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
