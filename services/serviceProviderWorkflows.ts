import { findRoute, getTier1Routes, type CityRoute } from '../utils/regionConfig';
import { getLiveCorridorSignal, type LiveCorridorSignal } from './routeDemandIntelligence';

export interface ServiceProviderDispatchWindow {
  label: string;
  serviceMix: string;
  targetPriceJod: number;
  recommendedPickupPoint: string;
}

export interface ServiceProviderWorkflowSnapshot {
  route: CityRoute;
  liveSignal: LiveCorridorSignal | null;
  activeAccounts: number;
  recurringVisitsPerWeek: number;
  monthlyRouteRevenueJod: number;
  crewUtilizationPercent: number;
  packageBackhaulPercent: number;
  invoiceCadence: string;
  serviceProviders: Array<{
    name: string;
    specialty: string;
    weeklyStops: number;
    utilizationPercent: number;
    serviceLevel: string;
  }>;
  dispatchWindows: ServiceProviderDispatchWindow[];
  workflowSteps: string[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number) {
  return Math.round(value * 10) / 10;
}

function getRoute(routeId: string, fallbackId: string) {
  return findRoute(routeId) ?? findRoute(fallbackId) ?? getTier1Routes('JO')[0];
}

export function buildServiceProviderWorkflowSnapshot(
  routeId = 'JO_AMM_ZRQ',
): ServiceProviderWorkflowSnapshot {
  const route = getRoute(routeId, 'JO_AMM_ZRQ');
  const liveSignal = getLiveCorridorSignal(route.from, route.to);
  const forecast = liveSignal?.forecastDemandScore ?? 76;
  const ownership = liveSignal?.routeOwnershipScore ?? 72;
  const crewUtilizationPercent = clamp(
    Math.round((liveSignal?.seatUtilizationPercent ?? 62) * 0.78 + ownership * 0.24),
    58,
    96,
  );
  const activeAccounts = Math.max(4, Math.round((forecast / 12) + (route.packageEnabled ? 2 : 1)));
  const recurringVisitsPerWeek = Math.max(12, Math.round((forecast * 0.55) + (liveSignal?.liveBookings ?? 0)));
  const baseDispatchPrice = roundMoney(Math.max(4.5, (route.distanceKm * 0.08) + 2.4));
  const monthlyRouteRevenueJod = roundMoney(
    (baseDispatchPrice * recurringVisitsPerWeek * 4.2) + ((liveSignal?.livePackages ?? 0) * 3.2),
  );
  const packageBackhaulPercent = clamp(
    Math.round((liveSignal?.livePackages ?? (route.packageEnabled ? 7 : 2)) * 6 + 24),
    18,
    82,
  );

  return {
    route,
    liveSignal,
    activeAccounts,
    recurringVisitsPerWeek,
    monthlyRouteRevenueJod,
    crewUtilizationPercent,
    packageBackhaulPercent,
    invoiceCadence: 'Weekly approval, monthly invoice settlement',
    serviceProviders: [
      {
        name: 'Wasel Field Ops',
        specialty: 'Installations and site visits',
        weeklyStops: Math.round(recurringVisitsPerWeek * 0.42),
        utilizationPercent: clamp(crewUtilizationPercent + 4, 60, 97),
        serviceLevel: 'Same-day lane bundle',
      },
      {
        name: 'RouteCare Technicians',
        specialty: 'Maintenance and preventive checks',
        weeklyStops: Math.round(recurringVisitsPerWeek * 0.33),
        utilizationPercent: clamp(crewUtilizationPercent - 3, 54, 92),
        serviceLevel: 'Next-wave dispatch',
      },
      {
        name: 'Document Relay Teams',
        specialty: 'Samples, returns, and regulated handoffs',
        weeklyStops: Math.round(recurringVisitsPerWeek * 0.25),
        utilizationPercent: clamp(crewUtilizationPercent - 8, 48, 88),
        serviceLevel: 'Backhaul-first delivery',
      },
    ],
    dispatchWindows: [
      {
        label: 'Morning density window',
        serviceMix: 'Installations, employee handoffs, urgent samples',
        targetPriceJod: roundMoney(baseDispatchPrice * 0.92),
        recommendedPickupPoint: liveSignal?.recommendedPickupPoint ?? `${route.from} primary node`,
      },
      {
        label: 'Midday service lane',
        serviceMix: 'Technician hops, invoice pickups, low-friction returns',
        targetPriceJod: roundMoney(baseDispatchPrice),
        recommendedPickupPoint: liveSignal?.recommendedPickupPoint ?? `${route.to} central connector`,
      },
      {
        label: 'Evening backhaul window',
        serviceMix: 'Returns, tools, empty-seat recovery',
        targetPriceJod: roundMoney(baseDispatchPrice * 0.88),
        recommendedPickupPoint: liveSignal?.recommendedPickupPoint ?? `${route.to} return-lane gate`,
      },
    ],
    workflowSteps: [
      `Pin recurring jobs on ${route.from} to ${route.to} instead of dispatching ad hoc rides.`,
      'Group technicians, employee seats, and return packages into the same corridor wave.',
      'Use route-density pricing so high-frequency service windows are cheaper than solo dispatch.',
      'Invoice accounts on one lane-level report with proof of stops, backhauls, and utilization.',
    ],
  };
}
