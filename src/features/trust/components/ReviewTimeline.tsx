import { C, F, R, SPACE, TYPE } from '../../../utils/wasel-ds';
import type { ReviewHistoryItem } from '../../../services/trustCenterModel';

function statusStyle(status: ReviewHistoryItem['status']) {
  switch (status) {
    case 'approved':
      return { bg: C.greenDim, color: C.green, border: `${C.green}33` };
    case 'rejected':
      return { bg: C.errorDim, color: C.error, border: `${C.error}33` };
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
          border: `1px solid ${C.border}`,
          background: C.card,
          textAlign: 'center',
        }}
      >
        <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, fontFamily: F }}>
          {t('trustCenterExpanded.reviewHistoryEmpty')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: SPACE[3] }}>
      {items.map((item) => {
        const style = statusStyle(item.status);
        const isDriver = item.type === 'driver_documents';

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
              border: `1px solid ${C.border}`,
              background: C.card,
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
                  color: C.text,
                  fontWeight: TYPE.weight.bold,
                  fontSize: TYPE.size.sm,
                  fontFamily: F,
                }}
              >
                {isDriver ? t('trustCenterExpanded.driverDocuments') : t('trustCenterExpanded.identity')}
              </div>
              {item.providerReference && (
                <div style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontFamily: F }}>
                  {t('trustCenterExpanded.sanadReference')}: {item.providerReference}
                </div>
              )}
              {item.failureReason && (
                <div
                  style={{
                    color: C.error,
                    fontSize: TYPE.size.xs,
                    fontFamily: F,
                    lineHeight: 1.5,
                  }}
                >
                  {item.failureReason}
                </div>
              )}
              <div style={{ color: C.textDim, fontSize: TYPE.size.xs, fontFamily: F }}>
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
