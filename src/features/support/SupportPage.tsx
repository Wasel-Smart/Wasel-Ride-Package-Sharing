import type { ReactNode } from 'react';
import { useState } from 'react';
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
    detail: 'Booking changes, missing route context, live tracking, arrival, or safety escalation.',
    accent: C.cyan,
  },
  {
    icon: PackageCheck,
    title: 'Package handoff',
    detail: 'Pickup proof, delivery proof, package tracking, returns, or damaged-item escalation.',
    accent: C.orange,
  },
  {
    icon: Wallet,
    title: 'Wallet and payment',
    detail: 'Balance, payout, refund, failed payment, frozen wallet, or receipt questions.',
    accent: C.gold,
  },
  {
    icon: AlertCircle,
    title: 'Account and trust',
    detail: 'Identity verification, phone confirmation, driver documents, login, or 2FA recovery.',
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
  icon, label, detail, href, accent,
}: {
  icon: ReactNode; label: string; detail: string; href: string; accent: string;
}) {
  const disabled = !href;
  return (
    <a
      href={href || undefined}
      aria-disabled={disabled}
      style={{
        ...topicStyle(accent),
        display: 'flex', alignItems: 'center',
        gap: SPACE[3], textDecoration: 'none',
        color: 'inherit',
        opacity: disabled ? 0.58 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <span style={{
        width: 42, height: 42, display: 'grid', placeItems: 'center',
        borderRadius: R.lg, color: accent,
        background: `${accent}16`, border: `1px solid ${accent}28`, flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ display: 'grid', gap: 4 }}>
        <span style={{ color: C.text, fontWeight: TYPE.weight.black, fontFamily: F }}>{label}</span>
        <span style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.5, fontFamily: F }}>
          {disabled ? 'Not configured in this environment.' : detail}
        </span>
      </span>
    </a>
  );
}

const FAQS = [
  {
    q: 'How do I cancel a ride booking?',
    a: 'Open My Trips, find the ride, expand it, and tap "Open journey". From there you can request cancellation. Cancellation policy depends on how close to departure you are.',
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
    a: 'Go to Trust Center from your profile. Complete email verification, phone confirmation, and upload your driver documents. Once all checks pass, the Offer Ride flow unlocks.',
  },
  {
    q: 'Can I change my pickup location after booking?',
    a: 'Contact the driver directly through the trip chat, or open a support ticket from My Trips. Changes are subject to driver approval.',
  },
];

