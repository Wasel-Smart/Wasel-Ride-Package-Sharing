import { C, F, R, SPACE, TYPE } from '../../../utils/wasel-ds';
import type { ReviewHistoryItem } from '../../../services/trustCenterModel';

function statusStyle(status: ReviewHistoryItem['status']) {
  switch (status) {
    case 'approved':
      return { bg: C.greenDim, color: C.green, border: `${C.green}33` };
    case 'rejected':
      return { bg: 'color-mix(in srgb, var(--destructive) 14%, transparent)', color: 'var(--destructive)', border: `${'var(--destructive)'}33` };
    default:
      return { bg: C.goldDim, color: C.gold, border: `${C.gold}33` };
  }
}

function formatDate(iso: string | null): string {
  if (!iso) {return '—';}
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {return '—';}
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReviewTimeline({ items, t }: { items: ReviewHistoryItem[]; t: (key: string) => string }) {
  if (!items.length) {
    return (
      <div
        style={{
          padding: SPACE[5],
          borderRadius: R.xl,
          border: `1px solid ${'var(--border)'}`,
          background: 'var(--card)',
          textAlign: 'center',
        }}
      >
        <div style={{ color: 'var(--muted-foreground)', fontSize: TYPE.size.sm, fontFamily: F }}>
          {t('trustCenterExpanded.reviewHistoryEmpty')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: SPACE[3] }}>
      {items.map((item) => {
        const style = statusStyle(item.status);

        return (
          <div
            key={item.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: SPACE[4],
              alignItems: 'start',
              padding: SPACE[4],
              borderRadius: R.lg,
              border: `1px solid ${'var(--border)'}`,
              background: 'var(--card)',
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: style.color,
                marginTop: 6,
                boxShadow: `0 0 0 3px ${style.bg}`,
              }}
            />
            <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
              <div
                style={{
                  color: 'var(--foreground)',
                  fontWeight: TYPE.weight.bold,
                  fontSize: TYPE.size.sm,
                  fontFamily: F,
                }}
              >
                {t('trustCenterExpanded.driverDocuments')}
              </div>
              {item.documentReference && (
                <div style={{ color: 'var(--muted-foreground)', fontSize: TYPE.size.xs, fontFamily: F }}>
                  {t('trustCenterExpanded.documentReference')}: {item.documentReference}
                </div>
              )}
              {item.failureReason && (
                <div
                  style={{
                    color: 'var(--destructive)',
                    fontSize: TYPE.size.xs,
                    fontFamily: F,
                    lineHeight: 1.5,
                  }}
                >
                  {item.failureReason}
                </div>
              )}
              <div style={{ color: 'var(--muted-foreground)', fontSize: TYPE.size.xs, fontFamily: F }}>
                {t('trustCenterExpanded.reviewHistorySubmittedOn')}: {formatDate(item.submittedAt)}
                {item.reviewedAt && (
                  <>
                    {' '}
                    · {t('trustCenterExpanded.reviewHistoryReviewedOn')}: {formatDate(item.reviewedAt)}
                  </>
                )}
              </div>
            </div>
            <div
              style={{
                padding: '2px 10px',
                borderRadius: R.full,
                fontSize: TYPE.size.xs,
                fontWeight: TYPE.weight.bold,
                fontFamily: F,
                background: style.bg,
                color: style.color,
                border: `1px solid ${style.border}`,
                whiteSpace: 'nowrap',
              }}
            >
              {item.status === 'pending'
                ? t('trustCenterExpanded.reviewHistoryPending')
                : item.status === 'approved'
                  ? t('trustCenterExpanded.reviewHistoryApproved')
                  : t('trustCenterExpanded.reviewHistoryRejected')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
