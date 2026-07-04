import { NotificationCenter, useNotifications } from '../../components/NotificationCenter';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { Bell } from 'lucide-react';
import { C, R, SPACE, TYPE } from '../../utils/wasel-ds';

export function NotificationsPage() {
  const { language, dir } = useLanguage();
  const ar = language === 'ar';
  const { unreadCount } = useNotifications();

  return (
    <PageShell maxWidth={1120} dir={dir}>
      <div style={{ paddingInline: SPACE[4], paddingBlock: SPACE[6] }}>

        {/* ── Page title ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3], marginBottom: SPACE[6] }}>
          <Bell
            size={22}
            color={unreadCount > 0 ? C.cyan : C.textMuted}
            style={{
              filter: unreadCount > 0 ? `drop-shadow(0 0 6px ${C.cyan})` : 'none',
              transition: 'filter 300ms',
            }}
          />
          <h1 style={{ margin: 0, color: C.text, fontSize: TYPE.size['2xl'], fontWeight: TYPE.weight.bold }}>
            {ar ? 'التنبيهات' : 'Notifications'}
          </h1>
          {unreadCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 10px', borderRadius: R.full,
              background: C.cyanDim, border: `1px solid ${C.borderHov}`,
              color: C.cyan, fontSize: TYPE.size.xs, fontWeight: TYPE.weight.bold,
              animation: 'scale-in 200ms ease',
            }}>
              {unreadCount}
            </span>
          )}
        </div>

        {/* ── Full notification center ── */}
        <NotificationCenter />

      </div>
    </PageShell>
  );
}

export default NotificationsPage;
