import { useEffect, useState } from 'react';
import { DS, pill, r } from './pageShared';
import { C, R, SH } from '../../utils/wasel-ds';

export type ServiceFlowKey =
  | 'find-ride'
  | 'share-ride'
  | 'send-package'
  | 'deliver-package'
  | 'bus'
  | 'returns';

type Step = {
  title: string;
  detail: string;
};

type FlowCard = {
  label: string;
  shortLabel: string;
  accent: string;
  summary: string;
  steps: Step[];
  notes: string[];
};

const SERVICE_ORDER: ServiceFlowKey[] = [
  'find-ride',
  'share-ride',
  'send-package',
  'deliver-package',
  'bus',
  'returns',
];

const SERVICE_FLOW_COPY: Record<ServiceFlowKey, FlowCard> = {
  'find-ride': {
    label: 'Find Ride',
    shortLabel: 'Ride',
    accent: DS.cyan,
    summary: 'Search a route, confirm the driver, and keep pickup details in one clear trip flow.',
    steps: [
      { title: 'Search', detail: 'Pick the route, date, and best live departure.' },
      {
        title: 'Confirm',
        detail: 'Once approved, the app locks the driver, pickup point, and fare.',
      },
      {
        title: 'Board',
        detail: 'Arrival, boarding, and trip completion stay visible in the same trip card.',
      },
    ],
    notes: [
      'Pickup details should be visible in the trip view, not buried in chat.',
      'The app should confirm status changes before the rider has to ask.',
      'Support stays available if the route changes or the pickup becomes unclear.',
    ],
  },
  'share-ride': {
    label: 'Offer Ride',
    shortLabel: 'Driver',
    accent: DS.gold,
    summary:
      'Post the route once, review incoming requests, and keep riders and package senders in one simple queue.',
    steps: [
      { title: 'Post', detail: 'Publish seats, timing, and optional package space.' },
      {
        title: 'Approve',
        detail: 'Accept the strongest requests and let the app send the final handoff plan.',
      },
      {
        title: 'Run trip',
        detail: 'Arrival, boarding, and completion are tracked in the same route flow.',
      },
    ],
    notes: [
      'Drivers should not have to manually repeat route details after approval.',
      'Trust checks should block risky actions before the route goes live.',
      'A strong route should show fare guidance and demand signals early.',
    ],
  },
  'send-package': {
    label: 'Send Package',
    shortLabel: 'Send',
    accent: DS.green,
    summary:
      'Create the parcel once, match it to a trusted route, and keep the sender informed from pickup to delivery.',
    steps: [
      {
        title: 'Create request',
        detail: 'Save pickup, destination, and receiver details with one tracking ID.',
      },
      {
        title: 'Match route',
        detail: 'Attach the parcel to a package-ready driver or the next trusted lane.',
      },
      { title: 'Deliver', detail: 'Pickup, transit, and drop-off stay visible in one timeline.' },
    ],
    notes: [
      'Tracking should show who has the parcel and what happens next.',
      'Pickup and drop-off should stay visible without extra back-and-forth.',
      'Support should have a full handoff trail if delivery goes wrong.',
    ],
  },
  'deliver-package': {
    label: 'Deliver Package',
    shortLabel: 'Deliver',
    accent: DS.gold,
    summary:
      'For the carrier, package delivery is a clear queue: accept, collect, deliver, and let the app update everyone else.',
    steps: [
      {
        title: 'Accept job',
        detail: 'Review the route, size, and handoff details before taking the parcel.',
      },
      {
        title: 'Collect',
        detail: 'Confirm pickup so the sender sees the parcel move into transit.',
      },
      {
        title: 'Close job',
        detail: 'Confirm delivery and keep proof in the final package record.',
      },
    ],
    notes: [
      'Carriers should always see the active station and next handoff clearly.',
      'The sender and receiver should not depend on manual status messages.',
      'Proof of delivery should close the job cleanly.',
    ],
  },
  bus: {
    label: 'Bus',
    shortLabel: 'Bus',
    accent: DS.cyan,
    summary:
      'Bus bookings should feel structured: choose the departure, receive the ticket, and follow the official boarding plan.',
    steps: [
      { title: 'Choose coach', detail: 'Compare official fares, times, and open seats.' },
      {
        title: 'Reserve seat',
        detail: 'Save the departure, boarding stop, and ticket code in one booking flow.',
      },
      {
        title: 'Travel',
        detail: 'Reminders and schedule changes stay visible until the trip ends.',
      },
    ],
    notes: [
      'The boarding stop and ticket code should always be easy to find.',
      'Official schedules should remain visible even when live inventory is missing.',
      'Support is the fallback if the stop or departure becomes unclear.',
    ],
  },
  returns: {
    label: 'Returns',
    shortLabel: 'Returns',
    accent: DS.gold,
    summary:
      'Returns should behave like guided parcel delivery: create once, match to a route, and track the full handback.',
    steps: [
      { title: 'Start return', detail: 'Save retailer, item, and reason in one return request.' },
      {
        title: 'Find route',
        detail: 'Match the return to a live lane or keep it visible while waiting.',
      },
      { title: 'Hand back', detail: 'Collection and final return stay tracked in one record.' },
    ],
    notes: [
      'Returns should never disappear just because no route is available yet.',
      'The customer should see the active route state without extra effort.',
      'Pickup and final handback should stay in the return history for support.',
    ],
  },
};