const TOPIC_CHANNEL: Record<string, { hint: string; href: () => string }> = {
  'Ride issue': { hint: '→ Fastest via WhatsApp or call', href: getWhatsAppSupportUrl },
  'Package issue': { hint: '→ Use email for tracking details', href: getSupportEmailUrl.bind(null, 'Package issue') },
  'Wallet question': { hint: '→ Email works best for payment records', href: getSupportEmailUrl.bind(null, 'Wallet question') },
  'Account access': { hint: '→ Call support for fastest recovery', href: getSupportPhoneUrl },
  'Driver verification': { hint: '→ Email with document attachments', href: getSupportEmailUrl.bind(null, 'Driver verification') },
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: R.xl, border: `1px solid ${C.borderFaint}`,
      background: C.elevated, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: `${SPACE[4]} ${SPACE[4]}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'transparent', border: 'none',
          color: C.text, fontFamily: F,
          fontSize: TYPE.size.base, fontWeight: TYPE.weight.bold, cursor: 'pointer',
        }}
      >
        <span style={{ textAlign: 'left' }}>{q}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div style={{
          padding: `${SPACE[3]} ${SPACE[4]}`,
          borderTop: `1px solid ${C.borderFaint}`,
          color: C.textMuted, fontSize: TYPE.size.sm,
          lineHeight: 1.7, fontFamily: F,
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

function FAQSection({ ar: _ar }: { ar: boolean }) {
  return (
    <SectionCard
      title="Frequently Asked Questions"
      subtitle="Quick answers to the most common issues."
      icon={<HelpCircle size={18} color={C.cyan} />}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        {FAQS.map(item => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>
    </SectionCard>
  );
}

export function SupportPage() {
  const { dir } = useLanguage();
  const { user } = useLocalAuth();
  const nav = useIframeSafeNavigate();

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
          eyebrow="Support"
          icon={<HelpCircle size={18} />}
          title="Support that keeps the movement context"
          description="Wasel support is organized around the exact user outcome: route, package, wallet, account access, or trust verification."
          accent={C.blueLight}
          actions={
            <>
              <WaselButton type="button" variant="primary" onClick={() => nav('/app/my-trips')}>
                Open my trips
              </WaselButton>
              <WaselButton
                type="button"
                variant="outline"
                onClick={() => nav('/app/settings')}
                style={{ background: C.elevated, color: C.text }}
              >
                Account settings
              </WaselButton>
            </>
          }
          aside={
            <div style={{ display: 'grid', gap: SPACE[4] }}>
              <StatusBadge label="Rides, parcels, wallet, account, and safety" accent={C.blueLight} />
              <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7, fontFamily: F }}>
                For urgent safety concerns, use the in-app SOS flow or your local emergency number
                first, then open Wasel support with the trip context.
              </div>
            </div>
          }
        />

        <SectionCard
          title="Contact Channels"
          subtitle="Use the channel that matches the urgency and the device you are on."
          icon={<MessageCircle size={18} color={C.blueLight} />}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 12,
          }}>
            <SupportChannel icon={<Mail size={18} />} label="Email support" detail="Best for non-urgent issues with detail." href={emailUrl} accent={C.cyan} />
            <SupportChannel icon={<MessageCircle size={18} />} label="WhatsApp support" detail="Best for quick route or handoff updates." href={whatsappUrl} accent={C.green} />
            <SupportChannel icon={<Phone size={18} />} label="Call support" detail="Best for urgent account or movement escalation." href={phoneUrl} accent={C.gold} />
            <SupportChannel icon={<MessageCircle size={18} />} label="SMS support" detail="Best when mobile data is limited." href={smsUrl} accent={C.blueLight} />
          </div>
        </SectionCard>

        <SectionCard
          title="What We Can Help With"
          subtitle="Support topics grouped by product outcome."
          icon={<HelpCircle size={18} color={C.cyan} />}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
          }}>
            {supportTopics.map(topic => {
              const Icon = topic.icon;
              return (
                <div key={topic.title} style={topicStyle(topic.accent)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                    <span style={{
                      width: 40, height: 40, display: 'grid', placeItems: 'center',
                      borderRadius: R.lg, color: topic.accent,
                      background: `${topic.accent}16`, border: `1px solid ${topic.accent}28`,
                    }}>
                      <Icon size={18} />
                    </span>
                    <div style={{ color: C.text, fontWeight: TYPE.weight.black, fontFamily: F }}>{topic.title}</div>
                  </div>
                  <div style={{ marginTop: SPACE[3], color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7, fontFamily: F }}>
                    {topic.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <FAQSection ar={false} />

        <SectionCard
          title="Send us a message"
          subtitle="We will answer within 2 hours during business hours."
          icon={<Send size={18} color={C.cyan} />}
        >
          {submitted ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: SPACE[4], padding: `${SPACE[8]} ${SPACE[4]}`, textAlign: 'center',
            }}>
              <CheckCircle size={40} color={C.green} />
              <div style={{ color: C.text, fontWeight: TYPE.weight.bold, fontSize: TYPE.size.lg, fontFamily: F }}>
                Message received
              </div>
              <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, fontFamily: F }}>
                We'll reply to <strong style={{ color: C.text }}>{formEmail}</strong> within 2 hours.
              </div>
              <button
                onClick={() => { setSubmitted(false); setFormMessage(''); setFormTopic(''); }}
                style={{
                  padding: `${SPACE[2]} ${SPACE[5]}`, borderRadius: R.full,
                  background: C.elevated, border: `1px solid ${C.border}`,
                  color: C.text, fontFamily: F, fontSize: TYPE.size.sm, cursor: 'pointer',
                }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <input
                required
                type="email"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                placeholder="Your email"
                style={{
                  width: '100%', height: 46, padding: '0 14px',
                  borderRadius: R.lg, border: `1px solid ${C.border}`,
                  background: C.card, color: C.text, fontFamily: F,
                  boxSizing: 'border-box',
                }}
              />
              <div>
                <select
                  required
                  value={formTopic}
                  onChange={e => setFormTopic(e.target.value)}
                  style={{
                    width: '100%', height: 46, padding: '0 14px',
                    borderRadius: R.lg, border: `1px solid ${C.border}`,
                    background: C.card, color: formTopic ? C.text : C.textMuted,
                    fontFamily: F,
                  }}
                >
                  <option value="" disabled>Topic</option>
                  <option>Ride issue</option>
                  <option>Package issue</option>
                  <option>Wallet question</option>
                  <option>Account access</option>
                  <option>Driver verification</option>
                </select>
                {recommendedChannel && (
                  <a
                    href={recommendedChannel.href()}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      marginTop: 6, color: C.cyan,
                      fontSize: TYPE.size.xs, fontFamily: F,
                      textDecoration: 'none', fontWeight: TYPE.weight.semibold,
                    }}
                  >
                    {recommendedChannel.hint}
                  </a>
                )}
              </div>
              <textarea
                required
                value={formMessage}
                onChange={e => setFormMessage(e.target.value)}
                placeholder="How can we help?"
                rows={4}
                style={{
                  width: '100%', minHeight: 110, padding: 14,
                  borderRadius: R.lg, border: `1px solid ${C.border}`,
                  background: C.card, color: C.text,
                  fontFamily: F, resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <WaselButton type="submit" variant="primary">
                Send message
              </WaselButton>
            </form>
          )}
        </SectionCard>

        <p style={{ textAlign: 'center', color: C.textDim, fontSize: TYPE.size.xs, marginTop: SPACE[6], fontFamily: F }}>
          Wasel Support • Expected response 2 hours • Safety issues: immediate
        </p>
      </div>
    </PageShell>
  );
}

export default SupportPage;