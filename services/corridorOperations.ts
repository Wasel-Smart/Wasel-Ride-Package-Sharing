import { calculateFare } from '../config/jordan-mobility-network';
import { findRoute, getTier1Routes, type CityRoute } from '../utils/regionConfig';
import {
  calculateLiquidityHealth,
  calculatePrayerStops,
  rankTripsForPackage,
  rankTripsForPassenger,
  type LiquidityMetrics,
  type PackageCompatibilityResult,
  type PackageSummary,
  type PassengerRequest,
  type PrayerStop,
  type TripOptimizationScore,
  type TripSummary,
} from '../utils/routeIntelligence';
import { SmartPricingEngine, type SeatPricingModel } from '../utils/pricing/SeatPricing';
import {
  packageTrackingService,
  type PackagePaymentEscrow,
  type PackageTracking,
} from './packageTrackingService';
import { generateId } from '../utils/api';

export interface BusinessEmployee {
  id: string;
  name: string;
  email: string;
  department: string;
  monthlyTrips: number;
  monthlySpendJOD: number;
  status: 'active' | 'onboarding';
}

export interface FleetDriver {
  id: string;
  name: string;
  vehicle: string;
  trips: number;
  earningsJOD: number;
  rating: number;
  trustScore: number;
}

export interface BusinessAccountSnapshot {
  companyName: string;
  corridor: CityRoute;
  employees: BusinessEmployee[];
  fleetDrivers: FleetDriver[];
  liquidity: LiquidityMetrics & { routeId: string; averagePriceJOD: number };
  seatYield: SeatPricingModel[];
  passengerMatches: Array<{ trip: TripSummary; score: TripOptimizationScore }>;
  packageMatches: Array<{ trip: TripSummary; result: PackageCompatibilityResult }>;
  packageOps: {
    monthlyReturnVolume: number;
    attachRatePercent: number;
    tracking: PackageTracking;
    escrow: PackagePaymentEscrow;
  };
  monthlyInvoiceJOD: number;
  estimatedSavingsPercent: number;
  recurringDays: number;
  policyHighlights: string[];
}

export interface SchoolGuardian {
  name: string;
  relationship: string;
  phone: string;
}

export interface SchoolStudentDraft {
  id: string;
  name: string;
  age: number;
  grade: string;
  guardians: SchoolGuardian[];
}

export interface SchoolTransportSnapshot {
  route: CityRoute;
  students: SchoolStudentDraft[];
  liquidity: LiquidityMetrics & { routeId: string; averagePriceJOD: number };
  subscriptionPricing: ReturnType<typeof SmartPricingEngine.calculateSchoolSubscription>;
  seatYield: SeatPricingModel[];
  prayerStops: PrayerStop[];
  guardianCoveragePercent: number;
  recommendedVehicle: string;
  operatingDays: string[];
  morningWindow: string;
  afternoonWindow: string;
  matchingPreview: Array<{ trip: TripSummary; score: TripOptimizationScore }>;
  safetyChecklist: string[];
}

const DEFAULT_BUSINESS_ROUTE_ID = 'JO_AMM_IRB';
const DEFAULT_SCHOOL_ROUTE_ID = 'JO_AMM_ZRQ';

function getJordanRoute(routeId: string, fallbackId: string): CityRoute {
  return findRoute(routeId) ?? findRoute(fallbackId) ?? getTier1Routes('JO')[0];
}

function buildTripCandidates(route: CityRoute, seatsPerTrip: number): TripSummary[] {
  const now = Date.now();
  const windows = [2, 4, 8];

  return windows.map((hours, index) => ({
    id: `${route.id.toLowerCase()}-${index + 1}`,
    originCity: route.from,
    destinationCity: route.to,
    country: 'JO',
    departureTime: new Date(now + hours * 60 * 60 * 1000).toISOString(),
    availableSeats: Math.max(1, seatsPerTrip - index),
    totalSeats: seatsPerTrip,
    allowsPackages: route.packageEnabled && index !== 2,
    maxPackageWeightKg: index === 0 ? 8 : 5,
    genderPreference: index === 1 ? 'women_only' : 'mixed',
    driverRating: 4.7 + index * 0.1,
    driverTrustScore: 84 + index * 4,
    pricePerSeatJOD: Number((route.distanceKm / 22 + index * 0.35).toFixed(2)),
    estimatedArrivalTime: new Date(
      now + (hours + Math.max(1, Math.round(route.durationMin / 60))) * 60 * 60 * 1000,
    ).toISOString(),
    waypoints: index === 0 ? ['Jerash'] : undefined,
  }));
}

