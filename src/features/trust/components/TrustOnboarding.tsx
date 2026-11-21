import { F, R, SPACE, TYPE  } from '../../../utils/wasel-ds';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';

export function TrustOnboarding({
  t,
  onDismiss,
  onStart,
}: {
  t: (key: string) => string;
  onDismiss: () => void;
  onStart: () => void;
}) {
  return (
    <div
      style={{
        position: 'relative',
        padding: SPACE[6],
        borderRadius: R.xxl,
        border: `1px solid ${'var(--primary)'}33`,
        background: `linear-gradient(180deg, ${'var(--primary)'}08, ${'var(--card)'})`,
        boxShadow: `0 0 0 1px ${'var(--primary)'}12, 0 8px 24px rgba(8,29,57,0.25)`,
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: SPACE[4],
          maxWidth: 520,
        }}
      >
        <div
          style={{
            color: 'var(--primary)',
            fontSize: TYPE.size.xs,
            fontWeight: TYPE.weight.bold,
            textTransform: 'uppercase',
            letterSpacing: TYPE.letterSpacing.wider,
            fontFamily: F,
          }}
        >
          {t('trustCenterExpanded.onboardingTitle')}
        </div>
        <div
          style={{
            color: 'var(--foreground)',
            fontSize: TYPE.size.lg,
            fontWeight: TYPE.weight.ultra,
            fontFamily: F,
            lineHeight: 1.3,
          }}
        >
          {t('trustCenterExpanded.onboardingSubtitle')}
        </div>
        <div
          style={{
            color: 'var(--muted-foreground)',
            fontSize: TYPE.size.sm,
            fontFamily: F,
            lineHeight: 1.6,
          }}
        >
          {t('trustCenterExpanded.onboardingEstimatedTime')}
        </div>
        <div style={{ display: 'flex', gap: SPACE[3], flexWrap: 'wrap' }}>
          <WaselButton onClick={() => { void onStart(); }} variant="primary">
            {t('trustCenterExpanded.onboardingStartButton')}
          </WaselButton>
          <WaselButton onClick={() => { void onDismiss(); }} variant="outline">
            {t('trustCenterExpanded.onboardingDismissButton')}
          </WaselButton>
        </div>
      </div>
    </div>
  );
}

