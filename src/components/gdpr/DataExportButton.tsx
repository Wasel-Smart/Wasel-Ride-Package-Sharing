import { WaselButton } from '@/components/wasel-ui/WaselButton';
import { useDataExportRequest } from '@/hooks/usePrivacyRequests';

export function DataExportButton() {
  const exportRequest = useDataExportRequest();

  return (
    <WaselButton
      onClick={() => exportRequest.mutate()}
      disabled={exportRequest.isPending}
      variant="outline"
    >
      {exportRequest.isPending ? 'Requesting...' : 'Export My Data'}
    </WaselButton>
  );
}