function buildDefaultBusinessEmployees(_route: CityRoute, seatPrice: number): BusinessEmployee[] {
  return [
    {
      id: generateId('emp'),
      name: 'Alaa Haddad',
      email: 'alaa@waselbiz.com',
      department: 'Operations',
      monthlyTrips: 22,
      monthlySpendJOD: Number((seatPrice * 22).toFixed(2)),
      status: 'active',
    },
    {
      id: generateId('emp'),
      name: 'Lina Khoury',
      email: 'lina@waselbiz.com',
      department: 'Finance',
      monthlyTrips: 18,
      monthlySpendJOD: Number((seatPrice * 18).toFixed(2)),
      status: 'active',
    },
    {
      id: generateId('emp'),
      name: 'Basil Naser',
      email: 'basil@waselbiz.com',
      department: 'Commercial',
      monthlyTrips: 16,
      monthlySpendJOD: Number((seatPrice * 16).toFixed(2)),
      status: 'onboarding',
    },
    {
      id: generateId('emp'),
      name: 'Rana Samir',
      email: 'rana@waselbiz.com',
      department: 'Customer Success',
      monthlyTrips: 20,
      monthlySpendJOD: Number((seatPrice * 20).toFixed(2)),
      status: 'active',
    },
  ];
}

function buildDefaultFleetDrivers(route: CityRoute): FleetDriver[] {
  return [
    {
      id: generateId('drv'),
      name: `Captain ${route.from}`,
      vehicle: 'Hyundai H1 Shuttle',
      trips: 118,
      earningsJOD: 4620,
      rating: 4.9,
      trustScore: 94,
    },
    {
      id: generateId('drv'),
      name: `Captain ${route.to}`,
      vehicle: 'Toyota Prius Hybrid',
      trips: 96,
      earningsJOD: 3890,
      rating: 4.8,
      trustScore: 91,
    },
  ];
}

function buildDefaultSchoolStudents(): SchoolStudentDraft[] {
  return [
    {
      id: generateId('std'),
      name: 'Mira Saleh',
      age: 11,
      grade: 'Grade 6',
      guardians: [
        { name: 'Dina Saleh', relationship: 'Mother', phone: '+962790000111' },
        { name: 'Saleh Karim', relationship: 'Father', phone: '+962790000112' },
      ],
    },
    {
      id: generateId('std'),
      name: 'Yousef Khalil',
      age: 9,
      grade: 'Grade 4',
      guardians: [{ name: 'Reem Khalil', relationship: 'Mother', phone: '+962790000113' }],
    },
  ];
}

function computeBusinessInvoice(employees: BusinessEmployee[]): number {
  return Number(employees.reduce((total, employee) => total + employee.monthlySpendJOD, 0).toFixed(2));
}

