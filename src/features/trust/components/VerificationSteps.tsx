export function VerificationSteps({ steps }: { steps: Array<{ id: string; title: string; status: 'pending' | 'verified' | 'failed' }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {steps.map(step => (
        <div
          key={step.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: step.status === 'verified' ? '#22c55e' : step.status === 'failed' ? '#ef4444' : '#e5e7eb',
            }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>{step.title}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{step.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
