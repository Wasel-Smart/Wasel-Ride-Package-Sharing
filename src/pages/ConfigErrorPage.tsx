import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import type { RuntimeConfigIssue } from '../utils/env';

interface ConfigErrorPageProps {
  issues: RuntimeConfigIssue[];
}

export function ConfigErrorPage({ issues }: ConfigErrorPageProps) {
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: "-apple-system, 'Inter', sans-serif",
        background: `
          radial-gradient(circle at 16% 18%, rgba(85,233,255,0.12), transparent 24%),
          radial-gradient(circle at 82% 12%, rgba(245,177,30,0.12), transparent 20%),
          radial-gradient(circle at 78% 72%, rgba(51,232,95,0.08), transparent 20%),
          #040C18
        `,
        color: '#EFF6FF',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 'min(100%, 640px)',
          borderRadius: 28,
          padding: 32,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), rgba(10,22,40,0.94)',
          border: '1px solid rgba(245,177,30,0.24)',
          boxShadow: '0 28px 70px rgba(0,0,0,0.42)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <WaselLogo size={48} theme="light" variant="compact" />
        </div>
        
        <div
          style={{
            fontSize: '0.74rem',
            marginBottom: 12,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#F5B11E',
            fontWeight: 800,
          }}
        >
          Configuration Error
        </div>
        
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#EFF6FF', margin: '0 0 16px' }}>
          Environment configuration errors
        </h2>

        {errors.length > 0 && (
          <div style={{ textAlign: 'left', marginBottom: 24 }}>
            {errors.map((issue, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.24)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div style={{ color: '#FCA5A5', fontSize: '0.88rem', fontWeight: 700, marginBottom: 6 }}>
                  {issue.message}
                </div>
                <div style={{ color: 'rgba(239,246,255,0.52)', fontSize: '0.82rem' }}>
                  Variable: {issue.key}
                </div>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div style={{ textAlign: 'left', marginBottom: 24 }}>
            <div style={{ color: '#F5B11E', fontSize: '0.88rem', fontWeight: 700, marginBottom: 12 }}>
              Warnings:
            </div>
            {warnings.map((issue, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(245,177,30,0.06)',
                  border: '1px solid rgba(245,177,30,0.18)',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  fontSize: '0.84rem',
                  color: 'rgba(239,246,255,0.72)',
                }}
              >
                {issue.message}
              </div>
            ))}
          </div>
        )}

        <p
          style={{
            color: 'rgba(239,246,255,0.72)',
            fontSize: '0.92rem',
            margin: '0 auto 24px',
            maxWidth: 520,
            lineHeight: 1.7,
          }}
        >
          Please contact support or check your environment variables.
        </p>

        <div
          style={{
            background: 'rgba(85,233,255,0.06)',
            border: '1px solid rgba(85,233,255,0.18)',
            borderRadius: 12,
            padding: 16,
            textAlign: 'left',
            fontSize: '0.84rem',
            color: 'rgba(239,246,255,0.82)',
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8, color: '#55E9FF' }}>
            For Vercel deployments:
          </div>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>Go to your Vercel project dashboard</li>
            <li>Navigate to Settings → Environment Variables</li>
            <li>Add the missing variables listed above</li>
            <li>Redeploy your application</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
