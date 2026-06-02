import { Button } from '@/components/ui/button';
import { useDataExportRequest } from '@/hooks/usePrivacyRequests';

export function DataExportButton() {
  const exportRequest = useDataExportRequest();

  return (
    <Button
      onClick={() => exportRequest.mutate()}
      disabled={exportRequest.isPending}
      variant="outline"
    >
      {exportRequest.isPending ? 'Requesting...' : 'Export My Data'}
    </Button>
  );
}
