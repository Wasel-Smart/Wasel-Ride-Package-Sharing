export interface ReviewItem {
  id: string;
  subject: string;
  status: 'pending' | 'approved' | 'rejected';
  updatedAt: string;
}

export function ReviewQueue({ items }: { items: ReviewItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(item => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{item.subject}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.updatedAt}</div>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: '0.75rem',
              fontWeight: 600,
              background: item.status === 'approved' ? '#dcfce7' : item.status === 'rejected' ? '#fee2e2' : '#fef3c7',
              color: item.status === 'approved' ? '#166534' : item.status === 'rejected' ? '#991b1b' : '#92400e',
            }}
          >
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}
