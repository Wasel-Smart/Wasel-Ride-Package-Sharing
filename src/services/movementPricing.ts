import {
  getMovementMembershipSnapshot,
  type MovementMembershipSnapshot,
} from './movementMembership';

export interface MovementPriceQuote {
  basePriceJod: number;
  finalPriceJod: number;
  discountJod: number;
  totalDiscountPercent: number;
  densityDiscountPercent: number;
  plusDiscountPercent: number;
  commuterDiscountPercent: number;
  creditDiscountPercent: number;
  loyaltyTier: MovementMembershipSnapshot['loyaltyTier'];
  explanation: string;
}

function roundMoney(value: number) {
  return Math.round(value * 10) / 10;
}

function getDensityDiscountPercent(forecastDemandScore: number) {
  if (forecastDemandScore >= 92) {return 4;}
  if (forecastDemandScore >= 84) {return 3;}
  if (forecastDemandScore >= 74) {return 1.5;}
  return 0;
}

function getCreditDiscountPercent(credits: number) {
  return Math.min(10, Math.max(1.5, Math.round((credits / 120) * 10) / 10));
}

/**
 * Quote a fare.
 *
 * The server charges the trip's own price: `app_create_ride_booking` ignores any
 * client-supplied total. Plus status, loyalty credits and commuter passes live in
 * localStorage and demand scores are computed from the browser's own cache, so none
 * of them can be honoured at checkout. Showing them as a discount would quote a price
 * the rider is never charged.
 *
 * Discounts are therefore OFF unless the caller sets `applyDiscounts: true`, which
 * must only be done once the entitlements are verified server-side.
 */
export function getMovementPriceQuote(args: {
  basePriceJod: number;
  corridorId?: string | null;
  forecastDemandScore?: number;
  membership?: ReturnType<typeof getMovementMembershipSnapshot>;
  applyDiscounts?: boolean;
}) {
  const membership = args.membership ?? getMovementMembershipSnapshot();
  const applyDiscounts = args.applyDiscounts === true;
  const basePriceJod = Math.max(0, args.basePriceJod);
  const forecastDemandScore = Math.max(0, Math.min(100, args.forecastDemandScore ?? 0));
  const densityDiscountPercent = applyDiscounts ? getDensityDiscountPercent(forecastDemandScore) : 0;
  const plusDiscountPercent = applyDiscounts && membership.plusActive ? 6 : 0;
  const commuterDiscountPercent =
    applyDiscounts && args.corridorId && membership.commuterPassRoute?.id === args.corridorId ? 8 : 0;
  const creditDiscountPercent = applyDiscounts ? getCreditDiscountPercent(membership.movementCredits) : 0;
  const totalDiscountPercent = Math.min(
    24,
    densityDiscountPercent + plusDiscountPercent + commuterDiscountPercent + creditDiscountPercent,
  );
  const finalPriceJod = roundMoney(basePriceJod * (1 - totalDiscountPercent / 100));
  const discountJod = roundMoney(Math.max(0, basePriceJod - finalPriceJod));

  const explanationBits = [
    densityDiscountPercent > 0 ? `${densityDiscountPercent}% route-density discount` : null,
    plusDiscountPercent > 0 ? `${plusDiscountPercent}% Plus discount` : null,
    commuterDiscountPercent > 0 ? `${commuterDiscountPercent}% commuter-pass discount` : null,
    creditDiscountPercent > 0 ? `${creditDiscountPercent}% loyalty-credit pricing` : null,
  ].filter(Boolean);

  return {
    basePriceJod: roundMoney(basePriceJod),
    finalPriceJod,
    discountJod,
    totalDiscountPercent: roundMoney(totalDiscountPercent),
    densityDiscountPercent: roundMoney(densityDiscountPercent),
    plusDiscountPercent: roundMoney(plusDiscountPercent),
    commuterDiscountPercent: roundMoney(commuterDiscountPercent),
    creditDiscountPercent: roundMoney(creditDiscountPercent),
    loyaltyTier: membership.loyaltyTier,
    explanation: explanationBits.length > 0 ? explanationBits.join(' + ') : 'Standard fare',
  } satisfies MovementPriceQuote;
}
