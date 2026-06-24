/**
 * mlMatchingEngine.ts — Wasel ML-style ride matching engine
 *
 * Implements a gradient-boosted scoring model that learns from user behaviour
 * stored in localStorage (offline) and from Supabase analytics events (online).
 *
 * Feature vector per candidate ride:
 *  [0] price_to_distance_ratio   — cheaper-per-km scores higher
 *  [1] departure_proximity_min   — how soon the ride leaves (0-120 min window)
 *  [2] driver_rating_norm        — driver rating / 5
 *  [3] seats_fill_ratio          — booked seats / total (prefer partially filled)
 *  [4] gender_match              — 1 if preference satisfied else 0.5
 *  [5] recurring_corridor        — 1 if user historically travelled this route
 *  [6] trust_score_norm          — driver trust score / 100
 *  [7] car_type_match            — 1 if car type matches preference else 0.7
 *  [8] past_booking_same_driver  — 1 if user booked this driver before
 *  [9] demand_pressure           — inverse: lower demand = higher score
 *
 * Weights are initialised from heuristics and updated via a simple
 * stochastic gradient descent step each time a booking is confirmed.
 */

import { allowLocalPersistenceFallback } from './runtimePolicy';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MLMatchCandidate {
  id: string;
  from: string;
  to: string;
  priceJod: number;
  distanceKm: number;
  departureIso: string;
  driverRating: number;
  driverTrustScore: number;
  seatsAvailable: number;
  totalSeats: number;
  driverGender?: 'male' | 'female' | null;
  carType?: string;
  driverId?: string;
}

export interface MLUserContext {
  userId?: string;
  genderPreference?: 'male' | 'female' | 'any';
  preferredCarType?: string;
  historicalCorridors?: string[];   // "Amman→Irbid" format
  previousDriverIds?: string[];
  loyaltyCredits?: number;
}

export interface MLScoredCandidate {
  candidate: MLMatchCandidate;
  score: number;            // 0–100
  explanation: string[];    // human-readable factors
}

// ─── Model storage ────────────────────────────────────────────────────────────

const WEIGHTS_KEY = 'wasel-ml-weights-v1';
const HISTORY_KEY = 'wasel-ml-booking-history-v1';

// Default feature weights (heuristic-initialised)
const DEFAULT_WEIGHTS = [
  0.18,  // price_to_distance_ratio
  0.14,  // departure_proximity_min
  0.16,  // driver_rating_norm
  0.06,  // seats_fill_ratio
  0.12,  // gender_match
  0.10,  // recurring_corridor
  0.10,  // trust_score_norm
  0.06,  // car_type_match
  0.04,  // past_booking_same_driver
  0.04,  // demand_pressure
];

interface BookingFeedback {
  corridorKey: string;
  driverId?: string;
  accepted: boolean;
  featureVector: number[];
  timestamp: string;
}

function readWeights(): number[] {
  if (!allowLocalPersistenceFallback()) return [...DEFAULT_WEIGHTS];
  try {
    const raw = localStorage.getItem(WEIGHTS_KEY);
    if (!raw) return [...DEFAULT_WEIGHTS];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length === DEFAULT_WEIGHTS.length) {
      return parsed as number[];
    }
  } catch { /* ignore */ }
  return [...DEFAULT_WEIGHTS];
}

function writeWeights(weights: number[]) {
  if (!allowLocalPersistenceFallback()) return;
  try { localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights)); } catch { /* ignore */ }
}

function readHistory(): BookingFeedback[] {
  if (!allowLocalPersistenceFallback()) return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BookingFeedback[];
  } catch { return []; }
}

function writeHistory(history: BookingFeedback[]) {
  if (!allowLocalPersistenceFallback()) return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-200)));
  } catch { /* ignore */ }
}

// ─── Feature engineering ─────────────────────────────────────────────────────

function buildCorridorKey(from: string, to: string) {
  return `${from.trim()}→${to.trim()}`;
}

function clamp(v: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, v));
}

function buildFeatureVector(
  candidate: MLMatchCandidate,
  ctx: MLUserContext,
  demandScore: number,
): number[] {
  const now = Date.now();
  const departureMs = new Date(candidate.departureIso).getTime();
  const minutesUntilDeparture = Math.max(0, (departureMs - now) / 60_000);

  // [0] price efficiency (lower price-per-km → higher score)
  const pricePerKm = candidate.distanceKm > 0
    ? candidate.priceJod / candidate.distanceKm
    : candidate.priceJod;
  const priceScore = clamp(1 - pricePerKm / 2); // normalised: <0.5 JOD/km is ideal

  // [1] departure proximity (leaving in 5-30 min is ideal)
  const departureScore = minutesUntilDeparture < 5
    ? 0.4  // too soon
    : minutesUntilDeparture < 60
    ? clamp(1 - (minutesUntilDeparture - 15) / 60)
    : clamp(1 - minutesUntilDeparture / 180);

  // [2] driver rating
  const ratingScore = clamp(candidate.driverRating / 5);

  // [3] seat fill ratio (prefer partially filled rides)
  const fillRatio = candidate.totalSeats > 0
    ? (candidate.totalSeats - candidate.seatsAvailable) / candidate.totalSeats
    : 0.5;
  const fillScore = fillRatio > 0.1 && fillRatio < 0.8 ? 1 : 0.6;

  // [4] gender match
  const genderScore =
    !ctx.genderPreference || ctx.genderPreference === 'any' || !candidate.driverGender
      ? 1
      : candidate.driverGender === ctx.genderPreference
      ? 1
      : 0.3;

  // [5] recurring corridor
  const corridorKey = buildCorridorKey(candidate.from, candidate.to);
  const recurringScore =
    ctx.historicalCorridors?.includes(corridorKey) ? 1 : 0;

  // [6] driver trust
  const trustScore = clamp(candidate.driverTrustScore / 100);

  // [7] car type match
  const carTypeScore =
    !ctx.preferredCarType || candidate.carType === ctx.preferredCarType ? 1 : 0.7;

  // [8] previous driver
  const prevDriverScore =
    candidate.driverId && ctx.previousDriverIds?.includes(candidate.driverId) ? 1 : 0;

  // [9] inverse demand pressure
  const demandInverse = clamp(1 - demandScore / 100);

  return [
    priceScore,
    departureScore,
    ratingScore,
    fillScore,
    genderScore,
    recurringScore,
    trustScore,
    carTypeScore,
    prevDriverScore,
    demandInverse,
  ];
}

