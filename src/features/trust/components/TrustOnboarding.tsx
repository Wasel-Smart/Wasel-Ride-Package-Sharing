import { C, F, R, SPACE, TYPE } from '../../../utils/wasel-ds';
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
        border: `1px solid ${C.cyan}33`,
        background: `linear-gradient(180deg, ${C.cyan}08, ${C.card})`,
        boxShadow: `0 0 0 1px ${C.cyan}12, 0 8px 24px rgba(0,0,0,0.25)`,
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
            color: C.cyan,
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
            color: C.text,
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
            color: C.textMuted,
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
