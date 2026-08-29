export function TrustScoreDisplay({ score, label }: { score: number; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '24px 24px 20px',
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        background: '#fff',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: `4px solid ${score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: 800,
        }}
      >
        {score}
      </div>
      <div style={{ fontWeight: 700 }}>{label}</div>
    </div>
  );
}
