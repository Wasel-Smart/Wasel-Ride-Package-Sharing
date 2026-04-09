import { getCorridorOpportunityById } from '../config/wasel-movement-network';
import {
  buildBusinessAccountSnapshot,
  buildSchoolTransportSnapshot,
  type BusinessAccountSnapshot,
  type SchoolTransportSnapshot,
} from './corridorOperations';
import { getMovementMembershipSnapshot } from './movementMembership';
import { buildServiceProviderWorkflowSnapshot, type ServiceProviderWorkflowSnapshot } from './serviceProviderWorkflows';

export type CorridorCommercialContractType = 'corporate' | 'school' | 'service-provider';

export interface CorridorCommercialContract {
  id: string;
  type: CorridorCommercialContractType;
  title: string;
  corridorId: string;
  corridorLabel: string;
  recurringRevenueJod: number;
  routeOwnershipScore: number;
  nextWaveWindow: string;
  activeAccounts: number;
  renewalDate: string;
  operatingModel: string;
}

export interface CorridorCommercialSnapshot {
  contracts: CorridorCommercialContract[];
  totalRecurringRevenueJod: number;
  ownedCorridorContracts: number;
  activeStakeholders: number;
  topContract: CorridorCommercialContract | null;
  recommendedCommercialAction: string;
  corridorPassCoverage: string | null;
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function buildCorporateContract(
  business: BusinessAccountSnapshot,
  service: ServiceProviderWorkflowSnapshot,
): CorridorCommercialContract {
  const corridorId = `jo-${business.corridor.from.toLowerCase()}-${business.corridor.to.toLowerCase()}`;
  const corridor = getCorridorOpportunityById(corridorId);

  return {
    id: `contract-corporate-${corridorId}`,
    type: 'corporate',
    title: `${business.companyName} managed corridor`,
    corridorId,
    corridorLabel: corridor?.label ?? `${business.corridor.from} to ${business.corridor.to}`,
    recurringRevenueJod: Number((business.monthlyInvoiceJOD + service.monthlyRouteRevenueJod).toFixed(1)),
    routeOwnershipScore: service.liveSignal?.routeOwnershipScore ?? business.liquidity.healthScore,
    nextWaveWindow: service.liveSignal?.nextWaveWindow ?? 'Morning and evening managed windows',
    activeAccounts: business.employees.length + service.activeAccounts,
    renewalDate: addDaysIso(30),
    operatingModel: 'Managed employee mobility plus provider dispatch',
  };
}

function buildSchoolContract(school: SchoolTransportSnapshot): CorridorCommercialContract {
  const corridorId = `jo-${school.route.from.toLowerCase()}-${school.route.to.toLowerCase()}`;
  const corridor = getCorridorOpportunityById(corridorId);
  const recurringRevenueJod = Number(
    ((school.subscriptionPricing.standard ?? 0) * school.students.length * 4).toFixed(1),
  );

  return {
    id: `contract-school-${corridorId}`,
    type: 'school',
    title: `${school.route.from} school lane`,
    corridorId,
    corridorLabel: corridor?.label ?? `${school.route.from} to ${school.route.to}`,
    recurringRevenueJod,
    routeOwnershipScore: school.liquidity.healthScore,
    nextWaveWindow: `${school.morningWindow} / ${school.afternoonWindow}`,
    activeAccounts: school.students.length + school.students.reduce((sum, student) => sum + student.guardians.length, 0),
    renewalDate: addDaysIso(30),
    operatingModel: 'Recurring guardian-visible school transport',
  };
}

function buildServiceContract(service: ServiceProviderWorkflowSnapshot): CorridorCommercialContract {
  const corridorId = `jo-${service.route.from.toLowerCase()}-${service.route.to.toLowerCase()}`;
  const corridor = getCorridorOpportunityById(corridorId);

  return {
    id: `contract-service-${corridorId}`,
    type: 'service-provider',
    title: `${service.route.from} field-service corridor`,
    corridorId,
    corridorLabel: corridor?.label ?? `${service.route.from} to ${service.route.to}`,
    recurringRevenueJod: service.monthlyRouteRevenueJod,
    routeOwnershipScore: service.liveSignal?.routeOwnershipScore ?? service.crewUtilizationPercent,
    nextWaveWindow: service.dispatchWindows[0]?.label ?? 'Next dense dispatch wave',
    activeAccounts: service.activeAccounts,
    renewalDate: addDaysIso(14),
    operatingModel: 'Provider dispatch and backhaul consolidation',
  };
}

export async function buildCorridorCommercialSnapshot(): Promise<CorridorCommercialSnapshot> {
  const [business, school] = await Promise.all([
    buildBusinessAccountSnapshot(),
    buildSchoolTransportSnapshot(),
  ]);
  const service = buildServiceProviderWorkflowSnapshot();
  const membership = getMovementMembershipSnapshot();
  const contracts = [
    buildCorporateContract(business, service),
    buildSchoolContract(school),
    buildServiceContract(service),
  ].sort((left, right) => right.recurringRevenueJod - left.recurringRevenueJod);

  const totalRecurringRevenueJod = Number(
    contracts.reduce((sum, contract) => sum + contract.recurringRevenueJod, 0).toFixed(1),
  );
  const ownedCorridorContracts = contracts.filter((contract) => contract.routeOwnershipScore >= 70).length;
  const activeStakeholders = contracts.reduce((sum, contract) => sum + contract.activeAccounts, 0);
  const topContract = contracts[0] ?? null;
  const corridorPassCoverage = membership.activeSubscription?.corridorLabel ?? membership.dailyRoute?.label ?? null;

  return {
    contracts,
    totalRecurringRevenueJod,
    ownedCorridorContracts,
    activeStakeholders,
    topContract,
    recommendedCommercialAction: topContract
      ? `Scale ${topContract.corridorLabel} using ${topContract.type} contracts before opening a new lane.`
      : 'Grow recurring corridor contracts before expanding fixed supply.',
    corridorPassCoverage,
  };
}
