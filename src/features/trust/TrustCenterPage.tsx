import { Shield, CheckCircle2, AlertTriangle, ChevronRight, Wallet, BadgeCheck, FileCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getDriverReadinessSummary } from '../../services/driverOnboarding';
import { evaluateTrustCapability } from '../../services/trustRules';

const BG = '#040C18';
const CARD = 'rgba(255,255,255,0.04)';
const BORD = 'rgba(255,255,255,0.09)';
const CYAN = '#00C8E8';
const GREEN = '#22C55E';
const GOLD = '#F59E0B';
const RED = '#EF4444';
const FONT = "-apple-system,'Inter',sans-serif";

function Row({
  label,
  sub,
  icon,
  accent,
  onClick,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${BORD}`,
        padding: '16px 18px',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: `${accent}18`,
          border: `1px solid ${accent}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#EFF6FF', fontWeight: 700, fontFamily: FONT, fontSize: '0.92rem' }}>{label}</div>
        <div style={{ color: 'rgba(148,163,184,0.72)', fontFamily: FONT, fontSize: '0.78rem', marginTop: 4 }}>{sub}</div>
      </div>
      <ChevronRight size={16} color="rgba(148,163,184,0.45)" />
    </button>
  );
}

export default function TrustCenterPage() {
  const { language } = useLanguage();
  const { user } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: FONT }}>
        <button
          onClick={() => nav('/app/auth')}
          style={{ border: 'none', borderRadius: 12, background: `linear-gradient(135deg,${CYAN},#0095B8)`, color: '#041018', fontWeight: 800, padding: '12px 20px', cursor: 'pointer' }}
        >
          {ar ? 'سجّل الدخول لعرض مركز الثقة' : 'Sign in to open Trust Center'}
        </button>
      </div>
    );
  }

  const verificationTone =
    user.verificationLevel === 'level_3' || user.verificationLevel === 'level_2'
      ? { color: GREEN, label: ar ? 'مكتمل' : 'Verified' }
      : user.verificationLevel === 'level_1'
        ? { color: GOLD, label: ar ? 'جزئي' : 'Partially verified' }
        : { color: RED, label: ar ? 'بحاجة لإكمال' : 'Needs attention' };

  const driverReadiness = getDriverReadinessSummary(user);
  const capabilityRows = [
    { title: ar ? 'نشر رحلة' : 'Post rides', gate: evaluateTrustCapability(user, 'offer_ride') },
    { title: ar ? 'حمل الطرود' : 'Carry packages', gate: evaluateTrustCapability(user, 'carry_packages') },
    { title: ar ? 'استلام الدفعات' : 'Receive payouts', gate: evaluateTrustCapability(user, 'receive_payouts') },
    { title: ar ? 'الدعم السريع' : 'Priority support', gate: evaluateTrustCapability(user, 'priority_support') },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: FONT, direction: ar ? 'rtl' : 'ltr', paddingBottom: 80 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 0' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(0,200,232,0.16), rgba(255,255,255,0.03))',
            border: '1px solid rgba(0,200,232,0.22)',
            borderRadius: 20,
            padding: '24px 22px',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'rgba(0,200,232,0.15)',
                border: '1px solid rgba(0,200,232,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: CYAN,
              }}
            >
              <Shield size={24} />
            </div>
            <div>
              <div style={{ color: '#EFF6FF', fontSize: '1.35rem', fontWeight: 900 }}>
                {ar ? 'مركز الثقة والتحقق' : 'Trust & Verification Center'}
              </div>
              <div style={{ color: 'rgba(148,163,184,0.72)', fontSize: '0.82rem', marginTop: 4 }}>
                {ar ? 'راجع حالة التحقق، الجاهزية، والخطوات التالية التي ترفع ثقة الحساب.' : 'Review verification status, readiness, and the next steps that strengthen account trust.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ padding: '5px 10px', borderRadius: 999, background: `${verificationTone.color}1A`, border: `1px solid ${verificationTone.color}33`, color: verificationTone.color, fontSize: '0.72rem', fontWeight: 800 }}>
              {verificationTone.label}
            </span>
            <span style={{ padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORD}`, color: '#CBD5E1', fontSize: '0.72rem', fontWeight: 700 }}>
              {ar ? `درجة الثقة ${user.trustScore}/100` : `Trust score ${user.trustScore}/100`}
            </span>
            <span style={{ padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORD}`, color: '#CBD5E1', fontSize: '0.72rem', fontWeight: 700 }}>
              {ar ? 'ملف مباشر' : 'Live profile'}
            </span>
          </div>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 18, overflow: 'hidden', marginBottom: 18 }}>
          <Row
            label={ar ? 'الهوية / سند' : 'Identity / Sanad'}
            sub={
              user.sanadVerified || user.verified
                ? (ar ? 'تم تأكيد الهوية لهذا الحساب.' : 'Identity is verified for this account.')
                : (ar ? 'يلزم إكمال التحقق من إعدادات الحساب.' : 'Finish identity verification from account settings.')
            }
            icon={<BadgeCheck size={18} />}
            accent={user.sanadVerified || user.verified ? GREEN : GOLD}
            onClick={() => nav('/app/settings')}
          />
          <Row
            label={ar ? 'البريد والهاتف' : 'Email and phone'}
            sub={
              user.emailVerified && user.phoneVerified
                ? (ar ? 'تم تأكيد البريد الإلكتروني ورقم الهاتف.' : 'Email and phone are confirmed.')
                : (ar ? 'أكمل البريد الإلكتروني والهاتف لرفع الثقة.' : 'Confirm email and phone to raise trust.')
            }
            icon={<CheckCircle2 size={18} />}
            accent={user.emailVerified && user.phoneVerified ? GREEN : GOLD}
            onClick={() => nav('/app/settings')}
          />
          <Row
            label={ar ? 'وثائق السائق' : 'Driver documents'}
            sub={
              user.verificationLevel === 'level_3'
                ? (ar ? 'جاهز لتشغيل الرحلات وحمل الطرود.' : 'Ready for ride operations and package carrying.')
                : (ar ? 'أكمل جاهزية السائق قبل تفعيل تشغيل الرحلات.' : 'Complete driver readiness before live ride operations.')
            }
            icon={<FileCheck size={18} />}
            accent={user.verificationLevel === 'level_3' ? GREEN : GOLD}
            onClick={() => nav('/app/driver')}
          />
          <Row
            label={ar ? 'حالة المحفظة' : 'Wallet standing'}
            sub={
              user.walletStatus === 'active'
                ? (ar ? 'المحفظة جاهزة للدفع والتحصيل.' : 'Wallet is ready for payments and payouts.')
                : (ar ? 'هناك قيود على المحفظة وتحتاج مراجعة.' : 'Wallet restrictions need review.')
            }
            icon={<Wallet size={18} />}
            accent={user.walletStatus === 'active' ? GREEN : RED}
            onClick={() => nav('/app/wallet')}
          />
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 18, padding: '18px', marginBottom: 18 }}>
          <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.95rem', marginBottom: 12 }}>
            {ar ? 'جاهزية السائق' : 'Driver readiness'}
          </div>
          <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: 14 }}>
            {driverReadiness.headline} · {driverReadiness.detail}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {driverReadiness.steps.map((step) => (
              <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${step.complete ? `${GREEN}33` : BORD}`, borderRadius: 14, padding: '12px 13px' }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: step.complete ? `${GREEN}18` : 'rgba(255,255,255,0.05)', border: `1px solid ${step.complete ? `${GREEN}33` : BORD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: step.complete ? GREEN : '#CBD5E1', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
                  {step.complete ? 'OK' : '...'}
                </div>
                <div>
                  <div style={{ color: '#EFF6FF', fontWeight: 700, fontSize: '0.82rem' }}>{step.label}</div>
                  <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.75rem', marginTop: 4, lineHeight: 1.5 }}>{step.description}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <button onClick={() => nav('/app/driver')} style={{ border: 'none', borderRadius: 12, background: `linear-gradient(135deg,${CYAN},#0095B8)`, color: '#041018', fontWeight: 800, padding: '11px 16px', cursor: 'pointer' }}>
              {ar ? 'فتح لوحة السائق' : 'Open Driver'}
            </button>
            <button onClick={() => nav('/app/settings')} style={{ border: `1px solid ${BORD}`, borderRadius: 12, background: 'transparent', color: '#EFF6FF', fontWeight: 700, padding: '11px 16px', cursor: 'pointer' }}>
              {ar ? 'إعدادات الحساب' : 'Account settings'}
            </button>
          </div>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 18, padding: '18px', marginBottom: 18 }}>
          <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.95rem', marginBottom: 12 }}>
            {ar ? 'مصفوفة الصلاحيات' : 'Capability matrix'}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {capabilityRows.map((item) => (
              <div key={item.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORD}`, borderRadius: 14, padding: '12px 13px', gap: 12 }}>
                <div>
                  <div style={{ color: '#EFF6FF', fontWeight: 700, fontSize: '0.82rem' }}>{item.title}</div>
                  <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.74rem', marginTop: 4 }}>
                    {item.gate.allowed ? (ar ? 'جاهز الآن' : 'Ready now') : item.gate.recommendation ?? (ar ? 'يتطلب خطوة إضافية' : 'Needs one more step')}
                  </div>
                </div>
                <span style={{ padding: '5px 10px', borderRadius: 999, background: item.gate.allowed ? `${GREEN}1A` : `${GOLD}1A`, border: `1px solid ${item.gate.allowed ? `${GREEN}33` : `${GOLD}33`}`, color: item.gate.allowed ? GREEN : GOLD, fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {item.gate.allowed ? (ar ? 'مفعل' : 'Enabled') : (ar ? 'محجوب' : 'Blocked')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 18, padding: '18px', marginBottom: 18 }}>
          <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.95rem', marginBottom: 12 }}>
            {ar ? 'إشارات الثقة اليومية' : 'Trust signals'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {[
              { title: ar ? 'إثبات الرحلة' : 'Trip proof', desc: ar ? 'احفظ تفاصيل الحجز والوقت والمركبة.' : 'Keep booking, time, and vehicle details visible.', accent: CYAN },
              { title: ar ? 'تسليم الطرد' : 'Package handoff', desc: ar ? 'استخدم التتبع لتأكيد المرسل والراكب والمستلم.' : 'Use tracking to confirm sender, rider, and receiver.', accent: GOLD },
              { title: ar ? 'ركوب الباص' : 'Bus boarding', desc: ar ? 'اعرض تفاصيل الانطلاق والوجهة قبل الصعود.' : 'Show departure and destination before boarding.', accent: GREEN },
            ].map((item) => (
              <div key={item.title} style={{ borderRadius: 14, padding: '12px 13px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${item.accent}22` }}>
                <div style={{ color: item.accent, fontWeight: 800, fontSize: '0.84rem', marginBottom: 4 }}>{item.title}</div>
                <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.76rem', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 18, padding: '20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={16} color={GOLD} />
            <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.95rem' }}>
              {ar ? 'الخطوات التالية' : 'Next steps'}
            </div>
          </div>
          <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.82rem', lineHeight: 1.7 }}>
            {driverReadiness.status === 'ready'
              ? (ar ? 'حسابك جاهز للتشغيل. راقب المحفظة، الإشعارات، وصفحة السائق للحفاظ على الجاهزية.' : 'Your account is ready to operate. Keep wallet standing, notifications, and driver status healthy to stay eligible.')
              : (ar ? 'ابدأ من الإعدادات لتأكيد البريد والهاتف، ثم أكمل جاهزية السائق من صفحة السائق قبل تفعيل نشر الرحلات.' : 'Start in Settings to confirm email and phone, then complete driver readiness from the Driver page before live ride posting.')}
          </div>
        </div>
      </div>
    </div>
  );
}
