import {
  JORDAN_MOBILITY_NETWORK,
  getRouteBetween,
  type JordanRoute,
} from './jordan-mobility-network';
import { SmartPricingEngine, type SeatPricingModel } from '../utils/pricing/SeatPricing';
import { buildJordanCorridorKey } from '../utils/jordanLocations';

export type MovementLayerId = 'people' | 'goods' | 'services' | 'data';
export type DensityLabel = 'surging' | 'high-frequency' | 'steady' | 'expanding';

export interface MovementLayer {
  id: MovementLayerId;
  title: string;
  summary: string;
  valueLine: string;
}

export interface MarketplaceNode {
  id: 'riders' | 'drivers' | 'businesses' | 'truck-owners' | 'service-providers';
  title: string;
  summary: string;
  moat: string;
}

export interface CorridorOpportunity {
  id: string;
  from: string;
  to: string;
  label: string;
  distanceKm: number;
  durationMin: number;
  density: DensityLabel;
  predictedDemandScore: number;
  sharedPriceJod: number;
  soloReferencePriceJod: number;
  savingsPercent: number;
  driverBoostJod: number;
  attachRatePercent: number;
  fillTargetSeats: number;
  pickupPoints: string[];
  autoGroupWindow: string;
  movementLayers: string[];
  businessDemand: string[];
  intelligenceSignals: string[];
  routeMoat: string;
  subscriptionPriceJod: number;
  priceLadder: SeatPricingModel[];
}

export interface DriverRoutePlan {
  corridor: CorridorOpportunity;
  recommendedSeatPriceJod: number;
  grossWhenFullJod: number;
  emptySeatCostJod: number;
  packageBonusJod: number;
  routeNote: string;
}

type CorridorMeta = {
  demandScore: number;
  density: DensityLabel;
  pickupPoints: string[];
  autoGroupWindow: string;
  movementLayers: string[];
  businessDemand: string[];
  routeMoat: string;
  attachRatePercent: number;
  fillTargetSeats: number;
  intelligenceSignals: string[];
};

const MOVEMENT_LAYERS: MovementLayer[] = [
  {
    id: 'people',
    title: 'People',
    summary: 'Daily commuters, families, students, and intercity travelers move through fixed corridors instead of random one-off requests.',
    valueLine: 'Demand density makes each corridor faster and cheaper to fill.',
  },
  {
    id: 'goods',
    title: 'Goods',
    summary: 'Packages, returns, samples, and urgent handoffs ride on the same live routes already moving through the network.',
    valueLine: 'Goods piggyback on movement instead of opening wasteful empty trips.',
  },
  {
    id: 'services',
    title: 'Services',
    summary: 'Field teams, mobile technicians, and route-based operators can buy recurring capacity on the same infrastructure.',
    valueLine: 'The network becomes a service delivery layer, not only a transport layer.',
  },
  {
    id: 'data',
    title: 'Data',
    summary: 'Demand pulses, pickup point learning, fill-rate behavior, and corridor economics keep making the system smarter.',
    valueLine: 'Every search improves the next route decision.',
  },
];

const MARKETPLACE_NODES: MarketplaceNode[] = [
  {
    id: 'riders',
    title: 'Riders',
    summary: 'Shared-route discovery and automatic grouping bring cheaper trips with less searching.',
    moat: 'Dense rider demand improves every corridor recommendation.',
  },
  {
    id: 'drivers',
    title: 'Drivers',
      summary: 'Drivers offer one corridor route and monetize seats, empty trunk space, and predictable demand.',
    moat: 'Better fill rates make driver earnings harder for generic ride apps to match.',
  },
  {
    id: 'businesses',
    title: 'Businesses',
    summary: 'Corporate movement, returns, staff travel, and light logistics can all run through recurring corridor capacity.',
    moat: 'Recurring B2B volume hardens the best corridors.',
  },
  {
    id: 'truck-owners',
    title: 'Truck owners',
    summary: 'Larger cargo owners can plug into the same demand map when a corridor needs higher-volume movement.',
    moat: 'Multi-vehicle coverage turns Wasel into a real movement exchange.',
  },
  {
    id: 'service-providers',
    title: 'Service providers',
    summary: 'Installers, technicians, and mobile service teams gain a route-aware way to plan jobs and movement together.',
    moat: 'Service demand adds a third layer on top of riders and drivers.',
  },
];

