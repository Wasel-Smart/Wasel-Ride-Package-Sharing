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
import { tx } from '../../locales/tx';

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
        <Button variant="destructive">{tx('settings.danger.deleteAccount')}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {tx('accountDeletionDialog.delete_account_permanently')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tx(
              'accountDeletionDialog.this_action_cannot_be_undone_this_will_permanently_delete_your_account_and_remove_all_your_data_from_our_servers',
            )}
            <br />
            <br />
            {tx(
              'accountDeletionDialog.you_will_receive_a_confirmation_email_and_have_30_days_to_cancel_this_request',
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletionRequest.isPending}>
            {tx('common.cancel')}
          </AlertDialogCancel>
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
