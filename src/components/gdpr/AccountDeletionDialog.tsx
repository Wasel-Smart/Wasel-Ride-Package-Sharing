import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  completeAccountDeletionSignOut,
  useAccountDeletionRequest,
} from '@/hooks/usePrivacyRequests';

export function AccountDeletionDialog() {
  const [open, setOpen] = useState(false);
  const deletionRequest = useAccountDeletionRequest({
    onRequested: () => {
      setOpen(false);
      setTimeout(() => {
        void completeAccountDeletionSignOut();
      }, 2000);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            <br /><br />
            You will receive a confirmation email and have 30 days to cancel this request.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletionRequest.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deletionRequest.mutate()}
            disabled={deletionRequest.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deletionRequest.isPending ? 'Processing...' : 'Yes, Delete My Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
