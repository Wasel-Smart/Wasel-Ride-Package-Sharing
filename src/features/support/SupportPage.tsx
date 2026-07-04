import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
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
  MetricCard,
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { WaselButton } from '../../components/wasel-ui/WaselButton';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  getSmsSupportUrl,
  getSupportEmailUrl,
  getSupportPhoneUrl,
  getWhatsAppSupportUrl,
} from '../../utils/env';
import { C, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';

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

const responsePath = [
  'Open the support channel and include the route, package, wallet, or account context.',
  'Wasel keeps the issue attached to the relevant movement record where possible.',
  'Safety, access, and payment issues get priority over general product questions.',
  'If the issue depends on verification, the next trust step is surfaced before resolution.',
] as const;

const FAQ_ITEMS = [
  { q: 'How do I cancel a booking?', a: 'Open My Trips, find the active booking, and tap Cancel. Refunds appear within 3-5 business days.' },
  { q: 'Where is my package?', a: 'Track in real-time from Packages. Each handoff updates with GPS coordinates and timestamps.' },
  { q: 'Why is my wallet frozen?', a: 'Wallet may be frozen for verification or compliance. Check Trust Center for specific reason.' },
  { q: 'How does pricing work?', a: 'Prices are shown before booking. Shared rides split costs, packages add a small fee for handling.' },
  { q: 'What if my driver cancels?', a: 'Open support immediately - we will rebook you and credit your account for the inconvenience.' },
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
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  href: string;
  accent: string;
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
        <span style={{ color: C.text, fontWeight: TYPE.weight.black }}>{label}</span>
        <span style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.5 }}>
          {disabled ? 'Not configured in this environment.' : detail}
        </span>
      </span>
    </a>
  );
}

export function SupportPage() {
  const { dir } = useLanguage();
  const nav = useIframeSafeNavigate();
  const emailUrl = getSupportEmailUrl('Wasel support request');
  const smsUrl = getSmsSupportUrl('Hi Wasel support team');
  const whatsappUrl = getWhatsAppSupportUrl('Hi Wasel support team');
  const phoneUrl = getSupportPhoneUrl();

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
              <WaselLogo size={42} theme="light" variant="full" />
              <StatusBadge label="Rides, parcels, wallet, account, and safety" accent={C.blueLight} />
              <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7 }}>
                For urgent safety concerns, use the in-app SOS flow or your local emergency number
                first, then open Wasel support with the trip context.
              </div>
            </div>
          }
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: SPACE[6],
          }}
        >
          <MetricCard
            label="Support scope"
            value="5 areas"
            detail="Routes, packages, wallet, account, and safety escalation."
            accent={C.blueLight}
            icon={<HelpCircle size={18} />}
          />
          <MetricCard
            label="Context"
            value="Attached"
            detail="Issues should stay linked to the relevant record."
            accent={C.cyan}
            icon={<Route size={18} />}
          />
          <MetricCard
            label="Priority"
            value="Safety"
            detail="Safety, access, and payment issues come first."
            accent={C.green}
            icon={<AlertCircle size={18} />}
          />
          <MetricCard
            label="Channels"
            value="4"
            detail="Email, SMS, WhatsApp, and phone when configured."
            accent={C.gold}
            icon={<MessageCircle size={18} />}
          />
        </div>

        <SectionCard
          title="Contact Channels"
          subtitle="Use the channel that matches the urgency and the device you are on."
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
              label="Email support"
              detail="Best for non-urgent issues with detail."
              href={emailUrl}
              accent={C.cyan}
            />
            <SupportChannel
              icon={<MessageCircle size={18} />}
              label="WhatsApp support"
              detail="Best for quick route or handoff updates."
              href={whatsappUrl}
              accent={C.green}
            />
            <SupportChannel
              icon={<Phone size={18} />}
              label="Call support"
              detail="Best for urgent account or movement escalation."
              href={phoneUrl}
              accent={C.gold}
            />
            <SupportChannel
              icon={<MessageCircle size={18} />}
              label="SMS support"
              detail="Best when mobile data is limited."
              href={smsUrl}
              accent={C.blueLight}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="What We Can Help With"
          subtitle="Support topics are grouped by product outcome so users can choose quickly."
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
                    <div style={{ color: C.text, fontWeight: TYPE.weight.black }}>{topic.title}</div>
                  </div>
                  <div style={{ marginTop: SPACE[3], color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7 }}>
                    {topic.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Escalation Path"
          subtitle="A support page should reduce uncertainty after something goes wrong."
          icon={<AlertCircle size={18} color={C.gold} />}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {responsePath.map((step, index) => (
              <div
                key={step}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px minmax(0, 1fr)',
                  gap: 12,
                  alignItems: 'center',
                  borderRadius: R.xl,
                  border: `1px solid ${C.borderFaint}`,
                  background: C.elevated,
                  padding: `${SPACE[3]} ${SPACE[4]}`,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: R.lg,
                    display: 'grid',
                    placeItems: 'center',
                    color: C.blueLight,
                    background: `${C.blueLight}14`,
                    border: `1px solid ${C.blueLight}24`,
                    fontWeight: TYPE.weight.black,
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ color: C.text, fontSize: TYPE.size.sm, lineHeight: 1.65 }}>
                  {step}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Quick FAQ"
          subtitle="Common questions answered instantly."
          icon={<HelpCircle size={18} color={C.orange} />}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {FAQ_ITEMS.map((item, idx) => {
              const [open, setOpen] = useState(false);
              return (
                <div
                  key={idx}
                  style={{
                    borderRadius: R.xl,
                    border: `1px solid ${C.borderFaint}`,
                    background: C.elevated,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setOpen(!open)}
                    style={{
                      width: '100%',
                      padding: `${SPACE[4]} ${SPACE[4]}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'transparent',
                      border: 'none',
                      color: C.text,
                      fontFamily: TYPE.family.sans,
                      fontSize: TYPE.size.base,
                      fontWeight: TYPE.weight.bold,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ textAlign: 'left' }}>{item.q}</span>
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
                      }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Send us a message"
          subtitle="We will answer within 2 hours during business hours."
          icon={<Send size={18} color={C.cyan} />}
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              window.location.href = emailUrl;
            }}
            style={{ display: 'grid', gap: 12 }}
          >
            <input
              required
              placeholder="Your email"
              style={{
                width: '100%',
                height: 46,
                padding: '0 14px',
                borderRadius: R.lg,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.text,
                fontFamily: TYPE.family.sans,
              }}
            />
            <select
              required
              defaultValue=""
              style={{
                width: '100%',
                height: 46,
                padding: '0 14px',
                borderRadius: R.lg,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.text,
                fontFamily: TYPE.family.sans,
              }}
            >
              <option value="" disabled>
                Topic
              </option>
              <option>Ride issue</option>
              <option>Package issue</option>
              <option>Wallet question</option>
              <option>Account access</option>
              <option>Driver verification</option>
            </select>
            <textarea
              required
              placeholder="How can we help?"
              rows={4}
              style={{
                width: '100%',
                minHeight: 110,
                padding: 14,
                borderRadius: R.lg,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.text,
                fontFamily: TYPE.family.sans,
                resize: 'vertical',
              }}
            />
            <WaselButton type="submit" variant="primary">
              Send message
            </WaselButton>
          </form>
        </SectionCard>

        <p
          style={{
            textAlign: 'center',
            color: C.textDim,
            fontSize: TYPE.size.xs,
            marginTop: SPACE[6],
          }}
        >
          Wasel Support • Expected response 2 hours • Safety issues: immediate
        </p>
      </div>
    </PageShell>
  );
}

export default SupportPage;
