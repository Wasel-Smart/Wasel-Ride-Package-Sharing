import type { ReactNode } from 'react';
import { ArrowRight, Calendar, Car, Clock, MapPin, Package, Trash2 } from 'lucide-react';
import type { ScheduleItem } from './SchedulePage';
import { C, F, R, TYPE } from '@/utils/wasel-ds';

interface ScheduleItemCardProps {
  item: ScheduleItem;
  ar: boolean;
  isCancelling: boolean;
  onToggleCancel: () => void;
  onConfirmCancel: (id: string) => void;
  onCancel: () => void;
  onDismissCancel: () => void;
  t: (key: string) => string;
}

function typeLabel(type: ScheduleItem['item_type'], t: (key: string) => string): string {
  if (type === 'ride') { return t('scheduleExpanded.ride'); }
  if (type === 'package_delivery') { return t('scheduleExpanded.typeDelivery'); }
  return t('scheduleExpanded.typeReturn');
}

function typeColor(type: ScheduleItem['item_type']): string {
  if (type === 'ride') { return C.cyan; }
  if (type === 'package_delivery') { return C.gold; }
  return C.green;
}

const STATUS_LABEL: Record<string, { en: string; ar: string; color: string }> = {
  scheduled: { en: 'Scheduled', ar: 'مجدول', color: C.cyan },
  confirmed: { en: 'Confirmed', ar: 'مؤكد', color: C.green },
  completed: { en: 'Completed', ar: 'مكتمل', color: C.green },
  cancelled: { en: 'Cancelled', ar: 'ملغي', color: C.error },
  missed: { en: 'Missed', ar: 'فائت', color: C.gold },
};

export function ScheduleItemCard ({
  item,
  ar,
  isCancelling,
  onToggleCancel,
  onConfirmCancel,
  onCancel,
  onDismissCancel,
  t,
}: ScheduleItemCardProps) {
  const typeCol = typeColor(item.item_type);
  const statusEntry = STATUS_LABEL[item.status];
  const statusLabel = statusEntry
    ? (ar ? statusEntry.ar : statusEntry.en)
    : item.status;
  const statusColor = statusEntry?.color ?? C.cyan;
  const Icon = item.item_type === 'ride' ? Car : Package;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 16px',
          borderBottom: isCancelling ? 'none' : `1px solid ${C.borderFaint}`,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: `${typeCol}14`,
            border: `1px solid ${typeCol}26`,
            display: 'grid',
            placeItems: 'center',
            color: typeCol,
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                fontWeight: TYPE.weight.bold,
                color: C.text,
                fontFamily: F,
                fontSize: TYPE.size.base,
              }}
            >
              {typeLabel(item.item_type, t)}
            </span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 99,
                background: `${statusColor}14`,
                border: `1px solid ${statusColor}30`,
                color: statusColor,
                fontSize: TYPE.size.xs,
                fontWeight: TYPE.weight.bold,
              }}
            >
              {statusLabel}
            </span>
          </div>
          <div
            style={{
              color: C.textMuted,
              fontSize: TYPE.size.sm,
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <MapPin size={12} />
            {item.pickup_location}
            {item.dropoff_location && (
              <>
                <ArrowRight
                  size={12}
                  style={{ transform: ar ? 'rotate(180deg)' : 'none' }}
                />
                {item.dropoff_location}
              </>
            )}
          </div>
          <div
            style={{
              color: C.textDim,
              fontSize: TYPE.size.xs,
              marginTop: 4,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={10} />
              {new Date(item.scheduled_at).toLocaleDateString()}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} />
              {new Date(item.scheduled_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        <button
          onClick={onToggleCancel}
          aria-label={ar ? 'إلغاء الرحلة' : 'Cancel trip'}
          style={{
            background: 'transparent',
            border: `1px solid ${isCancelling ? C.error : `${C.error}40`}`,
            borderRadius: R.sm,
            color: C.error,
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {isCancelling && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: `${C.error}0a`,
            borderBottom: `1px solid ${C.borderFaint}`,
            gap: 12,
          }}
        >
          <span style={{ color: C.textMuted, fontSize: TYPE.size.sm }}>
            {t('scheduleExpanded.cancelThisScheduledItem')}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onConfirmCancel(item.id)}
              style={{
                padding: '6px 14px',
                borderRadius: R.sm,
                background: C.error,
                border: 'none',
                color: '#fff',
                fontWeight: TYPE.weight.bold,
                fontSize: TYPE.size.xs,
                cursor: 'pointer',
              }}
            >
              {t('scheduleExpanded.yesCancel')}
            </button>
            <button
              onClick={onDismissCancel}
              style={{
                padding: '6px 14px',
                borderRadius: R.sm,
                background: C.elevated,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontWeight: TYPE.weight.bold,
                fontSize: TYPE.size.xs,
                cursor: 'pointer',
              }}
            >
              {t('scheduleExpanded.keep')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
