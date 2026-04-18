/**
 * NotificationsPage - Full notification center
 * Shows all user notifications with real-time updates
 */

import { NotificationCenter } from '../../components/NotificationCenter';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { PageShell } from '../shared/pageShared';

export function NotificationsPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl">
        <ErrorBoundary>
          <NotificationCenter />
        </ErrorBoundary>
      </div>
    </PageShell>
  );
}

