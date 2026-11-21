import { NotificationCenter } from '../../components/NotificationCenter';
import { useNotifications } from '../../hooks/useNotifications';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { Bell } from 'lucide-react';
import { C,  R, SPACE, TYPE  } from '../../utils/wasel-ds';

export function NotificationsPage() {
  const { language: _language, dir, t } = useLanguage();
  const { unreadCount } = useNotifications();

  return (
    <PageShell maxWidth={1120} dir={dir}>
      <div style={{ paddingInline: SPACE[4], paddingBlock: SPACE[6] }}>
        {/* ── Page title ── */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: SPACE[3], marginBottom: SPACE[6] }}
        >
          <Bell
            size={22}
            color={unreadCount > 0 ? 'var(--primary)' : 'var(--muted-foreground)'}
            style={{
              filter: unreadCount > 0 ? `drop-shadow(0 0 6px ${'var(--primary)'})` : 'none',
              transition: 'filter 300ms',
            }}
          />
          <h1
            style={{
              margin: 0,
              color: 'var(--foreground)',
              fontSize: TYPE.size['2xl'],
              fontWeight: TYPE.weight.bold,
            }}
          >
            {t('notifications.title')}
          </h1>
          {unreadCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 10px',
                borderRadius: R.full,
                background: C.cyanDim,
                border: `1px solid ${'var(--border)'}`,
                color: 'var(--primary)',
                fontSize: TYPE.size.xs,
                fontWeight: TYPE.weight.bold,
                animation: 'scale-in 200ms ease',
              }}
            >
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

