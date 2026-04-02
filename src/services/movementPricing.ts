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
  if (forecastDemandScore >= 92) return 4;
  if (forecastDemandScore >= 84) return 3;
  if (forecastDemandScore >= 74) return 1.5;
  return 0;
}

function getCreditDiscountPercent(credits: number) {
  return Math.min(10, Math.max(1.5, Math.round((credits / 120) * 10) / 10));
}

export function getMovementPriceQuote(args: {
  basePriceJod: number;
  corridorId?: string | null;
  forecastDemandScore?: number;
  membership?: ReturnType<typeof getMovementMembershipSnapshot>;
}) {
  const membership = args.membership ?? getMovementMembershipSnapshot();
  const basePriceJod = Math.max(0, args.basePriceJod);
  const forecastDemandScore = Math.max(0, Math.min(100, args.forecastDemandScore ?? 0));
  const densityDiscountPercent = getDensityDiscountPercent(forecastDemandScore);
  const plusDiscountPercent = membership.plusActive ? 6 : 0;
  const commuterDiscountPercent = args.corridorId && membership.commuterPassRoute?.id === args.corridorId ? 8 : 0;
  const creditDiscountPercent = getCreditDiscountPercent(membership.movementCredits);
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
    `${creditDiscountPercent}% loyalty-credit pricing`,
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
    explanation: explanationBits.join(' + '),
  } satisfies MovementPriceQuote;
}
