import { useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  HelpCircle,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  Route,
  Send,
  Wallet,
} from 'lucide-react';
import {
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { WaselButton } from '../../components/wasel-ui/WaselButton';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  getSmsSupportUrl,
  getSupportEmailUrl,
  getSupportPhoneUrl,
  getWhatsAppSupportUrl,
} from '../../utils/env';
import { C, F, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';

const supportTopics = [
  {
    icon: Route,
    title: 'Ride or route issue',
    titleAr: 'مشكلة رحلة أو مسار',
    detail: 'Booking changes, missing route context, live tracking, arrival, or safety escalation.',
    detailAr: 'تغيير حجز، سياق مسار ناقص، تتبع مباشر، وصول، أو تصعيد سلامة.',
    accent: C.cyan,
  },
  {
    icon: PackageCheck,
    title: 'Package handoff',
    titleAr: 'تسليم طرد',
    detail: 'Pickup proof, delivery proof, package tracking, returns, or damaged-item escalation.',
    detailAr: 'إثبات استلام، إثبات تسليم، تتبع طرد، مرتجعات، أو تصعيد تلف.',
    accent: C.orange,
  },
  {
    icon: Wallet,
    title: 'Wallet and payment',
    titleAr: 'المحفظة والدفع',
    detail: 'Balance, payout, refund, failed payment, frozen wallet, or receipt questions.',
    detailAr: 'رصيد، سحب، استرداد، دفعة فاشلة، محفظة معلّقة، أو سؤال عن وصل.',
    accent: C.gold,
  },
  {
    icon: AlertCircle,
    title: 'Account and trust',
    titleAr: 'الحساب والثقة',
    detail: 'Identity verification, phone confirmation, driver documents, login, or 2FA recovery.',
    detailAr: 'توثيق هوية، تأكيد هاتف، وثائق سائق، تسجيل دخول، أو استرجاع التحقق الثنائي.',
    accent: C.green,
  },
] as const;

function topicStyle(accent: string) {
  return {
    borderRadius: R.xxl,
    border: `1px solid ${accent}24`,
    background: `radial-gradient(circle at top left, ${accent}12, transparent 34%), ${C.card}`,
    boxShadow: SH.md,
    padding: SPACE[5],
  } as const;
}

function SupportChannel({
  icon,
  label,
  detail,
  href,
  accent,
  unavailable,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  href: string;
  accent: string;
  unavailable: string;
}) {
  const disabled = !href;
  return (
    <a
      href={href || undefined}
      aria-disabled={disabled}
      style={{
        ...topicStyle(accent),
        display: 'flex',
        alignItems: 'center',
        gap: SPACE[3],
        textDecoration: 'none',
        color: 'inherit',
        opacity: disabled ? 0.58 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <span
        style={{
          width: 42,
          height: 42,
          display: 'grid',
          placeItems: 'center',
          borderRadius: R.lg,
          color: accent,
          background: `${accent}16`,
          border: `1px solid ${accent}28`,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ display: 'grid', gap: 4 }}>
        <span style={{ color: C.text, fontWeight: TYPE.weight.black, fontFamily: F }}>{label}</span>
        <span
          style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.5, fontFamily: F }}
        >
          {disabled ? unavailable : detail}
        </span>
      </span>
    </a>
  );
}

const FAQS = [
  {
    q: 'How do I cancel a ride booking?',
    qAr: 'كيف ألغي حجز رحلة؟',
    a: 'Open My Trips, find the ride, expand it, and tap "Open journey". From there you can request cancellation. Cancellation policy depends on how close to departure you are.',
    aAr: 'افتح رحلاتي، اختار الرحلة، وسّع التفاصيل، واضغط "فتح الرحلة". من هناك بتقدر تطلب الإلغاء. سياسة الإلغاء بتعتمد على قديش ضايل على موعد الانطلاق.',
  },
  {
    q: 'My package is not moving — what do I do?',
    a: 'Go to Packages → Track Package and enter your tracking ID. If the status has not changed in 24 hours, tap "Open support" to escalate directly from the tracking screen.',
  },
  {
    q: 'Why is my wallet balance pending?',
    a: 'Pending balance means a payment is awaiting settlement or a payout is being processed. It typically clears within 1–3 business days. Check the Wallet → Transactions tab for details.',
  },
  {
    q: 'How do I verify my account to offer rides?',
    qAr: 'كيف أوثق حسابي عشان أعرض رحلات؟',
    a: 'Go to Trust Center from your profile. Complete email verification, phone confirmation, and upload your driver documents. Once all checks pass, the Offer Ride flow unlocks.',
    aAr: 'افتح مركز الثقة من ملفك الشخصي. كمّل توثيق البريد، تأكيد الهاتف، وارفع وثائق السائق. لما تنجح كل الفحوصات، بينفتح مسار عرض الرحلة.',
  },
  {
    q: 'Can I change my pickup location after booking?',
    qAr: 'بقدر أغيّر نقطة الانطلاق بعد الحجز؟',
    a: 'Contact the driver directly through the trip chat, or open a support ticket from My Trips. Changes are subject to driver approval.',
    aAr: 'تواصل مع السائق من دردشة الرحلة أو افتح طلب دعم من رحلاتي. أي تغيير بحاجة موافقة السائق.',
  },
];

const TOPIC_CHANNEL: Record<string, { hint: string; href: () => string }> = {
  'Ride issue': { hint: '→ Fastest via WhatsApp or call', href: getWhatsAppSupportUrl },
  'Package issue': {
    hint: '→ Use email for tracking details',
    href: getSupportEmailUrl.bind(null, 'Package issue'),
  },
  'Wallet question': {
    hint: '→ Email works best for payment records',
    href: getSupportEmailUrl.bind(null, 'Wallet question'),
  },
  'Account access': { hint: '→ Call support for fastest recovery', href: getSupportPhoneUrl },
  'Driver verification': {
    hint: '→ Email with document attachments',
    href: getSupportEmailUrl.bind(null, 'Driver verification'),
  },
};

const TOPIC_HINT_AR: Record<string, string> = {
  'Ride issue': 'مشكلة بمشوار أو حجز',
  'Package issue': 'مشكلة باستلام أو تسليم طرد',
  'Wallet question': 'سؤال عن المحفظة أو الدفع',
  'Account access': 'مشكلة دخول أو تحقق الحساب',
  'Driver verification': 'تحقق وثائق السائق',
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderRadius: R.xl,
        border: `1px solid ${C.borderFaint}`,
        background: C.elevated,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          padding: `${SPACE[4]} ${SPACE[4]}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'transparent',
          border: 'none',
          color: C.text,
          fontFamily: F,
          fontSize: TYPE.size.base,
          fontWeight: TYPE.weight.bold,
          cursor: 'pointer',
        }}
      >
        <span style={{ textAlign: 'left' }}>{q}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div
          style={{
            padding: `${SPACE[3]} ${SPACE[4]}`,
            borderTop: `1px solid ${C.borderFaint}`,
            color: C.textMuted,
            fontSize: TYPE.size.sm,
            lineHeight: 1.7,
            fontFamily: F,
          }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

function FAQSection({ ar }: { ar: boolean }) {
  const { t } = useLanguage();
  return (
    <SectionCard
      title={t('support.faq')}
      subtitle={
        ar ? 'إجابات سريعة على أكثر الأسئلة تكراراً.' : 'Quick answers to the most common issues.'
      }
      icon={<HelpCircle size={18} color={C.cyan} />}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        {FAQS.map(item => (
          <FaqItem
            key={item.q}
            q={ar ? (item.qAr ?? item.q) : item.q}
            a={ar ? (item.aAr ?? item.a) : item.a}
          />
        ))}
      </div>
    </SectionCard>
  );
}

export function SupportPage() {
  const { language, dir, t } = useLanguage();
  const { user } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';

  const emailUrl = getSupportEmailUrl('Wasel support request');
  const smsUrl = getSmsSupportUrl('Hi Wasel support team');
  const whatsappUrl = getWhatsAppSupportUrl('Hi Wasel support team');
  const phoneUrl = getSupportPhoneUrl();

  const [formEmail, setFormEmail] = useState(user?.email ?? '');
  const [formTopic, setFormTopic] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const recommendedChannel = formTopic ? TOPIC_CHANNEL[formTopic] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail || !formTopic || !formMessage) return;
    setSubmitted(true);
  };

  return (
    <PageShell maxWidth={1120} dir={dir === 'rtl' ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow={ar ? 'الدعم' : 'Support'}
          icon={<HelpCircle size={18} />}
          title={t('supportPage.support_that_keeps_the_movement_context')}
          description={
            ar
              ? 'دعم واصل مرتب حول النتيجة اللي بدك إياها: مسار، طرد، محفظة، دخول للحساب، أو توثيق ثقة.'
              : 'Wasel support is organized around the exact user outcome: route, package, wallet, account access, or trust verification.'
          }
          accent={C.blueLight}
          actions={
            <>
              <WaselButton type="button" variant="primary" onClick={() => nav('/app/my-trips')}>
                {ar ? 'افتح رحلاتي' : 'Open my trips'}
              </WaselButton>
              <WaselButton
                type="button"
                variant="outline"
                onClick={() => nav('/app/settings')}
                style={{ background: C.elevated, color: C.text }}
              >
                {ar ? 'إعدادات الحساب' : 'Account settings'}
              </WaselButton>
            </>
          }
          aside={
            <div style={{ display: 'grid', gap: SPACE[4] }}>
              <StatusBadge
                label={
                  ar
                    ? 'رحلات، طرود، محفظة، حساب، وسلامة'
                    : 'Rides, parcels, wallet, account, and safety'
                }
                accent={C.blueLight}
              />
              <div
                style={{
                  color: C.textMuted,
                  fontSize: TYPE.size.sm,
                  lineHeight: 1.7,
                  fontFamily: F,
                }}
              >
                {ar
                  ? 'لأي موضوع سلامة عاجل، استخدم زر الطوارئ داخل التطبيق أو رقم الطوارئ المحلي أولاً، بعدها افتح دعم واصل مع سياق الرحلة.'
                  : 'For urgent safety concerns, use the in-app SOS flow or your local emergency number first, then open Wasel support with the trip context.'}
              </div>
            </div>
          }
        />

        <SectionCard
          title={t('supportPage.contact_channels')}
          subtitle={
            ar
              ? 'استخدم القناة المناسبة حسب الاستعجال والجهاز اللي معك.'
              : 'Use the channel that matches the urgency and the device you are on.'
          }
          icon={<MessageCircle size={18} color={C.blueLight} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 12,
            }}
          >
            <SupportChannel
              icon={<Mail size={18} />}
              label={ar ? 'دعم عبر البريد' : 'Email support'}
              detail={
                ar
                  ? 'الأفضل للمشاكل غير العاجلة وفيها تفاصيل.'
                  : 'Best for non-urgent issues with detail.'
              }
              href={emailUrl}
              accent={C.cyan}
              unavailable={ar ? 'مش مفعّل في هاي البيئة.' : 'Not configured in this environment.'}
            />
            <SupportChannel
              icon={<MessageCircle size={18} />}
              label={ar ? 'دعم واتساب' : 'WhatsApp support'}
              detail={
                ar
                  ? 'الأسرع لتحديثات المسار أو تسليم الطرد.'
                  : 'Best for quick route or handoff updates.'
              }
              href={whatsappUrl}
              accent={C.green}
              unavailable={ar ? 'مش مفعّل في هاي البيئة.' : 'Not configured in this environment.'}
            />
            <SupportChannel
              icon={<Phone size={18} />}
              label={ar ? 'اتصال بالدعم' : 'Call support'}
              detail={
                ar
                  ? 'الأفضل للحساب أو الحركة العاجلة.'
                  : 'Best for urgent account or movement escalation.'
              }
              href={phoneUrl}
              accent={C.gold}
              unavailable={ar ? 'مش مفعّل في هاي البيئة.' : 'Not configured in this environment.'}
            />
            <SupportChannel
              icon={<MessageCircle size={18} />}
              label={ar ? 'دعم رسائل' : 'SMS support'}
              detail={
                ar ? 'مناسب لما تكون بيانات الموبايل محدودة.' : 'Best when mobile data is limited.'
              }
              href={smsUrl}
              accent={C.blueLight}
              unavailable={ar ? 'مش مفعّل في هاي البيئة.' : 'Not configured in this environment.'}
            />
          </div>
        </SectionCard>

        <SectionCard
          title={t('supportPage.what_we_can_help_with')}
          subtitle={
            ar
              ? 'مواضيع الدعم مرتبة حسب نتيجة الخدمة.'
              : 'Support topics grouped by product outcome.'
          }
          icon={<HelpCircle size={18} color={C.cyan} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {supportTopics.map(topic => {
              const Icon = topic.icon;
              return (
                <div key={topic.title} style={topicStyle(topic.accent)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: R.lg,
                        color: topic.accent,
                        background: `${topic.accent}16`,
                        border: `1px solid ${topic.accent}28`,
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    <div style={{ color: C.text, fontWeight: TYPE.weight.black, fontFamily: F }}>
                      {ar ? topic.titleAr : topic.title}
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: SPACE[3],
                      color: C.textMuted,
                      fontSize: TYPE.size.sm,
                      lineHeight: 1.7,
                      fontFamily: F,
                    }}
                  >
                    {ar ? topic.detailAr : topic.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <FAQSection ar={ar} />

        <SectionCard
          title={t('supportPage.send_us_a_message')}
          subtitle={
            ar
              ? 'بنرد خلال ساعتين ضمن ساعات العمل.'
              : 'We will answer within 2 hours during business hours.'
          }
          icon={<Send size={18} color={C.cyan} />}
        >
          {submitted ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: SPACE[4],
                padding: `${SPACE[8]} ${SPACE[4]}`,
                textAlign: 'center',
              }}
            >
              <CheckCircle size={40} color={C.green} />
              <div
                style={{
                  color: C.text,
                  fontWeight: TYPE.weight.bold,
                  fontSize: TYPE.size.lg,
                  fontFamily: F,
                }}
              >
                {t('supportPage.message_received')}
              </div>
              <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, fontFamily: F }}>
                {t('supportPage.we_ll_reply_to')}
                <strong style={{ color: C.text }}>{formEmail}</strong>{' '}
                {t('supportPage.within_2_hours')}
              </div>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormMessage('');
                  setFormTopic('');
                }}
                style={{
                  padding: `${SPACE[2]} ${SPACE[5]}`,
                  borderRadius: R.full,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontFamily: F,
                  fontSize: TYPE.size.sm,
                  cursor: 'pointer',
                }}
              >
                {t('supportPage.send_another_message')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <input
                required
                type="email"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                placeholder={t('supportPage.your_email')}
                style={{
                  width: '100%',
                  height: 46,
                  padding: '0 14px',
                  borderRadius: R.lg,
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  color: C.text,
                  fontFamily: F,
                  boxSizing: 'border-box',
                }}
              />
              <div>
                <select
                  required
                  value={formTopic}
                  onChange={e => setFormTopic(e.target.value)}
                  style={{
                    width: '100%',
                    height: 46,
                    padding: '0 14px',
                    borderRadius: R.lg,
                    border: `1px solid ${C.border}`,
                    background: C.card,
                    color: formTopic ? C.text : C.textMuted,
                    fontFamily: F,
                  }}
                >
                  <option value="" disabled>
                    {t('supportPage.topic')}
                  </option>
                  <option value="Ride issue">{t('supportPage.ride_issue')}</option>
                  <option value="Package issue">{t('supportPage.package_issue')}</option>
                  <option value="Wallet question">{t('supportPage.wallet_question')}</option>
                  <option value="Account access">{t('supportPage.account_access')}</option>
                  <option value="Driver verification">
                    {t('supportPage.driver_verification')}
                  </option>
                </select>
                {recommendedChannel && (
                  <a
                    href={recommendedChannel.href()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 6,
                      color: C.cyan,
                      fontSize: TYPE.size.xs,
                      fontFamily: F,
                      textDecoration: 'none',
                      fontWeight: TYPE.weight.semibold,
                    }}
                  >
                    {ar ? TOPIC_HINT_AR[formTopic] : recommendedChannel.hint}
                  </a>
                )}
              </div>
              <textarea
                required
                value={formMessage}
                onChange={e => setFormMessage(e.target.value)}
                placeholder={t('supportPage.how_can_we_help')}
                rows={4}
                style={{
                  width: '100%',
                  minHeight: 110,
                  padding: 14,
                  borderRadius: R.lg,
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  color: C.text,
                  fontFamily: F,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <WaselButton type="submit" variant="primary">
                {t('supportPage.send_message')}
              </WaselButton>
            </form>
          )}
        </SectionCard>

        <p
          style={{
            textAlign: 'center',
            color: C.textDim,
            fontSize: TYPE.size.xs,
            marginTop: SPACE[6],
            fontFamily: F,
          }}
        >
          {t('supportPage.wasel_support_expected_response_2_hours_safety_issues_immediate')}
        </p>
      </div>
    </PageShell>
  );
}

export default SupportPage;
