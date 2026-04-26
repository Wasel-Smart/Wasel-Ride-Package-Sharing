import { WaselLogo } from '../../../components/wasel-ds/WaselLogo';
import { WaselContactActionRow } from '../../../components/system/WaselPresence';
import { useTheme } from '../../../contexts/ThemeContext';
import { LANDING_COLORS, lc } from './landingTypes';
import { PREMIUM_BUTTON } from './landingSectionShared';

type LandingHeaderProps = {
  ar: boolean;
  signinPath?: string;
  signupPath?: string;
  showAuthActions?: boolean;
  onNavigate?: (path: string) => void;
};

export function LandingHeader({
  ar,
  signinPath,
  signupPath,
  showAuthActions = false,
  onNavigate,
}: LandingHeaderProps) {
  const { resolvedTheme } = useTheme();
  const canShowAuthActions = Boolean(showAuthActions && signinPath && signupPath && onNavigate);
  const logoTheme = resolvedTheme === 'light' ? 'dark' : 'light';

  return (
    <header
      className="landing-header-row"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 32,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <WaselLogo size={36} theme={logoTheme} variant="full" subtitle="Ride and package marketplace" />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 999,
            background: 'var(--wasel-app-surface)',
            border: '1px solid var(--wasel-border)',
            color: 'var(--wasel-copy-muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
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
          {lc(ar ? 'شبكة الأردن الحية' : 'Rides and packages live')}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {canShowAuthActions ? (
          <>
            <button
              aria-label={lc(ar ? 'تسجيل الدخول من شريط الرأس' : 'Sign in from header')}
              type="button"
              onClick={() => {
                if (signinPath) {
                  onNavigate?.(signinPath);
                }
              }}
              style={PREMIUM_BUTTON.secondary}
            >
              {lc(ar ? 'تسجيل الدخول' : 'Sign in')}
            </button>
            <button
              aria-label={lc(ar ? 'إنشاء حساب من شريط الرأس' : 'Sign up from header')}
              type="button"
              onClick={() => {
                if (signupPath) {
                  onNavigate?.(signupPath);
                }
              }}
              style={PREMIUM_BUTTON.primary}
            >
              {lc(ar ? 'إنشاء حساب' : 'Sign up')}
            </button>
          </>
        ) : null}
        <WaselContactActionRow ar={ar} />
      </div>
    </header>
  );
}
