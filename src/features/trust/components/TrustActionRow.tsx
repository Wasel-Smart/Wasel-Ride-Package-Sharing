import type { ReactNode } from 'react';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';

export function TrustActionRow({
  primary,
  secondary,
  refresh,
  refreshLabel = 'Refresh',
}: {
  primary?: ReactNode;
  secondary?: ReactNode;
  refresh?: () => void;
  refreshLabel?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {primary}
      {secondary}
      {refresh ? (
        <WaselButton variant="outline" onClick={() => { void refresh(); }}>
          {refreshLabel}
        </WaselButton>
      ) : null}
    </div>
  );
}
