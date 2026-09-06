import type { ReactNode } from 'react';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';

export function TrustActionRow({
  primary,
  secondary,
  refresh,
}: {
  primary?: ReactNode;
  secondary?: ReactNode;
  refresh?: () => void;
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
        <WaselButton variant="outline" onClick={refresh}>
          Refresh
        </WaselButton>
      ) : null}
    </div>
  );
}
