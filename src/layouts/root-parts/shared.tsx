import { C, F, R } from '../../utils/wasel-ds';

export function getDrawerSectionLabel(groupId: string, ar: boolean) {
  if (groupId === 'profile' || groupId === 'my-trips') {
    return ar ? 'الحساب' : 'Account';
  }

  if (groupId === 'mobility-os') {
    return ar ? 'العمليات' : 'Operations';
  }

  return ar ? 'الخدمات الأساسية' : 'Core services';
}

export function Badge({ label, color = C.cyan }: { label: string; color?: string }) {
  const map: Record<string, string> = {
    LIVE: C.cyan,
    RAJE3: C.gold,
    AI: C.blue,
    VIP: C.gold,
    'Fixed Price': C.green,
    QA: C.purple,
    TRUST: C.green,
  };
  const col = map[label] || color;

  return (
    <span style={{ fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: R.full, background: `${col}18`, color: col, border: `1px solid ${col}30`, flexShrink: 0 }}>
      {label}
    </span>
  );
}

export function AppPill({ ar }: { ar: boolean }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, padding: '0 12px', borderRadius: R.full, background: C.cyanDim, border: `1px solid ${C.border}`, color: C.textSub, fontSize: '0.72rem', fontWeight: 700, fontFamily: F, whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}` }} />
      {ar ? 'واصل لتنقل أبسط' : 'Wasel for simpler movement'}
    </div>
  );
}