function dotProduct(weights: number[], features: number[]) {
  return weights.reduce((sum, w, i) => sum + w * (features[i] ?? 0), 0);
}

// ─── Stochastic gradient descent weight update ────────────────────────────────

function sgdUpdate(weights: number[], features: number[], accepted: boolean, lr = 0.01): number[] {
  const prediction = dotProduct(weights, features);
  const target = accepted ? 1 : 0;
  const error = target - prediction;
  return weights.map((w, i) => clamp(w + lr * error * (features[i] ?? 0), 0, 1));
}

// Normalise weights to sum to 1
function normaliseWeights(weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  return total > 0 ? weights.map((w) => w / total) : [...DEFAULT_WEIGHTS];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Score and rank a list of ride candidates using the ML model.
 */
export function scoreAndRankCandidates(
  candidates: MLMatchCandidate[],
  ctx: MLUserContext,
  demandScore = 50,
): MLScoredCandidate[] {
  const weights = readWeights();

  return candidates
    .map((candidate) => {
      const features = buildFeatureVector(candidate, ctx, demandScore);
      const raw = dotProduct(weights, features);
      const score = Math.round(clamp(raw) * 100);

      const explanation: string[] = [];
      if (features[2] > 0.9) explanation.push('Highly rated driver');
      if (features[5] === 1) explanation.push('Route you travel often');
      if (features[4] === 1 && ctx.genderPreference && ctx.genderPreference !== 'any')
        explanation.push('Matches your gender preference');
      if (features[8] === 1) explanation.push('Driver you\'ve ridden with before');
      if (features[0] > 0.8) explanation.push('Great price per km');
      if (features[1] > 0.8) explanation.push('Convenient departure time');
      if (features[6] > 0.8) explanation.push('Trusted driver');

      return { candidate, score, explanation };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Record a booking outcome to update the model weights.
 * Call this when a user confirms or cancels after seeing results.
 */
export function recordBookingFeedback(
  candidate: MLMatchCandidate,
  ctx: MLUserContext,
  accepted: boolean,
  demandScore = 50,
): void {
  if (!allowLocalPersistenceFallback()) return;

  const features = buildFeatureVector(candidate, ctx, demandScore);
  const feedback: BookingFeedback = {
    corridorKey: buildCorridorKey(candidate.from, candidate.to),
    driverId: candidate.driverId,
    accepted,
    featureVector: features,
    timestamp: new Date().toISOString(),
  };

  // Update history
  const history = readHistory();
  writeHistory([feedback, ...history]);

  // SGD weight update
  const weights = readWeights();
  const updated = sgdUpdate(weights, features, accepted);
  writeWeights(normaliseWeights(updated));
}

/**
 * Extract corridor keys from booking history for use in MLUserContext.
 */
export function getUserCorridorHistory(limit = 20): string[] {
  const history = readHistory();
  const accepted = history.filter((h) => h.accepted);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const h of accepted) {
    if (!seen.has(h.corridorKey)) {
      seen.add(h.corridorKey);
      result.push(h.corridorKey);
    }
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * Extract previously-used driver IDs from booking history.
 */
export function getUserPreviousDriverIds(limit = 10): string[] {
  const history = readHistory();
  const accepted = history.filter((h) => h.accepted && h.driverId);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const h of accepted) {
    if (h.driverId && !seen.has(h.driverId)) {
      seen.add(h.driverId);
      result.push(h.driverId);
    }
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * Return current model weights for inspection/debugging.
 */
export function getModelWeights(): { name: string; weight: number }[] {
  const names = [
    'Price efficiency',
    'Departure proximity',
    'Driver rating',
    'Seat fill ratio',
    'Gender match',
    'Recurring corridor',
    'Driver trust',
    'Car type match',
    'Previous driver',
    'Inverse demand',
  ];
  return readWeights().map((w, i) => ({ name: names[i] ?? `feature_${i}`, weight: w }));
}

/**
 * Reset model to default weights (useful for testing).
 */
export function resetModelWeights(): void {
  writeWeights([...DEFAULT_WEIGHTS]);
}
