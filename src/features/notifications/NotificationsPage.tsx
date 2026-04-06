/**
 * NotificationsPage - Full notification center
 * Shows all user notifications with real-time updates
 */

import { NotificationCenter } from '../../components/NotificationCenter';
import { useLanguage } from '../../contexts/LanguageContext';
import { WaselColors } from '../../styles/wasel-design-system';

const C = WaselColors;

export function NotificationsPage() {
  const { dir } = useLanguage();

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{
        background: `radial-gradient(circle at top left, rgba(22,199,242,0.12), transparent 28%), ${C.bg}`,
      }}
      dir={dir}
    >
      <div className="mx-auto max-w-5xl">
        <NotificationCenter />
      </div>
    </div>
  );
}