const CORRIDOR_META: Record<string, CorridorMeta> = {
  'amman-irbid': {
    demandScore: 96,
    density: 'surging',
    pickupPoints: ['Abdali transfer gate', 'University north stop', '7th Circle commuter node'],
    autoGroupWindow: 'Group departures every 15 minutes during commute peaks.',
    movementLayers: ['commuters', 'students', 'light parcels', 'field teams'],
    businessDemand: ['university travel', 'staff transport', 'document returns'],
    routeMoat: 'This route teaches Wasel how northern demand shifts by hour, campus calendar, and return flow.',
    attachRatePercent: 62,
    fillTargetSeats: 4,
    intelligenceSignals: [
      'Predict the next shared departure before a rider searches.',
      'Offer the best pickup node instead of free-text pickup chaos.',
      'Move returns on the southbound lane with minimal extra distance.',
    ],
  },
  'amman-zarqa': {
    demandScore: 98,
    density: 'surging',
    pickupPoints: ['Sports City node', 'Industrial gate cluster', 'Zarqa terminal edge'],
    autoGroupWindow: 'Auto-group micro departures every 10 minutes around shift changes.',
    movementLayers: ['workers', 'daily commuters', 'industrial deliveries', 'service crews'],
    businessDemand: ['factory staff transport', 'parts delivery', 'maintenance teams'],
    routeMoat: 'High-frequency commuting lets Wasel learn Jordanian movement cadence faster than any generic ride app.',
    attachRatePercent: 68,
    fillTargetSeats: 4,
    intelligenceSignals: [
      'Detect shift-change surges before they appear in search.',
      'Push the cheapest seat price when the corridor density spikes.',
      'Blend worker transport with same-direction service demand.',
    ],
  },
  'amman-aqaba': {
    demandScore: 88,
    density: 'high-frequency',
    pickupPoints: ['7th Circle launch point', 'Airport road merge', 'Aqaba logistics zone'],
    autoGroupWindow: 'Bundle long-haul travelers into larger departure waves twice each day.',
    movementLayers: ['long-haul travel', 'cargo handoffs', 'tourism', 'service runs'],
    businessDemand: ['port logistics', 'tourism crews', 'sample delivery'],
    routeMoat: 'Wasel can own the long-haul economics by combining riders, logistics, and predictable rest-stop behavior.',
    attachRatePercent: 57,
    fillTargetSeats: 4,
    intelligenceSignals: [
      'Recommend rest-aware pickup timing on long-haul lanes.',
      'Fill empty trunk space with high-value cargo handoffs.',
      'Favor predictable early-booking cohorts to reduce route uncertainty.',
    ],
  },
  'amman-jerash': {
    demandScore: 78,
    density: 'steady',
    pickupPoints: ['North Amman ring', 'Jerash gate', 'festival shuttle node'],
    autoGroupWindow: 'Stack departures in 20-minute grouping windows near leisure peaks.',
    movementLayers: ['tourism', 'families', 'small packages', 'guide services'],
    businessDemand: ['tourism movement', 'guided routes', 'festival support'],
    routeMoat: 'Seasonal demand teaches Wasel when leisure corridors deserve temporary supply boosts.',
    attachRatePercent: 49,
    fillTargetSeats: 3,
    intelligenceSignals: [
      'Match leisure traffic with return parcels in the same corridor.',
      'Forecast weekend peaks before routes sell out.',
      'Keep route price low by filling family-friendly capacity first.',
    ],
  },
  'amman-ajloun': {
    demandScore: 74,
    density: 'steady',
    pickupPoints: ['North bridge node', 'Ajloun forest stop', 'hill connector meetpoint'],
    autoGroupWindow: 'Use route alerts to cluster low-frequency demand into reliable shared trips.',
    movementLayers: ['leisure riders', 'families', 'weekend goods', 'eco-services'],
    businessDemand: ['hospitality staff', 'tourism services', 'maintenance visits'],
    routeMoat: 'Lower-frequency routes become defendable when Wasel knows exactly when to wake demand.',
    attachRatePercent: 44,
    fillTargetSeats: 3,
    intelligenceSignals: [
      'Wake demand with alerts instead of waiting for manual search.',
      'Promote the best pickup point for hilly terrain corridors.',
      'Blend weekend leisure traffic with service appointments.',
    ],
  },
  'amman-madaba': {
    demandScore: 84,
    density: 'high-frequency',
    pickupPoints: ['Airport corridor node', 'Madaba mosaic stop', 'south connector gate'],
    autoGroupWindow: 'Refresh auto-grouping every 12 minutes around airport and city movement.',
    movementLayers: ['commuters', 'airport-linked riders', 'small goods', 'service calls'],
    businessDemand: ['airport transfers', 'field teams', 'local delivery'],
    routeMoat: 'Fast-moving airport-adjacent demand helps Wasel optimize pickup precision and time reliability.',
    attachRatePercent: 52,
    fillTargetSeats: 4,
    intelligenceSignals: [
      'Shift supply toward airport peaks before demand spills over.',
      'Reduce idle seats with same-direction service bookings.',
      'Package delivery rides free on the corridor when seats are already filled.',
    ],
  },
  'amman-karak': {
    demandScore: 72,
    density: 'steady',
    pickupPoints: ['South Amman edge', 'Mujib connector', 'Karak city gate'],
    autoGroupWindow: 'Offer guided grouping for morning and late-afternoon corridor waves.',
    movementLayers: ['students', 'family movement', 'returns', 'field services'],
    businessDemand: ['education travel', 'document returns', 'mobile technicians'],
    routeMoat: 'This route compounds intelligence around mid-range intercity movement and same-day returns.',
    attachRatePercent: 46,
    fillTargetSeats: 3,
    intelligenceSignals: [
      'Spot same-day return demand before it becomes churn.',
      'Tie ride grouping to school and university movement.',
      'Push parcel attach offers only when route density is healthy.',
    ],
  },
  'amman-tafila': {
    demandScore: 58,
    density: 'expanding',
    pickupPoints: ['South hub launcher', 'Tafila ridge node', 'return match point'],
    autoGroupWindow: 'Use demand alerts to create departures only when route confidence is high.',
    movementLayers: ['regional riders', 'small cargo', 'maintenance visits', 'service circuits'],
    businessDemand: ['public service travel', 'equipment runs', 'returns'],
    routeMoat: 'Emerging routes become defensible when Wasel accumulates more route-confidence data than anyone else.',
    attachRatePercent: 36,
    fillTargetSeats: 3,
    intelligenceSignals: [
      'Turn waitlist demand into predicted launch windows.',
      'Show confidence before a driver opens supply.',
      'Use goods demand to support weaker passenger density.',
    ],
  },
  'amman-maan': {
    demandScore: 64,
    density: 'expanding',
    pickupPoints: ['Desert highway launch', 'Maan service stop', 'southern merge point'],
    autoGroupWindow: 'Prioritize scheduled shared waves with long-haul pickup discipline.',
    movementLayers: ['long-haul riders', 'cargo', 'service crews', 'regional commerce'],
    businessDemand: ['southern service circuits', 'commercial samples', 'document transport'],
    routeMoat: 'Mixed rider and cargo demand makes this corridor a strong logistics-learning lane.',
    attachRatePercent: 41,
    fillTargetSeats: 4,
    intelligenceSignals: [
      'Balance long-haul certainty against price sensitivity.',
      'Use cargo handoffs to de-risk low-density departures.',
      'Promote trusted pickup nodes on longer southern lanes.',
    ],
  },
  'irbid-zarqa': {
    demandScore: 81,
    density: 'high-frequency',
    pickupPoints: ['University belt', 'industrial relay', 'east connector hub'],
    autoGroupWindow: 'Continuously merge riders into the next viable departure.',
    movementLayers: ['students', 'workers', 'returns', 'service teams'],
    businessDemand: ['industrial staff movement', 'education corridor', 'returns'],
    routeMoat: 'Cross-north industrial flow creates a distinct route graph that compounds with every trip.',
    attachRatePercent: 55,
    fillTargetSeats: 4,
    intelligenceSignals: [
      'Recommend the best relay node instead of direct downtown pickup.',
      'Use density pricing to beat taxis at peak hours.',
      'Attach returns to same-day worker movement.',
    ],
  },
  'irbid-ajloun': {
    demandScore: 69,
    density: 'steady',
    pickupPoints: ['Irbid university gate', 'Ajloun central stop', 'forest approach node'],
    autoGroupWindow: 'Build dependable daily route waves instead of random sparse rides.',
    movementLayers: ['local riders', 'families', 'local goods', 'service visits'],
    businessDemand: ['local commerce', 'tourism service', 'repair visits'],
    routeMoat: 'Owning reliable low-distance grouping is how Wasel expands density into smaller corridors.',
    attachRatePercent: 43,
    fillTargetSeats: 3,
    intelligenceSignals: [
      'Promote daily route subscriptions on lower-ticket corridors.',
      'Nudge grouped departures instead of single-seat fragmentation.',
      'Fill extra capacity with service-provider movement.',
    ],
  },
  'zarqa-mafraq': {
    demandScore: 67,
    density: 'steady',
    pickupPoints: ['Industrial edge', 'Mafraq gateway', 'east logistics stop'],
    autoGroupWindow: 'Cluster departures around workday turnover and eastbound logistics demand.',
    movementLayers: ['workers', 'goods', 'truck support', 'field services'],
    businessDemand: ['industrial logistics', 'support vehicles', 'service teams'],
    routeMoat: 'Truck and worker demand together create a differentiated eastbound movement graph.',
    attachRatePercent: 51,
    fillTargetSeats: 4,
    intelligenceSignals: [
      'Bridge passenger and truck-support demand on one eastbound map.',
      'Keep seat prices low when service providers reinforce density.',
      'Escalate bigger loads to truck owners without losing corridor data.',
    ],
  },
};

