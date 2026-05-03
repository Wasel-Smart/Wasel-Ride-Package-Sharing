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
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import type { Notification } from '../../hooks/useNotifications';
import {
  getNotificationCategory,
  type NotificationFilter,
} from '../../features/notifications/notificationCenterModel';
import { CATEGORY_ACCENT, CATEGORY_ICON, formatRelativeTimestamp } from './notificationHelpers';

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
  const accent = CATEGORY_ACCENT[category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.18 }}
    >
      <Card className={`overflow-hidden border-white/10 bg-gradient-to-br ${accent}`}>
        <CardContent className="p-0">
          <div className="grid gap-4 p-5 md:grid-cols-[auto,1fr,auto]">
            {/* Icon */}
            <div className="flex items-start">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <Icon className="size-5" />
              </div>
            </div>

            {/* Body */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-start gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{notification.title}</h3>

                    {!notification.read && (
                      <span className="inline-flex size-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
                    )}

                    {notification.priority === 'urgent' && (
                      <Badge variant="destructive">{labels.urgentBadge}</Badge>
                    )}

                    {notification.priority === 'high' && (
                      <Badge
                        variant="outline"
                        className="border-amber-400/30 bg-amber-400/10 text-amber-100"
                      >
                        {labels.highBadge}
                      </Badge>
                    )}

                    {notification.source === 'local' && (
                      <Badge
                        variant="outline"
                        className="border-white/15 bg-white/5 text-slate-100"
                      >
                        {labels.localDraft}
                      </Badge>
                    )}
                  </div>

                  <p className="max-w-3xl text-sm leading-6 text-slate-200/90">
                    {notification.message}
                  </p>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <Badge variant="outline" className="border-white/10 bg-black/10 text-slate-200">
                  {filters.find(f => f.value === category)?.label ?? category}
                </Badge>
                <span>{formatRelativeTimestamp(notification.created_at, isRTL)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-start justify-end gap-2">
              {notification.action_url && (
                <Button size="sm" onClick={() => onOpen(notification)}>
                  {labels.view}
                </Button>
              )}

              {!notification.read && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMarkRead(notification.id)}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  <Check className="size-4" />
                  {labels.markRead}
                </Button>
              )}

              {filter !== 'archived' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onArchive(notification.id)}
                  className="text-slate-200 hover:bg-black/10 hover:text-white"
                >
                  <Trash2 className="size-4" />
                  {labels.archive}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