type ServiceFlowPlaybookProps = {
  focusService?: ServiceFlowKey;
  title?: string;
  subtitle?: string;
};

export function ServiceFlowPlaybook({
  focusService = 'find-ride',
  title = 'How this service works',
  subtitle = 'A quick view of the request, confirmation, and handoff flow.',
}: ServiceFlowPlaybookProps) {
  const [activeService, setActiveService] = useState<ServiceFlowKey>(focusService);

  useEffect(() => {
    setActiveService(focusService);
  }, [focusService]);

  const active = SERVICE_FLOW_COPY[activeService];

  return (
    <section
      style={{
        marginTop: 24,
        background: C.card,
        border: `1px solid ${DS.border}`,
        borderRadius: R.xxl,
        padding: 22,
        boxShadow: SH.card,
      }}
    >
      <style>{`
        @media (max-width: 899px) {
          .sf-steps,
          .sf-notes {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <div style={{ maxWidth: 720 }}>
          <div style={{ ...pill(active.accent), marginBottom: 10 }}>{active.label}</div>
          <div style={{ color: C.text, fontWeight: 900, fontSize: '1.04rem', marginBottom: 8 }}>
            {title}
          </div>
          <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.65 }}>{subtitle}</div>
        </div>
        <div style={{ maxWidth: 340, color: C.textSub, fontSize: '0.84rem', lineHeight: 1.65 }}>
          {active.summary}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {SERVICE_ORDER.map(serviceKey => {
          const service = SERVICE_FLOW_COPY[serviceKey];
          const selected = serviceKey === activeService;

          return (
            <button
              key={serviceKey}
              type="button"
              onClick={() => setActiveService(serviceKey)}
              style={{
                minHeight: 40,
                padding: '0 14px',
                borderRadius: R.full,
                border: `1px solid ${selected ? service.accent : DS.border}`,
                background: selected ? `${service.accent}16` : C.elevated,
                color: C.text,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {service.shortLabel}
            </button>
          );
        })}
      </div>

      <div
        className="sf-steps"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {active.steps.map((step, index) => (
          <div
            key={step.title}
            style={{
              background: DS.card2,
              border: `1px solid ${DS.border}`,
              borderRadius: r(18),
              padding: '16px 16px 14px',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: r(12),
                display: 'grid',
                placeItems: 'center',
                background: `${active.accent}14`,
                border: `1px solid ${active.accent}28`,
                color: active.accent,
                fontWeight: 900,
                marginBottom: 12,
              }}
            >
              {index + 1}
            </div>
            <div style={{ color: C.text, fontWeight: 800, fontSize: '0.84rem', marginBottom: 6 }}>
              {step.title}
            </div>
            <div style={{ color: DS.sub, fontSize: '0.78rem', lineHeight: 1.6 }}>{step.detail}</div>
          </div>
        ))}
      </div>

      <div
        className="sf-notes"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}
      >
        {active.notes.map(note => (
          <div
            key={note}
            style={{
              background: DS.card,
              border: `1px solid ${DS.border}`,
              borderRadius: r(18),
              padding: '15px 16px',
            }}
          >
            <div
              style={{
                color: active.accent,
                fontWeight: 900,
                fontSize: '0.72rem',
                letterSpacing: 0,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Keep clear
            </div>
            <div style={{ color: C.textSub, fontSize: '0.79rem', lineHeight: 1.65 }}>{note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ServiceFlowPlaybook;
