import { C, F, R, TYPE } from '../../../utils/wasel-ds';

export interface ReviewItem {
  id: string;
  subject: string;
  status: 'pending' | 'approved' | 'rejected';
  updatedAt: string;
}

function statusStyle(status: ReviewItem['status']) {
  switch (status) {
    case 'approved':
      return { bg: C.greenDim, color: C.green };
    case 'rejected':
      return { bg: C.errorDim, color: C.error };
    default:
      return { bg: C.goldDim, color: C.gold };
  }
}

export function ReviewQueue({ items }: { items: ReviewItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(item => {
        const style = statusStyle(item.status);
        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 14px',
              borderRadius: R.lg,
              border: `1px solid ${C.border}`,
              background: C.cardSolid,
            }}
          >
            <div>
              <div style={{ fontWeight: TYPE.weight.bold, color: C.text, fontFamily: F }}>{item.subject}</div>
              <div style={{ fontSize: TYPE.size.xs, color: C.textDim, fontFamily: F, lineHeight: 1.4 }}>
                {item.updatedAt}
              </div>
            </div>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: R.full,
                fontSize: TYPE.size.xs,
                fontWeight: TYPE.weight.bold,
                fontFamily: F,
                background: style.bg,
                color: style.color,
                border: `1px solid ${style.color}28`,
              }}
            >
              {item.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