export async function buildBusinessAccountSnapshot(
  routeId: string = DEFAULT_BUSINESS_ROUTE_ID,
): Promise<BusinessAccountSnapshot> {
  const corridor = getJordanRoute(routeId, DEFAULT_BUSINESS_ROUTE_ID);
  const totalTripCost = calculateFare(corridor.distanceKm, 1, 'on-demand') + corridor.tollCostLocal + 6;
  const seatYield = SmartPricingEngine.calculateSharedRidePricing(totalTripCost, 4);
  const employees = buildDefaultBusinessEmployees(corridor, seatYield[1]?.price ?? seatYield[0]?.price ?? 0);
  const fleetDrivers = buildDefaultFleetDrivers(corridor);
  const passengerTrips = buildTripCandidates(corridor, 4);

  const passengerRequest: PassengerRequest = {
    id: generateId('biz-passenger'),
    originCity: corridor.from,
    destinationCity: corridor.to,
    country: 'JO',
    date: new Date().toISOString().slice(0, 10),
    passengersCount: 1,
    genderPreference: 'mixed',
    maxPriceJOD: seatYield[1]?.price ?? seatYield[0]?.price ?? 0,
    minDriverRating: 4.5,
  };

  const packageRequest: PackageSummary = {
    id: generateId('biz-return'),
    originCity: corridor.to,
    destinationCity: corridor.from,
    country: 'JO',
    weightKg: 2,
    neededBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    category: 'corporate-return',
    fragile: true,
    declaredValueJOD: 120,
  };

  const packageTrips = buildTripCandidates(
    { ...corridor, from: corridor.to, to: corridor.from, fromAr: corridor.toAr, toAr: corridor.fromAr },
    4,
  );

  const passengerMatches = rankTripsForPassenger(passengerTrips, passengerRequest);
  const packageMatches = rankTripsForPackage(packageTrips, packageRequest);
  const tracking = await packageTrackingService.createPackage({
    senderId: 'business-ops',
    from: corridor.to,
    to: corridor.from,
    size: 'medium',
    value: packageRequest.declaredValueJOD,
    insurance: true,
    description: `Corporate return lane on ${corridor.from} <> ${corridor.to}`,
  });
  const topPackageMatch = packageMatches[0];
  if (topPackageMatch) {
    await packageTrackingService.linkPackageToRide(tracking.id, {
      rideId: topPackageMatch.trip.id,
      driverId: generateId('driver'),
      driverName: 'Wasel Corporate Lane',
      driverPhone: '+962790123456',
      vehicleInfo: 'Fleet return shuttle',
    });
  }
  const linkedTracking = packageTrackingService.getPackage(tracking.id) ?? tracking;
  const escrow = await packageTrackingService.processPayment(tracking.id, 'wallet');
  const liquidityHealth = calculateLiquidityHealth(18, 72, 54) as LiquidityMetrics & {
    routeId: string;
    averagePriceJOD: number;
  };

  return {
    companyName: 'Wasel Enterprise',
    corridor,
    employees,
    fleetDrivers,
    liquidity: {
      ...liquidityHealth,
      routeId: corridor.id,
      averagePriceJOD: seatYield[1]?.price ?? seatYield[0]?.price ?? 0,
    },
    seatYield,
    passengerMatches,
    packageMatches,
    packageOps: {
      monthlyReturnVolume: 46,
      attachRatePercent: 68,
      tracking: linkedTracking,
      escrow,
    },
    monthlyInvoiceJOD: computeBusinessInvoice(employees),
    estimatedSavingsPercent: 34,
    recurringDays: 22,
    policyHighlights: [
      'Recurring corridor budget instead of ad hoc ride reimbursements',
      'Return packages only move on already scheduled employee or fleet trips',
      'High-trust drivers and insured lanes for finance, HR, and document returns',
    ],
  };
}

export async function buildSchoolTransportSnapshot(
  routeId: string = DEFAULT_SCHOOL_ROUTE_ID,
): Promise<SchoolTransportSnapshot> {
  const route = getJordanRoute(routeId, DEFAULT_SCHOOL_ROUTE_ID);
  const students = buildDefaultSchoolStudents();
  const distanceKm = Math.max(6, Math.round(route.distanceKm * 0.45));
  const subscriptionPricing = SmartPricingEngine.calculateSchoolSubscription(distanceKm, 5, true);
  const seatYield = SmartPricingEngine.calculateSharedRidePricing(subscriptionPricing.standard, 6);
  const matchingPreview = rankTripsForPassenger(buildTripCandidates(route, 6), {
    id: generateId('school-preview'),
    originCity: route.from,
    destinationCity: route.to,
    country: 'JO',
    date: new Date().toISOString().slice(0, 10),
    passengersCount: students.length,
    genderPreference: 'family_only',
    maxPriceJOD: seatYield[2]?.price ?? seatYield[0]?.price ?? 0,
    minDriverRating: 4.6,
  });

  const guardianCount = students.reduce((total, student) => total + student.guardians.length, 0);
  const guardianCoveragePercent = Math.min(
    100,
    Math.round((guardianCount / Math.max(1, students.length)) * 50),
  );
  const liquidityHealth = calculateLiquidityHealth(14, 42, 35) as LiquidityMetrics & {
    routeId: string;
    averagePriceJOD: number;
  };

  return {
    route,
    students,
    liquidity: {
      ...liquidityHealth,
      routeId: route.id,
      averagePriceJOD: seatYield[2]?.price ?? seatYield[0]?.price ?? 0,
    },
    subscriptionPricing,
    seatYield,
    prayerStops: calculatePrayerStops(
      `${new Date().toISOString().slice(0, 10)}T05:45:00.000Z`,
      Math.max(45, route.durationMin),
      'JO',
    ),
    guardianCoveragePercent,
    recommendedVehicle: students.length >= 5 ? 'Mini bus' : 'Verified family van',
    operatingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    morningWindow: '06:20 - 07:10',
    afternoonWindow: '13:45 - 15:10',
    matchingPreview,
    safetyChecklist: [
      'Guardian QR handoff before pickup and at final drop-off',
      'Real-time route visibility with live delay notifications',
      'Recurring seat allocation on the same verified corridor',
    ],
  };
}
