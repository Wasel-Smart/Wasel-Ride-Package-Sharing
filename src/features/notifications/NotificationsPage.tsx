/**
 * NotificationsPage - Full notification center
 * Shows all user notifications with real-time updates
 */

import { NotificationCenter } from '../../components/NotificationCenter';
import { PageShell } from '../shared/pageShared';

export function NotificationsPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl">
        <NotificationCenter />
      </div>
    </PageShell>
  );
}

