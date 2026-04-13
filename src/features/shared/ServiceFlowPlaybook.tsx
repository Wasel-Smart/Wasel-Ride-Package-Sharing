import { useEffect, useState } from 'react';
import { DS, pill, r } from './pageShared';

export type ServiceFlowKey =
  | 'find-ride'
  | 'share-ride'
  | 'send-package'
  | 'deliver-package'
  | 'bus'
  | 'returns';

type FlowRole = {
  label: string;
  detail: string;
};

type FlowStep = {
  title: string;
  detail: string;
};

type StatusRow = {
  status: string;
  updateSource: string;
  notified: string;
  pickupVisibility: string;
  communication: string;
};

type ServiceFlowConfig = {
  label: string;
  shortLabel: string;
  accent: string;
  summary: string;
  roles: FlowRole[];
  steps: FlowStep[];
  statuses: StatusRow[];
};

const SERVICE_ORDER: ServiceFlowKey[] = [
  'find-ride',
  'share-ride',
  'send-package',
  'deliver-package',
  'bus',
  'returns',
];

const SERVICE_FLOW_COPY: Record<ServiceFlowKey, ServiceFlowConfig> = {
  'find-ride': {
    label: 'Find Ride',
    shortLabel: 'Ride',
    accent: DS.cyan,
    summary:
      'A passenger searches a corridor, sends a booking request, and only boards after the system confirms the pickup station, time, and captain response.',
    roles: [
      {
        label: 'Passenger',
        detail: 'Chooses the route, reviews the pickup point, and receives reminders and live arrival updates.',
      },
      {
        label: 'Driver',
        detail: 'Accepts or rejects the request, then updates arrival, boarding, and trip completion inside the app.',
      },
      {
        label: 'System',
        detail: 'Owns the source of truth for request status, pickup station, reminders, and post-trip receipt.',
      },
    ],
    steps: [
      {
        title: 'Search and select a route',
        detail: 'Passenger chooses corridor, date, and preferred departure from the available route inventory.',
      },
      {
        title: 'Booking request is created',
        detail: 'The app sends the request to the selected driver and immediately confirms to the passenger that it is pending.',
      },
      {
        title: 'Driver approves or rejects',
        detail: 'If approved, the system promotes the request to confirmed and locks the route details into the trip card.',
      },
      {
        title: 'Pickup station becomes official',
        detail: 'Pickup node, time, booking code, driver name, and vehicle details appear in the booking view and reminder messages.',
      },
      {
        title: 'Driver marks arrived',
        detail: 'Arrival status triggers a passenger alert with the same pickup station, ETA, and contact tools.',
      },
      {
        title: 'Boarding and completion',
        detail: 'Driver marks boarded and completed, and the system closes the trip with a receipt and rating prompt.',
      },
    ],
    statuses: [
      {
        status: 'Request sent',
        updateSource: 'Passenger action creates the request.',
        notified: 'System informs passenger immediately and opens the request for the driver.',
        pickupVisibility: 'Proposed pickup node is visible in the request preview.',
        communication: 'No direct chat yet. Only system confirmation and request status.',
      },
      {
        status: 'Accepted',
        updateSource: 'Driver approves the booking.',
        notified: 'System alerts passenger and driver that the trip is confirmed.',
        pickupVisibility:
          'Pickup station, departure time, route code, and driver details appear in the trip page, push, and reminder surface.',
        communication: 'In-app chat opens. Masked call is enabled for urgent coordination.',
      },
      {
        status: 'Driver arrived',
        updateSource: 'Driver marks arrived.',
        notified: 'System sends an arrival alert to the passenger.',
        pickupVisibility: 'Exact pickup station remains pinned in the live trip card and map.',
        communication: 'Chat and masked call stay available until boarding is confirmed.',
      },
      {
        status: 'Boarded',
        updateSource: 'Driver confirms passenger pickup.',
        notified: 'System updates passenger and trip history.',
        pickupVisibility: 'Pickup is archived in the live timeline and replaced by trip progress.',
        communication: 'Routine updates stay inside the app; support is the fallback if something goes wrong.',
      },
      {
        status: 'Completed',
        updateSource: 'Driver or system closes the trip.',
        notified: 'System sends receipt, rating, and support options to both sides.',
        pickupVisibility: 'Full route and pickup record remain in the trip log.',
        communication: 'Normal user-to-user contact closes, support channel remains open.',
      },
    ],
  },
  'share-ride': {
    label: 'Share Ride',
    shortLabel: 'Supply',
    accent: DS.gold,
    summary:
      'A driver offers a corridor route, reviews incoming bookings, and manages one shared communication stream for riders and optional package requests.',
    roles: [
      {
        label: 'Driver',
        detail: 'Publishes seats, approves requests, and updates arrival, boarding, and trip completion.',
      },
      {
        label: 'Passenger or sender',
        detail: 'Sends a booking request and only sees final pickup details after approval.',
      },
      {
        label: 'System',
        detail: 'Lists the route, funnels requests to the driver, and standardizes every confirmation and reminder.',
      },
    ],
    steps: [
      {
        title: 'Driver posts the route',
        detail: 'Route, seats, date, pricing, and package readiness are published to the Wasel network.',
      },
      {
        title: 'Requests start arriving',
        detail: 'Passengers and eligible package senders can attach themselves to this route.',
      },
      {
        title: 'Driver reviews each request',
        detail: 'The driver accepts or rejects based on trust readiness, seat count, and route plan.',
      },
      {
        title: 'System confirms the final handoff plan',
        detail: 'Approved users receive pickup station, departure time, and route code without manual driver messaging.',
      },
      {
        title: 'Driver runs the live trip',
        detail: 'Arrival, boarding, package collection, and completion are recorded inside the operating flow.',
      },
      {
        title: 'Trip and earnings close',
        detail: 'Completed rides feed the trip log, receipts, and later earnings or rating flows.',
      },
    ],
    statuses: [
      {
        status: 'Route live',
        updateSource: 'Driver posts a route.',
        notified: 'System confirms to the driver and exposes the route to eligible riders and senders.',
        pickupVisibility: 'Default pickup node is shown in the route card before any request is approved.',
        communication: 'No direct conversation until a request exists.',
      },
      {
        status: 'Request received',
        updateSource: 'Passenger or sender applies to the route.',
        notified: 'System alerts the driver and shows pending status to the requester.',
        pickupVisibility: 'The requester sees the draft pickup idea, not the final handoff state.',
        communication: 'System-only notifications keep the queue organized.',
      },
      {
        status: 'Approved',
        updateSource: 'Driver accepts the request.',
        notified: 'System confirms approval to all involved users.',
        pickupVisibility: 'Final pickup station, timing window, and route code become visible in booking details.',
        communication: 'In-app chat opens and urgent call masking becomes available.',
      },
      {
        status: 'In live handoff',
        updateSource: 'Driver marks arrived, boarded, or collected.',
        notified: 'System forwards those state changes to the right passenger or sender.',
        pickupVisibility: 'Live handoff card keeps the pickup station and arrival time visible until completion.',
        communication: 'Short operational messages only. Support handles disputes or safety flags.',
      },
      {
        status: 'Closed',
        updateSource: 'Driver finishes the route.',
        notified: 'System sends completion, receipts, and follow-up prompts.',
        pickupVisibility: 'Stations stay in the trip log for audit and support.',
        communication: 'User-to-user channel closes with the route.',
      },
    ],
  },
  'send-package': {
    label: 'Send Package',
    shortLabel: 'Send',
    accent: DS.green,
    summary:
      'The sender creates a package request, the system finds a package-ready route, and pickup and delivery communication stays inside one tracked lifecycle.',
    roles: [
      {
        label: 'Sender',
        detail: 'Creates the package, shares receiver details, and confirms handoff readiness at pickup.',
      },
      {
        label: 'Courier or route captain',
        detail: 'Accepts the package job and updates arrived, collected, and delivered states.',
      },
      {
        label: 'Receiver',
        detail: 'Gets delivery awareness, arrival heads-up, and final confirmation for the package.',
      },
      {
        label: 'System',
        detail: 'Tracks the package ID, notifies everyone, and keeps pickup and drop-off stations consistent.',
      },
    ],
    steps: [
      {
        title: 'Sender creates the package request',
        detail: 'Pickup station, drop-off station, receiver details, and package note are saved with a tracking ID.',
      },
      {
        title: 'Route or courier match is created',
        detail: 'The platform finds a package-ready ride or holds the request until one becomes available.',
      },
      {
        title: 'System confirms the handoff plan',
        detail: 'Once matched, the sender sees the responsible captain, pickup station, timing window, and tracking state.',
      },
      {
        title: 'Courier arrives and collects',
        detail: 'Collection changes are recorded in-app so the sender does not have to guess whether pickup happened.',
      },
      {
        title: 'Receiver gets delivery heads-up',
        detail: 'The app shares arrival and delivery status with the receiver when the package is approaching.',
      },
      {
        title: 'Delivery is confirmed',
        detail: 'Final confirmation closes the package with a traceable handoff history.',
      },
    ],
    statuses: [
      {
        status: 'Request created',
        updateSource: 'Sender submits the package form.',
        notified: 'System confirms to the sender and starts route matching.',
        pickupVisibility: 'Pickup and drop-off stations are stored in the tracking page immediately.',
        communication: 'System-only until a route or courier is assigned.',
      },
      {
        status: 'Matched',
        updateSource: 'System or courier accepts the package.',
        notified: 'System alerts sender and, when available, receiver and courier.',
        pickupVisibility: 'Pickup station, drop-off station, courier details, and tracking code are fully visible.',
        communication: 'In-app chat opens for sender and courier; masked call is enabled for urgent handoff issues.',
      },
      {
        status: 'Courier arrived',
        updateSource: 'Courier marks arrival at pickup.',
        notified: 'System notifies the sender that pickup is ready.',
        pickupVisibility: 'Pickup station stays pinned with arrival timing and handoff note.',
        communication: 'Chat remains primary. Call is reserved for immediate coordination.',
      },
      {
        status: 'Collected / in transit',
        updateSource: 'Courier confirms collection.',
        notified: 'System informs sender and updates the receiver-facing tracking state.',
        pickupVisibility: 'Pickup becomes part of the package timeline and drop-off becomes the next visible station.',
        communication: 'Routine progress is system-driven; users only contact each other if the route changes.',
      },
      {
        status: 'Delivered',
        updateSource: 'Courier confirms delivery.',
        notified: 'System sends delivery confirmation to sender and receiver.',
        pickupVisibility: 'Both pickup and drop-off records remain in the package history.',
        communication: 'User chat closes, support remains available for proof or issue handling.',
      },
    ],
  },
  'deliver-package': {
    label: 'Deliver Package',
    shortLabel: 'Deliver',
    accent: DS.gold,
    summary:
      'From the carrier side, package delivery is an operational queue: accept the job, follow the app-defined station plan, confirm handoffs, and let the system update everyone else.',
    roles: [
      {
        label: 'Courier or route captain',
        detail: 'Owns acceptance, arrival, collection, transit, and delivery confirmations.',
      },
      {
        label: 'Sender',
        detail: 'Hands over the package only after the app shows the approved pickup and courier details.',
      },
      {
        label: 'Receiver',
        detail: 'Prepares for drop-off after the system signals that delivery is approaching.',
      },
      {
        label: 'System',
        detail: 'Broadcasts every state transition so the courier never has to manually update all parties.',
      },
    ],
    steps: [
      {
        title: 'Carrier opens the delivery queue',
        detail: 'Available package jobs appear with route, size, and station information.',
      },
      {
        title: 'Carrier accepts the job',
        detail: 'Acceptance locks the job to the carrier and triggers sender and receiver notifications.',
      },
      {
        title: 'Pickup station guidance is enforced',
        detail: 'The app shows where to collect, what code or tracking ID to use, and who to meet.',
      },
      {
        title: 'Collection is confirmed',
        detail: 'Once the package is in custody, sender and receiver see in-transit status without extra manual messaging.',
      },
      {
        title: 'Drop-off approach is announced',
        detail: 'Receiver receives a heads-up before final arrival and delivery confirmation.',
      },
      {
        title: 'Proof of delivery closes the job',
        detail: 'The system records delivery confirmation and opens support only if needed.',
      },
    ],
    statuses: [
      {
        status: 'Job available',
        updateSource: 'Sender request reaches the carrier pool.',
        notified: 'System shows it to eligible carriers and keeps the sender in matching mode.',
        pickupVisibility: 'Pickup and drop-off stations are visible to the carrier before acceptance.',
        communication: 'No direct user contact yet.',
      },
      {
        status: 'Job accepted',
        updateSource: 'Carrier takes the job.',
        notified: 'System informs sender, carrier, and optionally receiver.',
        pickupVisibility: 'Stations, timing window, handoff code, and contact details are all unlocked.',
        communication: 'Chat opens immediately, urgent masked calls are available.',
      },
      {
        status: 'At pickup',
        updateSource: 'Carrier marks arrived.',
        notified: 'System tells the sender the carrier is ready.',
        pickupVisibility: 'Pickup station remains the active station on the tracking page.',
        communication: 'Short operational chat or call if the sender cannot find the carrier.',
      },
      {
        status: 'At drop-off',
        updateSource: 'Carrier marks approaching or arrived at delivery.',
        notified: 'System alerts the receiver and keeps the sender informed.',
        pickupVisibility: 'Drop-off station replaces pickup as the active station in the live view.',
        communication: 'Receiver and carrier can coordinate via app chat or masked call.',
      },
      {
        status: 'Proof complete',
        updateSource: 'Carrier confirms delivery.',
        notified: 'System closes the loop for sender and receiver.',
        pickupVisibility: 'Complete station history remains available in support and tracking.',
        communication: 'Direct channel ends; support owns post-delivery exceptions.',
      },
    ],
  },
  bus: {
    label: 'Bus',
    shortLabel: 'Bus',
    accent: DS.cyan,
    summary:
      'Bus communication is more structured than peer rides: the system confirms the seat, ticket code, boarding stop, and schedule updates directly from the route contract.',
    roles: [
      {
        label: 'Passenger',
        detail: 'Chooses route, date, departure, and seat count, then follows the boarding station and ticket instructions.',
      },
      {
        label: 'Operator',
        detail: 'Provides the schedule source and any service-level changes or delays.',
      },
      {
        label: 'System',
        detail: 'Issues the ticket, shares boarding stop, and pushes any schedule or support updates.',
      },
    ],
    steps: [
      {
        title: 'Passenger chooses a coach route',
        detail: 'The app shows schedule, operator, fare, and pickup stop before booking.',
      },
      {
        title: 'Seat reservation is submitted',
        detail: 'Seat count, departure time, and preference are attached to the booking request.',
      },
      {
        title: 'Ticket is issued',
        detail: 'The system confirms the seat with ticket code, route, pickup stop, and travel time.',
      },
      {
        title: 'Boarding reminder is sent',
        detail: 'Before departure, the rider sees the boarding station, ticket code, and updated schedule state.',
      },
      {
        title: 'Operator or system handles service changes',
        detail: 'If the departure changes, the system updates the passenger instead of leaving the information in chat.',
      },
      {
        title: 'Boarding and trip completion',
        detail: 'Boarding succeeds against the issued ticket and the trip closes in the rider history.',
      },
    ],
    statuses: [
      {
        status: 'Seat reserved',
        updateSource: 'Passenger confirms checkout.',
        notified: 'System confirms the booking to the passenger.',
        pickupVisibility: 'Boarding stop, route, departure time, and ticket code appear immediately.',
        communication: 'Mostly system-to-passenger. Support is available if the schedule looks wrong.',
      },
      {
        status: 'Ticket issued',
        updateSource: 'Booking contract is created.',
        notified: 'System persists the seat and can notify support or operator-facing systems as needed.',
        pickupVisibility: 'Boarding station is repeated in the ticket card and reminder path.',
        communication: 'No rider-to-operator chat by default; structured alerts are preferred.',
      },
      {
        status: 'Boarding soon',
        updateSource: 'Schedule window reaches the reminder threshold.',
        notified: 'System sends the passenger a departure reminder.',
        pickupVisibility: 'Boarding stop stays front and center in the trip card and notification.',
        communication: 'Support call is the fallback if the coach or stop is hard to locate.',
      },
      {
        status: 'Schedule changed',
        updateSource: 'Operator or live feed updates the departure.',
        notified: 'System pushes the new departure state to the passenger.',
        pickupVisibility: 'New stop or timing replaces the old one in all official surfaces.',
        communication: 'System alerts first. Support only if the rider needs intervention.',
      },
      {
        status: 'Completed',
        updateSource: 'Trip reaches arrival or closes operationally.',
        notified: 'System updates trip history and receipt state.',
        pickupVisibility: 'Boarding and destination remain available in the archived trip record.',
        communication: 'Follow-up goes through support or rating flow.',
      },
    ],
  },
  returns: {
    label: 'Raje3 Returns',
    shortLabel: 'Returns',
    accent: DS.gold,
    summary:
      'Returns behave like guided package delivery: the customer starts a return, the system searches the movement network, and every handoff is tracked under one return ID.',
    roles: [
      {
        label: 'Customer',
        detail: 'Submits retailer, item, and return reason, then follows the return ID through pickup and handback.',
      },
      {
        label: 'Carrier',
        detail: 'Accepts the return movement, collects the item, and confirms drop-off or retailer handback.',
      },
      {
        label: 'System',
        detail: 'Matches return demand to live routes and keeps the customer informed even while waiting for a match.',
      },
    ],
    steps: [
      {
        title: 'Customer creates the return',
        detail: 'Retailer, order ID, item description, and return reason are stored in one request.',
      },
      {
        title: 'System searches the route network',
        detail: 'If no live match exists, the return remains visible in searching mode instead of disappearing.',
      },
      {
        title: 'Return is matched to a ride',
        detail: 'Customer receives the approved pickup plan and return tracking state.',
      },
      {
        title: 'Carrier collects the item',
        detail: 'Collection is confirmed in the app so the customer does not have to message for proof.',
      },
      {
        title: 'Retailer handback is completed',
        detail: 'The return reaches its destination and the tracking state closes with a complete audit trail.',
      },
    ],
    statuses: [
      {
        status: 'Return created',
        updateSource: 'Customer submits the return.',
        notified: 'System confirms the return ID and current matching state.',
        pickupVisibility: 'Origin and return destination are visible in the return record.',
        communication: 'System-led only until a match exists.',
      },
      {
        status: 'Matched',
        updateSource: 'System links the return to a live route.',
        notified: 'System tells the customer and assigned carrier.',
        pickupVisibility: 'Pickup station, route, carrier, and tracking state become visible.',
        communication: 'In-app chat opens for operational coordination if needed.',
      },
      {
        status: 'Collected',
        updateSource: 'Carrier confirms the return pickup.',
        notified: 'System updates the customer immediately.',
        pickupVisibility: 'Pickup station moves into the return timeline and destination becomes the active leg.',
        communication: 'Minimal direct contact unless the route changes.',
      },
      {
        status: 'Handed back',
        updateSource: 'Carrier confirms retailer handoff.',
        notified: 'System closes the return for the customer.',
        pickupVisibility: 'Pickup and final handback remain visible in return history.',
        communication: 'Support handles disputes after closure.',
      },
    ],
  },
};

