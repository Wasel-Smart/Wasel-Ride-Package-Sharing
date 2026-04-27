import { ArrowRight, type LucideIcon } from 'lucide-react';
import { WaselMark } from '../../../components/wasel-ds/WaselLogo';
import { LANDING_DISPLAY } from '../../../styles/shared-ui';
import { GRAD_SIGNAL } from '../../../utils/wasel-ds';
import { LANDING_COLORS, landingPanel, lc } from './landingTypes';
import { PREMIUM_BUTTON } from './landingSectionShared';

type LandingActionCard = {
  title: string;
  detail: string;
  path: string;
  icon: LucideIcon;
  color: string;
};

type LandingHeroSectionProps = {
  ar: boolean;
  emailAuthPath: string;
  signupAuthPath: string;
  findRidePath: string;
  mobilityOsPath?: string;
  myTripsPath: string;
  supportLine: string;
  businessAddress: string;
  heroBullets: readonly string[];
  primaryActions: readonly LandingActionCard[];
  stats?: readonly {
    label: string;
    value: string;
  }[];
  ctaLabel?: string;
  authError?: string;
  oauthLoadingProvider?: 'google' | 'facebook' | null;
  showQuickAuth?: boolean;
  onGoogleAuth?: () => void;
  onFacebookAuth?: () => void;
  onNavigate: (path: string) => void;
};

