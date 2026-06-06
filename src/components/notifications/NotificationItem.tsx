/**
 * NotificationItem.tsx
 *
 * Single notification card row with icon, content, priority badges,
 * timestamp, and action buttons.
 *
 * Extracted from the 39 KB NotificationCenter monolith so it can be:
 *   - Tested independently
 *   - Reused in other views (e.g. a drawer or push notification overlay)
 *   - Lazy-loaded without pulling in the full center
 */
import { motion } from 'motion/react';
import { Check, Trash2 } from 'lucide-react';
import type { Notification } from '../../hooks/useNotifications';
import {
  getNotificationCategory,
  type NotificationCategory,
  type NotificationFilter,
} from '../../features/notifications/notificationCenterModel';
import { WaselBadge, WaselButton, WaselCard } from '../../design-system';
import { C, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';
import { CATEGORY_ICON, formatRelativeTimestamp } from './notificationHelpers';

type FilterConfig = { value: NotificationFilter; label: string };

type NotificationItemProps = {
  notification: Notification;
  index: number;
  isRTL: boolean;
  filter: NotificationFilter;
  filters: FilterConfig[];
  labels: {
    view: string;
    markRead: string;
    archive: string;
    urgentBadge: string;
    highBadge: string;
    localDraft: string;
  };
  onOpen: (n: Notification) => void;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
};

const categoryTone: Record<
  NotificationCategory,
  { background: string; border: string; icon: string; badge: string }
> = {
  rides: {
    background: `linear-gradient(135deg, ${C.cyanDim}, ${C.elevated})`,
    border: C.cyanDim,
    icon: C.cyan,
    badge: C.cyanDim,
  },
  messages: {
    background: `linear-gradient(135deg, ${C.blueDim}, ${C.elevated})`,
    border: C.blueDim,
    icon: C.blueLight,
    badge: C.blueDim,
  },
  wallet: {
    background: `linear-gradient(135deg, ${C.goldDim}, ${C.elevated})`,
    border: C.goldDim,
    icon: C.gold,
    badge: C.goldDim,
  },
  trust: {
    background: `linear-gradient(135deg, ${C.greenDim}, ${C.elevated})`,
    border: C.greenDim,
    icon: C.green,
    badge: C.greenDim,
  },
  support: {
    background: `linear-gradient(135deg, ${C.errorDim}, ${C.elevated})`,
    border: C.errorDim,
    icon: C.error,
    badge: C.errorDim,
  },
  system: {
    background: `linear-gradient(135deg, ${C.cardSolid}, ${C.elevated})`,
    border: C.border,
    icon: C.textSub,
    badge: C.elevated,
  },
};

export function NotificationItem({
  notification,
  index,
  isRTL,
  filter,
  filters,
  labels,
  onOpen,
  onMarkRead,
  onArchive,
}: NotificationItemProps) {
  const category = getNotificationCategory(notification);
  const Icon = CATEGORY_ICON[category];
  const tone = categoryTone[category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.18 }}
    >
      <WaselCard
        variant="solid"
        padding="0"
        radius={R.xxl}
        hover
        style={{ overflow: 'hidden', background: tone.background, borderColor: tone.border }}
      >
        <div
          style={{
            display: 'grid',
            gap: SPACE[4],
            padding: SPACE[5],
            gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          }}
        >
          {/* Icon */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div
              style={{
                borderRadius: R.xl,
                border: `1px solid ${C.borderFaint}`,
                background: C.overlay,
                padding: SPACE[3],
                boxShadow: SH.sm,
              }}
            >
              <Icon size={20} color={tone.icon} />
            </div>
          </div>

          {/* Body */}
          <div style={{ display: 'grid', gap: SPACE[3], minWidth: 0 }}>
            <div
              style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: SPACE[2] }}
            >
              <div style={{ display: 'grid', gap: SPACE[1], minWidth: 0 }}>
                <div
                  style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACE[2] }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: TYPE.size.base,
                      fontWeight: TYPE.weight.bold,
                      color: C.text,
                    }}
                  >
                    {notification.title}
                  </h3>

                  {!notification.read && (
                    <span
                      aria-hidden="true"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: R.full,
                        background: C.cyan,
                        boxShadow: SH.cyan,
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {notification.priority === 'urgent' && (
                    <WaselBadge variant="hot" label={labels.urgentBadge} />
                  )}

                  {notification.priority === 'high' && (
                    <WaselBadge variant="new" label={labels.highBadge} />
                  )}

                  {notification.source === 'local' && (
                    <WaselBadge variant="custom" label={labels.localDraft} />
                  )}
                </div>

                <p
                  style={{
                    margin: 0,
                    maxWidth: 760,
                    fontSize: TYPE.size.sm,
                    lineHeight: 1.65,
                    color: C.textSub,
                  }}
                >
                  {notification.message}
                </p>
              </div>
            </div>

            {/* Meta row */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: SPACE[2],
                fontSize: TYPE.size.xs,
                color: C.textMuted,
              }}
            >
              <WaselBadge
                variant="custom"
                label={filters.find(f => f.value === category)?.label ?? category}
                style={{ background: tone.badge, color: tone.icon, borderColor: tone.border }}
              />
              <span>{formatRelativeTimestamp(notification.created_at, isRTL)}</span>
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              gap: SPACE[2],
            }}
          >
            {notification.action_url && (
              <WaselButton size="sm" onClick={() => onOpen(notification)}>
                {labels.view}
              </WaselButton>
            )}

            {!notification.read && (
              <WaselButton
                variant="outline"
                size="sm"
                icon={<Check size={16} />}
                onClick={() => onMarkRead(notification.id)}
              >
                {labels.markRead}
              </WaselButton>
            )}

            {filter !== 'archived' && (
              <WaselButton
                variant="ghost"
                size="sm"
                icon={<Trash2 size={16} />}
                onClick={() => onArchive(notification.id)}
              >
                {labels.archive}
              </WaselButton>
            )}
          </div>
        </div>
      </WaselCard>
    </motion.div>
  );
}