const GLOBAL_RULES = [
  {
    title: 'Source of truth',
    detail:
      'Pickup stations and delivery points must live in the booking details page, tracking page, and reminder notifications. Chat alone is never enough.',
  },
  {
    title: 'Channel order',
    detail:
      'Use system notifications first, in-app chat second, masked calling only for urgent handoff issues, and support escalation for anything risky or disputed.',
  },
  {
    title: 'Pickup proof',
    detail:
      'Every confirmed handoff should show station name, time window, route or tracking code, and the responsible driver or courier identity.',
  },
  {
    title: 'Audit trail',
    detail:
      'Accepted, arrived, boarded, collected, delivered, and completed statuses should always be written to the activity log for support and trust review.',
  },
];

type ServiceFlowPlaybookProps = {
  focusService?: ServiceFlowKey;
  title?: string;
  subtitle?: string;
};

export function ServiceFlowPlaybook({
  focusService = 'find-ride',
  title = 'Service Flow and Communication Matrix',
  subtitle = 'Who informs who, when pickup stations become visible, and which communication channel the app should use from request to completion.',
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
        background: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))`,
        border: `1px solid ${DS.border}`,
        borderRadius: r(24),
        padding: 22,
        boxShadow: '0 20px 44px rgba(0,0,0,0.18)',
        contentVisibility: 'auto',
        containIntrinsicSize: '960px',
      }}
    >
      <style>{`
        @media (max-width: 899px) {
          .sf-2col,
          .sf-3col {
            grid-template-columns: 1fr !important;
          }
          .sf-4col {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 540px) {
          .sf-4col {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <div style={{ ...pill(active.accent), marginBottom: 10 }}>{active.label} workflow</div>
          <h2
            style={{
              color: '#fff',
              fontWeight: 900,
              fontSize: '1.08rem',
              letterSpacing: '-0.02em',
              margin: '0 0 8px',
            }}
          >
            {title}
          </h2>
          <p style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.7, margin: 0 }}>{subtitle}</p>
        </div>

        <div style={{ maxWidth: 360, color: DS.sub, fontSize: '0.78rem', lineHeight: 1.65 }}>
          {active.summary}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {SERVICE_ORDER.map((serviceKey) => {
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
                borderRadius: '999px',
                border: `1px solid ${selected ? service.accent : DS.border}`,
                background: selected ? `${service.accent}16` : DS.card2,
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: selected ? `0 10px 24px ${service.accent}16` : 'none',
              }}
            >
              {service.shortLabel}
            </button>
          );
        })}
      </div>

      <div className="sf-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
        {active.roles.map((role) => (
          <div
            key={role.label}
            style={{
              background: DS.card2,
              border: `1px solid ${DS.border}`,
              borderRadius: r(18),
              padding: '16px 16px 14px',
            }}
          >
            <div style={{ color: active.accent, fontWeight: 900, fontSize: '0.75rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {role.label}
            </div>
            <div style={{ color: '#fff', fontSize: '0.8rem', lineHeight: 1.65 }}>{role.detail}</div>
          </div>
        ))}
      </div>

      <div className="sf-2col" style={{ display: 'grid', gridTemplateColumns: '1.02fr 1.18fr', gap: 16 }}>
        <div
          style={{
            background: DS.card,
            border: `1px solid ${DS.border}`,
            borderRadius: r(20),
            padding: '18px 18px 16px',
          }}
        >
          <div style={{ color: '#fff', fontWeight: 900, marginBottom: 12 }}>Flowchart in steps</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {active.steps.map((step, index) => (
              <div
                key={step.title}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px minmax(0, 1fr)',
                  gap: 12,
                  alignItems: 'start',
                  background: DS.card2,
                  border: `1px solid ${DS.border}`,
                  borderRadius: r(16),
                  padding: '14px 14px',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: r(14),
                    background: `${active.accent}14`,
                    border: `1px solid ${active.accent}28`,
                    color: active.accent,
                    fontWeight: 900,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>{step.title}</div>
                  <div style={{ color: DS.sub, fontSize: '0.78rem', lineHeight: 1.6 }}>{step.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: DS.card,
            border: `1px solid ${DS.border}`,
            borderRadius: r(20),
            padding: '18px 18px 16px',
          }}
        >
          <div style={{ color: '#fff', fontWeight: 900, marginBottom: 12 }}>Status matrix</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {active.statuses.map((row) => (
              <div
                key={row.status}
                style={{
                  background: DS.card2,
                  border: `1px solid ${DS.border}`,
                  borderRadius: r(16),
                  padding: '14px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ ...pill(active.accent), fontSize: '0.64rem' }}>{row.status}</span>
                  <span style={{ color: DS.muted, fontSize: '0.72rem', fontWeight: 700 }}>Operational update</span>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    ['Who updates it', row.updateSource],
                    ['Who gets informed', row.notified],
                    ['Pickup / drop-off visibility', row.pickupVisibility],
                    ['How they communicate', row.communication],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ color: DS.muted, fontSize: '0.68rem', fontWeight: 800, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {label}
                      </div>
                      <div style={{ color: '#fff', fontSize: '0.78rem', lineHeight: 1.6 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sf-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 18 }}>
        {GLOBAL_RULES.map((rule) => (
          <div
            key={rule.title}
            style={{
              background: DS.card2,
              border: `1px solid ${DS.border}`,
              borderRadius: r(18),
              padding: '16px 16px 14px',
            }}
          >
            <div style={{ color: active.accent, fontWeight: 900, fontSize: '0.76rem', marginBottom: 8 }}>{rule.title}</div>
            <div style={{ color: DS.sub, fontSize: '0.76rem', lineHeight: 1.65 }}>{rule.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ServiceFlowPlaybook;