export function LandingHeroSection({
  ar,
  emailAuthPath,
  signupAuthPath,
  findRidePath,
  mobilityOsPath: _mobilityOsPath,
  myTripsPath,
  supportLine,
  businessAddress,
  heroBullets,
  primaryActions,
  stats,
  ctaLabel,
  authError,
  oauthLoadingProvider,
  showQuickAuth = false,
  onGoogleAuth,
  onFacebookAuth,
  onNavigate,
}: LandingHeroSectionProps) {
  const bullets = heroBullets.slice(0, 2);
  const isGoogleLoading = oauthLoadingProvider === 'google';
  const isFacebookLoading = oauthLoadingProvider === 'facebook';
  const heroMetrics = [
    { label: ar ? 'الرحلات' : 'Rides', value: ar ? 'مباشرة' : 'Live' },
    { label: ar ? 'الطرود' : 'Packages', value: ar ? 'مباشرة' : 'Live' },
    { label: ar ? 'التأكيد' : 'Confirmation', value: ar ? 'من الخلفية' : 'Backend' },
  ];
  const serviceCtaLabel = ctaLabel ?? (ar ? 'احجز رحلة' : 'Book a ride');

  return (
    <section aria-labelledby="find-ride-hero-title" style={{ display: 'grid', gap: 24 }}>
      <div
        className="landing-glow-card"
        style={{
          ...landingPanel(28),
          padding: '32px',
          display: 'grid',
          gap: 28,
          alignContent: 'start',
          minHeight: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 16% 16%, color-mix(in srgb, var(--ds-accent) 14%, transparent) 28%, radial-gradient(circle at 84% 24%, color-mix(in srgb, var(--ds-accent-strong) 10%, transparent) 20%)',
            pointerEvents: 'none',
          }}
        />
        <div
          className="landing-hero-shell"
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 0.92fr)',
            gap: 32,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                width: 'fit-content',
                padding: '6px 14px',
                borderRadius: 999,
                background: 'var(--wasel-button-primary-soft)',
                border: '1px solid var(--wasel-button-primary-border)',
                color: 'var(--wasel-cyan)',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {lc(ar ? 'سوق الرحلات والطرود' : 'Ride and package marketplace')}
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              <h1
                id="find-ride-hero-title"
                style={{
                  margin: 0,
                  maxWidth: 680,
                  fontFamily: LANDING_DISPLAY,
                  fontSize: 'clamp(2.5rem, 4.8vw, 4.5rem)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.04em',
                  fontWeight: 700,
                }}
              >
                <span style={{ display: 'block', color: LANDING_COLORS.text }}>
                  {lc(ar ? 'تحرك بالخريطة.' : 'Move by map.')}
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 8,
                    background: GRAD_SIGNAL,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {lc(ar ? 'رحلات وحزم، شبكة واحدة.' : 'Rides and packages, one network.')}
                </span>
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: 560,
                  color: LANDING_COLORS.muted,
                  fontSize: '1.05rem',
                  lineHeight: 1.7,
                }}
              >
                {lc(
                  ar
                    ? 'اختر الممر أولاً، ثم احجز رحلة أو أرسل طرداً.'
                    : 'Choose the corridor first, then book a ride or send a package.',
                )}
              </p>
            </div>

            <div style={{ display: 'grid', gap: 12, maxWidth: 540 }}>
              {bullets.map((bullet, index) => (
                <div
                  key={`hero-bullet-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    color: LANDING_COLORS.soft,
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    className="landing-live-dot"
                    style={{
                      width: 6,
                      height: 6,
                      marginTop: 6,
                      borderRadius: '50%',
                      background: LANDING_COLORS.cyan,
                      boxShadow: `0 0 10px ${LANDING_COLORS.cyan}`,
                      flexShrink: 0,
                    }}
                  />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <button
                aria-label={lc(ar ? 'احجز رحلة' : 'Book a ride')}
                type="button"
                onClick={() => onNavigate(findRidePath)}
                style={PREMIUM_BUTTON.primary}
              >
                {serviceCtaLabel}
                <ArrowRight size={16} style={{ marginLeft: 8 }} />
              </button>
              <button
                aria-label={lc(ar ? 'ابحث عن رحلات' : 'Find rides')}
                type="button"
                onClick={() => onNavigate(findRidePath)}
                style={PREMIUM_BUTTON.secondary}
              >
                {lc(ar ? 'ابحث عن رحلات' : 'Find rides')}
              </button>
            </div>

            <div
              className="landing-hero-service-stats"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                marginTop: 8,
              }}
            >
              {(stats ?? heroMetrics).slice(0, 3).map(metric => (
                <div
                  key={`${metric.label}-${metric.value}`}
                  className="landing-glow-card"
                  style={{
                    padding: '16px 20px',
                    borderRadius: 18,
                    background: 'var(--wasel-panel-muted)',
                    border: '1px solid var(--wasel-border)',
                    display: 'grid',
                    gap: 6,
                    alignContent: 'start',
                  }}
                >
                  <span
                    style={{
                      color: LANDING_COLORS.muted,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {metric.label}
                  </span>
                  <span
                    style={{
                      color: LANDING_COLORS.text,
                      fontSize: '1.12rem',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-hero-art-column">
            <div
              className="landing-hero-visual"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
              }}
            >
              <div
                className="landing-hero-glow-field"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: '8% 6% 12%',
                  background:
                    'radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--ds-accent) 20%, transparent) 30%, radial-gradient(circle at 60% 60%, color-mix(in srgb, var(--ds-accent-strong) 16%, transparent) 24%)',
                  filter: 'blur(24px)',
                }}
              />
              <div className="landing-hero-orbit landing-hero-orbit--outer" aria-hidden="true" />
              <div className="landing-hero-orbit landing-hero-orbit--inner" aria-hidden="true" />
              <div
                className="landing-hero-mark-stage"
                style={{
                  position: 'relative',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <div
                  className="landing-hero-mark-glow landing-hero-mark-glow--cyan"
                  aria-hidden="true"
                />
                <div
                  className="landing-hero-mark-glow landing-hero-mark-glow--green"
                  aria-hidden="true"
                />
                <div className="landing-hero-mark">
                  <WaselMark
                    size={280}
                    animated
                    style={{
                      justifyContent: 'center',
                      filter: 'drop-shadow(0 0 32px rgba(169,227,255,0.2))',
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: LANDING_COLORS.cyan,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                <span>{serviceCtaLabel}</span>
                <ArrowRight size={14} />
              </div>

              {authError ? (
                <div
                  role="alert"
                  style={{
                    padding: '14px 18px',
                    borderRadius: 14,
                    border: '1px solid var(--wasel-border)',
                    background: 'var(--wasel-surface-muted)',
                    color: LANDING_COLORS.text,
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    maxWidth: 540,
                  }}
                >
                  {authError}
                </div>
              ) : null}

              {showQuickAuth ? (
                <div style={{ display: 'grid', gap: 12, marginTop: 4, width: '100%' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 12,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={lc(ar ? 'متابعة مع Google' : 'Continue with Google')}
                      onClick={() => onGoogleAuth?.()}
                      disabled={!onGoogleAuth || isGoogleLoading}
                      style={{
                        minHeight: 48,
                        padding: '0 16px',
                        borderRadius: 14,
                        border: '1px solid var(--wasel-border)',
                        background: 'transparent',
                        color: LANDING_COLORS.text,
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: onGoogleAuth && !isGoogleLoading ? 'pointer' : 'not-allowed',
                        opacity: onGoogleAuth ? 1 : 0.6,
                      }}
                    >
                      {lc(
                        isGoogleLoading
                          ? ar
                            ? 'جاري الاتصال...'
                            : 'Connecting...'
                          : 'Google',
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={lc(ar ? 'متابعة مع Facebook' : 'Continue with Facebook')}
                      onClick={() => onFacebookAuth?.()}
                      disabled={!onFacebookAuth || isFacebookLoading}
                      style={{
                        minHeight: 48,
                        padding: '0 16px',
                        borderRadius: 14,
                        border: '1px solid var(--wasel-border)',
                        background: 'transparent',
                        color: LANDING_COLORS.text,
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: onFacebookAuth && !isFacebookLoading ? 'pointer' : 'not-allowed',
                        opacity: onFacebookAuth ? 1 : 0.6,
                      }}
                    >
                      {lc(
                        isFacebookLoading
                          ? ar
                            ? 'جاري الاتصال...'
                            : 'Connecting...'
                          : 'Facebook',
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={lc(ar ? 'متابعة بالبريد الإلكتروني' : 'Continue with email')}
                      onClick={() => onNavigate(emailAuthPath)}
                      style={{
                        minHeight: 48,
                        padding: '0 16px',
                        borderRadius: 14,
                        border: 'none',
                        background: GRAD_SIGNAL,
                        color: 'var(--wasel-button-primary-foreground)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {lc(ar ? 'بريد إلكتروني' : 'Email')}
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      type="button"
                      aria-label={lc(ar ? 'تسجيل الدخول' : 'Sign in')}
                      onClick={() => onNavigate(emailAuthPath)}
                      style={{
                        minHeight: 44,
                        padding: '0 20px',
                        borderRadius: 14,
                        border: '1px solid var(--wasel-border)',
                        background: 'transparent',
                        color: LANDING_COLORS.soft,
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      {lc(ar ? 'تسجيل الدخول' : 'Sign in')}
                    </button>
                    <button
                      type="button"
                      aria-label={lc(ar ? 'إنشاء حساب' : 'Create account')}
                      onClick={() => onNavigate(signupAuthPath)}
                      style={{
                        minHeight: 44,
                        padding: '0 20px',
                        borderRadius: 14,
                        border: 'none',
                        background: GRAD_SIGNAL,
                        color: 'var(--wasel-button-primary-foreground)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      {lc(ar ? 'إنشاء حساب' : 'Create account')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className="landing-action-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {primaryActions.slice(0, 3).map(card => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                aria-label={card.title}
                type="button"
                onClick={() => onNavigate(card.path)}
                className="wasel-lift-card"
                style={{
                  display: 'grid',
                  gap: 12,
                  alignContent: 'start',
                  minHeight: 120,
                  padding: '20px 24px',
                  borderRadius: 20,
                  background: 'var(--wasel-panel-muted)',
                  border: `1px solid ${card.color}28`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition:
                    'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: `${card.color}14`,
                    border: `1px solid ${card.color}32`,
                  }}
                >
                  <Icon size={20} color={card.color} />
                </div>
                <div
                  style={{
                    color: LANDING_COLORS.text,
                    fontWeight: 700,
                    fontSize: '0.98rem',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {card.title}
                </div>
                <div style={{ color: LANDING_COLORS.soft, fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {card.detail}
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="landing-footer-meta"
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            color: LANDING_COLORS.soft,
            fontSize: '0.82rem',
            paddingTop: 8,
            borderTop: '1px solid var(--wasel-border)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: LANDING_COLORS.text,
            }}
          >
            <span
              className="landing-live-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: LANDING_COLORS.green,
                boxShadow: `0 0 10px ${LANDING_COLORS.green}`,
              }}
            />
            {lc(ar ? 'تحديث الممر المباشر' : 'Live corridor refresh')}
          </span>
          <span
            style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--wasel-border)' }}
          />
          <button
            type="button"
            onClick={() => onNavigate(myTripsPath)}
            style={{
              background: 'transparent',
              border: 'none',
              color: LANDING_COLORS.soft,
              padding: 0,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            {lc(ar ? 'تابع حجوزاتي' : 'Track bookings')}
          </button>
          <span
            style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--wasel-border)' }}
          />
          <span>{supportLine}</span>
          <span
            style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--wasel-border)' }}
          />
          <span>{businessAddress}</span>
        </div>
      </div>
    </section>
  );
}
