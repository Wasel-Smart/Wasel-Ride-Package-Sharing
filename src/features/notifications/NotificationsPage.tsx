/**
 * NotificationsPage - Full notification center
 * Shows all user notifications with real-time updates
 */

import { NotificationCenter } from '../../components/NotificationCenter';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';
import { useLanguage } from '../../contexts/LanguageContext';

export function NotificationsPage() {
  const { dir } = useLanguage();

  return (
    <PageShell maxWidth={1120} dir={dir}>
      <div style={{ paddingInline: 16 }}>
        <NotificationCenter />
      </div>
    </PageShell>
  );
}
