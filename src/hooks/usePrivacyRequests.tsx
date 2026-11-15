import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  requestAccountDeletion,
  requestDataExport,
  signOutAfterAccountDeletion,
} from '@/services/privacyRequests';

export function useDataExportRequest() {
  return useMutation({
    mutationFn: requestDataExport,
    onSuccess: result => {
      toast.success('Your data export is ready', {
        description: (
          <a href={result.downloadUrl} target="_blank" rel="noopener noreferrer" className="underline">
            Download your data (link expires in 10 minutes)
          </a>
        ),
      });
    },
  });
}

export function useAccountDeletionRequest(options?: { onRequested?: () => void }) {
  return useMutation({
    mutationFn: requestAccountDeletion,
    onSuccess: () => {
      toast.success('Account deletion requested', {
        description:
          'Your account will be deleted within 30 days. You will receive a confirmation email.',
      });
      options?.onRequested?.();
    },
  });
}

export async function completeAccountDeletionSignOut(): Promise<void> {
  await signOutAfterAccountDeletion();
  window.location.href = '/';
}
