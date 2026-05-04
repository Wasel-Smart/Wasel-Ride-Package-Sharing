import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Wallet,
  BadgeCheck,
  FileCheck,
} from 'lucide-react';
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
        <div style={{ color: '#EFF6FF', fontWeight: 700, fontFamily: FONT, fontSize: '0.92rem' }}>
          {label}
        </div>
        <div
          style={{
            color: 'rgba(148,163,184,0.72)',
            fontFamily: FONT,
            fontSize: '0.78rem',
            marginTop: 4,
          }}
        >
          {sub}
        </div>
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
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: FONT,
        }}
      >
        <button
          onClick={() => nav('/app/auth')}
          style={{
            border: 'none',
            borderRadius: 12,
            background: `linear-gradient(135deg,${CYAN},#0095B8)`,
            color: '#041018',
            fontWeight: 800,
            padding: '12px 20px',
            cursor: 'pointer',
          }}
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
        ? { color: GOLD, label: ar ? 'جزئي' : 'Partial' }
        : { color: RED, label: ar ? 'بحاجة لإكمال' : 'Action needed' };

  const driverReadiness = getDriverReadinessSummary(user);
  const incompleteSteps = driverReadiness.steps.filter(step => !step.complete);
  const nextAction =
    driverReadiness.status === 'ready'
      ? { label: ar ? 'فتح لوحة السائق' : 'Open Driver', to: '/app/driver' }
      : driverReadiness.status === 'complete_profile'
        ? { label: ar ? 'تأكيد الحساب' : 'Verify account', to: '/app/settings' }
        : driverReadiness.status === 'complete_verification'
          ? { label: ar ? 'إكمال التحقق' : 'Finish verification', to: '/app/settings' }
          : driverReadiness.status === 'pending_review'
            ? { label: ar ? 'مراجعة الحالة' : 'Review status', to: '/app/driver' }
            : { label: ar ? 'بدء الإعداد' : 'Start setup', to: '/app/settings' };
  const capabilityRows = [
    { title: ar ? 'نشر رحلة' : 'Post rides', gate: evaluateTrustCapability(user, 'offer_ride') },
    {
      title: ar ? 'حمل الطرود' : 'Carry packages',
      gate: evaluateTrustCapability(user, 'carry_packages'),
    },
    {
      title: ar ? 'استلام الدفعات' : 'Receive payouts',
      gate: evaluateTrustCapability(user, 'receive_payouts'),
    },
    {
      title: ar ? 'الدعم السريع' : 'Priority support',
      gate: evaluateTrustCapability(user, 'priority_support'),
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        fontFamily: FONT,
        direction: ar ? 'rtl' : 'ltr',
        paddingBottom: 80,
      }}
    >
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
                {ar ? 'مركز الثقة والتحقق' : 'Trust Center'}
              </div>
              <div style={{ color: 'rgba(148,163,184,0.72)', fontSize: '0.82rem', marginTop: 4 }}>
                {driverReadiness.status === 'ready'
                  ? ar
                    ? 'حسابك جاهز داخل واصل.'
                    : 'Your account is ready in Wasel.'
                  : ar
                    ? `أكمل ${incompleteSteps.length} خطوات لفتح الميزات الموثوقة.`
                    : `Complete ${incompleteSteps.length} checks to unlock trusted actions.`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                background: `${verificationTone.color}1A`,
                border: `1px solid ${verificationTone.color}33`,
                color: verificationTone.color,
                fontSize: '0.72rem',
                fontWeight: 800,
              }}
            >
              {verificationTone.label}
            </span>
            <span
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${BORD}`,
                color: '#CBD5E1',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {ar ? `درجة الثقة ${user.trustScore}/100` : `Trust score ${user.trustScore}/100`}
            </span>
            <span
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${BORD}`,
                color: '#CBD5E1',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {ar
                ? `${driverReadiness.steps.filter(step => step.complete).length}/5 مكتمل`
                : `${driverReadiness.steps.filter(step => step.complete).length}/5 done`}
            </span>
          </div>
        </div>

        <div
          style={{
            background: CARD,
            border: `1px solid ${BORD}`,
            borderRadius: 18,
            overflow: 'hidden',
            marginBottom: 18,
          }}
        >
          <Row
            label={ar ? 'الهوية / سند' : 'Identity / Sanad'}
            sub={
              user.sanadVerified || user.verified
                ? ar
                  ? 'تم التحقق.'
                  : 'Verified.'
                : ar
                  ? 'أكمل التحقق.'
                  : 'Finish verification.'
            }
            icon={<BadgeCheck size={18} />}
            accent={user.sanadVerified || user.verified ? GREEN : GOLD}
            onClick={() => nav('/app/settings')}
          />
          <Row
            label={ar ? 'البريد والهاتف' : 'Email and phone'}
            sub={
              user.emailVerified && user.phoneVerified
                ? ar
                  ? 'تم التأكيد.'
                  : 'Confirmed.'
                : ar
                  ? 'أكمل التأكيد.'
                  : 'Needs confirmation.'
            }
            icon={<CheckCircle2 size={18} />}
            accent={user.emailVerified && user.phoneVerified ? GREEN : GOLD}
            onClick={() => nav('/app/settings')}
          />
          <Row
            label={ar ? 'وثائق السائق' : 'Driver documents'}
            sub={
              user.verificationLevel === 'level_3'
                ? ar
                  ? 'جاهز للتشغيل.'
                  : 'Ready.'
                : ar
                  ? 'أكمل جاهزية السائق.'
                  : 'Finish setup.'
            }
            icon={<FileCheck size={18} />}
            accent={user.verificationLevel === 'level_3' ? GREEN : GOLD}
            onClick={() => nav('/app/driver')}
          />
          <Row
            label={ar ? 'حالة المحفظة' : 'Wallet standing'}
            sub={
              user.walletStatus === 'active'
                ? ar
                  ? 'جاهزة.'
                  : 'Ready.'
                : ar
                  ? 'تحتاج مراجعة.'
                  : 'Needs review.'
            }
            icon={<Wallet size={18} />}
            accent={user.walletStatus === 'active' ? GREEN : RED}
            onClick={() => nav('/app/wallet')}
          />
        </div>

        <div
          style={{
            background: CARD,
            border: `1px solid ${BORD}`,
            borderRadius: 18,
            padding: '18px',
            marginBottom: 18,
          }}
        >
          <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.95rem', marginBottom: 12 }}>
            {driverReadiness.status === 'ready'
              ? ar
                ? 'جاهز الآن'
                : 'Ready now'
              : ar
                ? 'الخطوات التالية'
                : 'Next checks'}
          </div>
          <div
            style={{
              color: 'rgba(148,163,184,0.78)',
              fontSize: '0.8rem',
              lineHeight: 1.6,
              marginBottom: 14,
            }}
          >
            {driverReadiness.headline}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {(driverReadiness.status === 'ready'
              ? driverReadiness.steps.slice(-2)
              : incompleteSteps.slice(0, 3)
            ).map(step => (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${step.complete ? `${GREEN}33` : BORD}`,
                  borderRadius: 14,
                  padding: '12px 13px',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: step.complete ? `${GREEN}18` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${step.complete ? `${GREEN}33` : BORD}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: step.complete ? GREEN : '#CBD5E1',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {step.complete
                    ? 'OK'
                    : `${incompleteSteps.findIndex(item => item.id === step.id) + 1}`}
                </div>
                <div>
                  <div style={{ color: '#EFF6FF', fontWeight: 700, fontSize: '0.82rem' }}>
                    {step.label}
                  </div>
                  <div
                    style={{
                      color: 'rgba(148,163,184,0.78)',
                      fontSize: '0.75rem',
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <button
              onClick={() => nav(nextAction.to)}
              style={{
                border: 'none',
                borderRadius: 12,
                background: `linear-gradient(135deg,${CYAN},#0095B8)`,
                color: '#041018',
                fontWeight: 800,
                padding: '11px 16px',
                cursor: 'pointer',
              }}
            >
              {nextAction.label}
            </button>
            <button
              onClick={() => nav('/app/settings')}
              style={{
                border: `1px solid ${BORD}`,
                borderRadius: 12,
                background: 'transparent',
                color: '#EFF6FF',
                fontWeight: 700,
                padding: '11px 16px',
                cursor: 'pointer',
              }}
            >
              {ar ? 'الإعدادات' : 'Settings'}
            </button>
          </div>
        </div>

        <div
          style={{
            background: CARD,
            border: `1px solid ${BORD}`,
            borderRadius: 18,
            padding: '18px',
            marginBottom: 18,
          }}
        >
          <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.95rem', marginBottom: 12 }}>
            {ar ? 'المتاح الآن' : 'Unlocked now'}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {capabilityRows.map(item => (
              <div
                key={item.title}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${BORD}`,
                  borderRadius: 14,
                  padding: '12px 13px',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ color: '#EFF6FF', fontWeight: 700, fontSize: '0.82rem' }}>
                    {item.title}
                  </div>
                  <div
                    style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.74rem', marginTop: 4 }}
                  >
                    {item.gate.allowed
                      ? ar
                        ? 'جاهز'
                        : 'Ready'
                      : (item.gate.recommendation ?? (ar ? 'خطوة إضافية' : 'One more step'))}
                  </div>
                </div>
                <span
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: item.gate.allowed ? `${GREEN}1A` : `${GOLD}1A`,
                    border: `1px solid ${item.gate.allowed ? `${GREEN}33` : `${GOLD}33`}`,
                    color: item.gate.allowed ? GREEN : GOLD,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.gate.allowed ? (ar ? 'مفتوح' : 'Open') : ar ? 'مغلق' : 'Locked'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: CARD,
            border: `1px solid ${BORD}`,
            borderRadius: 18,
            padding: '18px',
            marginBottom: 18,
          }}
        >
          <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.95rem', marginBottom: 12 }}>
            {ar ? 'ما يراه المستخدم' : 'What riders see'}
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}
          >
            {[
              {
                title: ar ? 'الهوية' : 'Identity',
                desc: ar ? 'حالة التحقق.' : 'Verification status.',
                accent: CYAN,
              },
              {
                title: ar ? 'التتبع' : 'Tracking',
                desc: ar ? 'تأكيد واضح للحجز أو الطرد.' : 'Clear trip or package proof.',
                accent: GOLD,
              },
              {
                title: ar ? 'المسار' : 'Route',
                desc: ar ? 'تفاصيل الانطلاق والوجهة.' : 'Departure and destination details.',
                accent: GREEN,
              },
            ].map(item => (
              <div
                key={item.title}
                style={{
                  borderRadius: 14,
                  padding: '12px 13px',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${item.accent}22`,
                }}
              >
                <div
                  style={{
                    color: item.accent,
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    marginBottom: 4,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.76rem', lineHeight: 1.5 }}
                >
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: CARD,
            border: `1px solid ${BORD}`,
            borderRadius: 18,
            padding: '20px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={16} color={GOLD} />
            <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.95rem' }}>
              {ar ? 'ملخص واصل' : 'Wasel summary'}
            </div>
          </div>
          <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.82rem', lineHeight: 1.7 }}>
            {driverReadiness.status === 'ready'
              ? ar
                ? 'أكملت المطلوب. حافظ على حالة المحفظة والتنبيهات.'
                : 'All core checks are done. Keep wallet and alerts healthy.'
              : ar
                ? 'أدخل المعلومات الصحيحة مرة واحدة، وواصل يحدّث الثقة تلقائياً.'
                : 'Add the right info once. Wasel updates trust automatically.'}
          </div>
        </div>
      </div>
    </div>
  );
}