function roundMoney(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeRoute(route: JordanRoute, from?: string, to?: string) {
  return {
    ...route,
    from: from ?? route.origin,
    to: to ?? route.destination,
    label: `${from ?? route.origin} -> ${to ?? route.destination}`,
  };
}

function getCorridorMeta(routeId: string): CorridorMeta {
  return CORRIDOR_META[routeId] ?? CORRIDOR_META[routeId.toLowerCase()] ?? {
    demandScore: 70,
    density: 'steady',
    pickupPoints: ['Main corridor node', 'Trusted pickup zone', 'Demand capture point'],
    autoGroupWindow: 'Use route alerts and cost sharing to build the next departure wave.',
    movementLayers: ['people', 'goods', 'services', 'data'],
    businessDemand: ['staff movement', 'returns', 'service calls'],
    routeMoat: 'Wasel learns how this corridor behaves faster every time the route is searched.',
    attachRatePercent: 42,
    fillTargetSeats: 3,
    intelligenceSignals: [
      'Predict the next departure wave from saved alerts.',
      'Suggest the best pickup node before search friction appears.',
      'Use cost sharing to keep the route cheaper than solo movement.',
    ],
  };
}

function buildRoutePrices(route: JordanRoute, demandScore: number) {
  const soloReferencePriceJod = roundMoney((route.baseFare * 1.75) + (route.distance * 0.02) + 1.8);
  const totalTripCost = Math.max(route.baseFare * 1.2, soloReferencePriceJod * 0.88);
  const priceLadder = SmartPricingEngine.calculateSharedRidePricing(totalTripCost, 4);
  const densityDiscount = demandScore >= 90 ? 0.92 : demandScore >= 80 ? 0.96 : 1;
  const sharedPriceJod = roundMoney((priceLadder[2]?.price ?? route.baseFare) * densityDiscount);
  const savingsPercent = Math.max(
    20,
    Math.round((1 - (sharedPriceJod / Math.max(soloReferencePriceJod, sharedPriceJod + 1))) * 100),
  );

  return {
    soloReferencePriceJod,
    sharedPriceJod,
    savingsPercent,
    priceLadder,
  };
}

function buildOpportunity(route: JordanRoute, from?: string, to?: string): CorridorOpportunity {
  const normalized = normalizeRoute(route, from, to);
  const meta = getCorridorMeta(route.id);
  const prices = buildRoutePrices(route, meta.demandScore);
  const driverBoostJod = roundMoney((prices.sharedPriceJod * meta.fillTargetSeats * 0.18) + (meta.attachRatePercent * 0.04));
  const subscriptionPriceJod = roundMoney((prices.sharedPriceJod * 18) * (meta.density === 'surging' ? 0.92 : 0.97));

  return {
    id: route.id,
    from: normalized.from,
    to: normalized.to,
    label: normalized.label,
    distanceKm: route.distance,
    durationMin: route.duration,
    density: meta.density,
    predictedDemandScore: meta.demandScore,
    sharedPriceJod: prices.sharedPriceJod,
    soloReferencePriceJod: prices.soloReferencePriceJod,
    savingsPercent: prices.savingsPercent,
    driverBoostJod,
    attachRatePercent: meta.attachRatePercent,
    fillTargetSeats: meta.fillTargetSeats,
    pickupPoints: meta.pickupPoints,
    autoGroupWindow: meta.autoGroupWindow,
    movementLayers: meta.movementLayers,
    businessDemand: meta.businessDemand,
    intelligenceSignals: meta.intelligenceSignals,
    routeMoat: meta.routeMoat,
    subscriptionPriceJod,
    priceLadder: prices.priceLadder,
  };
}

export const DEFAULT_CORRIDOR_ID = 'amman-irbid';

export function getMovementLayers() {
  return MOVEMENT_LAYERS;
}

export function getMarketplaceNodes() {
  return MARKETPLACE_NODES;
}

export function getMovementDefensibilityLines() {
  return MOVEMENT_LAYERS.map((layer) => layer.valueLine);
}

export function getAllCorridorOpportunities() {
  return JORDAN_MOBILITY_NETWORK.map((route) => buildOpportunity(route)).sort(
    (left, right) => right.predictedDemandScore - left.predictedDemandScore,
  );
}

export function getFeaturedCorridors(limit = 6) {
  return getAllCorridorOpportunities().slice(0, limit);
}

export function getCorridorOpportunityById(routeId: string) {
  const route = JORDAN_MOBILITY_NETWORK.find((item) => item.id === routeId)
    ?? JORDAN_MOBILITY_NETWORK.find((item) => item.id === DEFAULT_CORRIDOR_ID);
  return route ? buildOpportunity(route) : null;
}

export function getCorridorOpportunity(from: string, to: string) {
  const route = getRouteBetween(from, to)
    ?? JORDAN_MOBILITY_NETWORK.find((item) => item.id === buildJordanCorridorKey(from, to).replace('__', '-'))
    ?? JORDAN_MOBILITY_NETWORK.find((item) => item.id === DEFAULT_CORRIDOR_ID);
  return route ? buildOpportunity(route, from, to) : null;
}

export function buildDriverRoutePlan(from: string, to: string, seats: number) {
  const corridor = getCorridorOpportunity(from, to) ?? getCorridorOpportunityById(DEFAULT_CORRIDOR_ID);
  if (!corridor) {
    return null;
  }

  const priceModel = SmartPricingEngine.calculateSharedRidePricing(
    corridor.soloReferencePriceJod * 0.9,
    Math.max(2, seats),
  );
  const recommendedSeatPriceJod = roundMoney(
    (priceModel[Math.min(Math.max(seats - 1, 0), priceModel.length - 1)]?.price ?? corridor.sharedPriceJod) * 0.98,
  );
  const grossWhenFullJod = roundMoney(recommendedSeatPriceJod * Math.max(2, seats));
  const emptySeatCostJod = roundMoney(
    Math.max(0, grossWhenFullJod - (recommendedSeatPriceJod * Math.max(1, seats - 1))),
  );
  const packageBonusJod = roundMoney(corridor.driverBoostJod * 0.55);

  return {
    corridor,
    recommendedSeatPriceJod,
    grossWhenFullJod,
    emptySeatCostJod,
    packageBonusJod,
    routeNote: `Recommended for ${corridor.fillTargetSeats} seats on ${corridor.label} so the ride can fill before price pressure starts.`,
  } satisfies DriverRoutePlan;
}
