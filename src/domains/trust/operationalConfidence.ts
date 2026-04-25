import type { CorridorExperienceSnapshot } from '../corridors/corridorExperience';
import type { DriverRoutePlan } from '../../config/wasel-movement-network';
import type { PostedRide } from '../../services/journeyLogistics';
import type { WalletData, WalletReliabilityMeta } from '../../services/walletApi';

export type OperationalConfidenceTone = 'cyan' | 'green' | 'gold';

export interface OperationalConfidenceSignal {
  id: string;
  label: string;
  tone: OperationalConfidenceTone;
  value: string;
}

export interface OperationalConfidenceSummary {
  score: number;
  scoreLabel: string;
  tierLabel: string;
  headline: string;
  detail: string;
  signals: OperationalConfidenceSignal[];
}

interface OfferRideConfidenceInput {
  corridor: CorridorExperienceSnapshot;
  acceptsPackages: boolean;
  packageCapacity?: string;
  draftMessage?: string | null;
  driverPlan?: DriverRoutePlan | null;
}

interface PackageConfidenceInput {
  corridor: CorridorExperienceSnapshot;
  preferredRide?: PostedRide | null;
  recipientPhone?: string | null;
}

interface WalletChallengeLike {
  deliveryChannel?: string;
  maskedDestination?: string | null;
}

interface WalletConfidenceInput {
  wallet: WalletData | null;
  meta: WalletReliabilityMeta | null;
  transferChallenge: WalletChallengeLike | null;
  totalTransactions: number;
  defaultPaymentMethodLabel?: string | null;
  formatMoney?: (value: number, currency: string) => string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatMoneyValue(
  value: number,
  currency: string,
  formatter?: (amount: number, moneyCurrency: string) => string,
) {
  if (formatter) {
    return formatter(value, currency);
  }

  return `${value.toFixed(2)} ${currency}`;
}

function getTierLabel(score: number) {
  if (score >= 90) {
    return 'Ready';
  }

  if (score >= 78) {
    return 'Almost ready';
  }

  return 'Needs review';
}

export function getOfferRideConfidenceSummary({
  corridor,
  acceptsPackages,
  packageCapacity,
  draftMessage,
  driverPlan,
}: OfferRideConfidenceInput): OperationalConfidenceSummary {
  const routeSignalBonus = corridor.demandSource === 'live' ? 18 : driverPlan ? 11 : 4;
  const corridorBonus =
    corridor.matchingRideCount > 2 ? 10 : corridor.matchingRideCount > 0 ? 7 : 2;
  const packageBonus = acceptsPackages ? 6 : 3;
  const draftBonus = draftMessage?.trim() ? 6 : 4;
  const score = clamp(52 + routeSignalBonus + corridorBonus + packageBonus + draftBonus, 48, 97);

  const headline = corridor.demandSource === 'live'
    ? score >= 90
      ? 'Ride is ready to post'
      : 'Ride details look good'
    : driverPlan
      ? 'Trip details are ready'
      : 'Add trip details';
  const detail = corridor.demandSource === 'live'
    ? 'Ride availability and trip details are visible before you post.'
    : driverPlan
      ? 'Trip details are visible. Review the route and post when you are ready.'
      : 'Choose a route first to see ride availability before you post.';

  const routeSignalValue = corridor.demandScore !== null
    ? `${corridor.demandScore}/100 ride availability${corridor.routeOwnershipScore !== null ? ` with ${corridor.routeOwnershipScore}/100 route match.` : '.'}`
    : driverPlan
      ? `${driverPlan.corridor.predictedDemandScore}/100 expected ride availability with ${driverPlan.corridor.autoGroupWindow}`
      : 'Choose a route to see ride availability.';
  const liveCorridorValue =
    corridor.matchingRideCount > 0
      ? `${pluralize(corridor.matchingRideCount, 'active ride')} already posted on this route.`
      : 'No active rides are posted on this route yet.';
  const laneFitValue = acceptsPackages
    ? `Passenger seats plus ${packageCapacity ?? 'medium'} package space are available on this trip.`
    : 'Passenger seats only.';

  return {
    score,
    scoreLabel: 'Ride availability',
    tierLabel: getTierLabel(score),
    headline,
    detail,
    signals: [
      {
        id: 'live-corridor',
        label: 'Ride availability',
        tone: corridor.matchingRideCount > 0 ? 'green' : 'gold',
        value: liveCorridorValue,
      },
      {
        id: 'route-signal',
        label: 'Trip details',
        tone: corridor.demandScore !== null || driverPlan ? 'cyan' : 'gold',
        value: routeSignalValue,
      },
      {
        id: 'coordination-lane',
        label: 'Coordination',
        tone: 'green',
        value: acceptsPackages
          ? 'WhatsApp stays available for riders, packages, and handoffs.'
          : 'WhatsApp stays available for rider updates.',
      },
      {
        id: 'lane-fit',
        label: 'Capacity',
        tone: 'gold',
        value: laneFitValue,
      },
      {
        id: 'draft-state',
        label: 'Draft',
        tone: 'cyan',
        value: draftMessage?.trim() || 'Draft autosaves on this device.',
      },
    ],
  };
}

export function getPackageConfidenceSummary({
  corridor,
  preferredRide,
  recipientPhone,
}: PackageConfidenceInput): OperationalConfidenceSummary {
  const hasRecipientWhatsApp = Boolean(recipientPhone?.trim());
  const liveSupplyBonus =
    corridor.packageReadyRideCount > 2 ? 20 : corridor.packageReadyRideCount > 0 ? 15 : 4;
  const signalBonus = corridor.demandSource === 'live' ? 10 : corridor.corridorLabel ? 7 : 2;
  const handoffBonus = preferredRide ? 9 : corridor.packageReadyRideCount > 0 ? 6 : 2;
  const coordinationBonus = hasRecipientWhatsApp ? 7 : 3;
  const priceBonus = corridor.quotedPriceJod !== null ? 6 : 0;
  const score = clamp(
    48 + liveSupplyBonus + signalBonus + handoffBonus + coordinationBonus + priceBonus,
    46,
    97,
  );

  const routeLabel =
    corridor.corridorLabel ??
    (preferredRide ? `${preferredRide.from} to ${preferredRide.to}` : 'this corridor');
  const nextWaveLabel = corridor.nextWaveWindow ?? 'once the next captain goes live';

  return {
    score,
    scoreLabel: 'Delivery status',
    tierLabel: getTierLabel(score),
    headline:
      corridor.packageReadyRideCount > 0 && hasRecipientWhatsApp
        ? 'Package is ready to send'
        : corridor.packageReadyRideCount > 0 || preferredRide
          ? 'Delivery can be assigned'
          : 'Waiting for a matching ride',
    detail:
      corridor.packageReadyRideCount > 0
        ? 'A matching ride is available, so sender and receiver can coordinate delivery now.'
        : 'Create the request now and retry when a matching ride is available.',
    signals: [
      {
        id: 'route-readiness',
        label: 'Ride availability',
        tone: corridor.packageReadyRideCount > 0 ? 'green' : 'gold',
        value:
          corridor.packageReadyRideCount > 0
            ? `${pluralize(corridor.packageReadyRideCount, 'package-ready ride')} live on ${routeLabel}. Next wave: ${nextWaveLabel}.`
            : `No package-ready ride is live on ${routeLabel} yet. Next wave: ${nextWaveLabel}.`,
      },
      {
        id: 'coordination-lane',
        label: 'Contact details',
        tone: hasRecipientWhatsApp ? 'green' : 'gold',
        value: hasRecipientWhatsApp
          ? 'Recipient can be reached directly on WhatsApp once the handoff starts.'
          : 'Wasel can keep the WhatsApp handoff lane open until the recipient number is added.',
      },
      {
        id: 'handoff-posture',
        label: 'Assigned ride',
        tone: preferredRide || corridor.packageReadyRideCount > 0 ? 'cyan' : 'gold',
        value: preferredRide
          ? `Pinned to the ${preferredRide.from} to ${preferredRide.to} ride at ${preferredRide.time}.`
          : corridor.packageReadyRideCount > 0
            ? 'This request can attach to the next live captain on the corridor.'
            : 'Queue now and let Wasel attach the request when the next captain goes live.',
      },
      {
        id: 'price-clarity',
        label: 'Price',
        tone: corridor.quotedPriceJod !== null ? 'cyan' : 'gold',
        value: corridor.quotedPriceJod !== null
          ? `${corridor.quotedPriceJod} JOD shared quote${corridor.quoteSavingsPercent !== null ? ` with ${corridor.quoteSavingsPercent}% corridor savings.` : '.'}`
          : 'Pricing appears as soon as the route signal is available.',
      },
    ],
  };
}

export function getWalletConfidenceSummary({
  wallet,
  meta,
  transferChallenge,
  totalTransactions,
  defaultPaymentMethodLabel,
  formatMoney,
}: WalletConfidenceInput): OperationalConfidenceSummary {
  const walletStatusBonus =
    wallet?.wallet.status === 'active'
      ? 16
      : wallet?.wallet.status === 'limited'
        ? 8
        : wallet?.wallet.status
          ? 1
          : 0;
  const sourceBonus = meta ? (meta.degraded ? 4 : 12) : 2;
  const pinBonus = wallet?.pinSet ? 10 : 1;
  const railBonus = defaultPaymentMethodLabel
    ? 8
    : wallet?.wallet.paymentMethods.length
      ? 4
      : 0;
  const ledgerBonus = totalTransactions >= 10 ? 7 : totalTransactions > 0 ? 4 : 1;
  const challengeBonus = transferChallenge ? 4 : 0;
  const score = clamp(
    45 + walletStatusBonus + sourceBonus + pinBonus + railBonus + ledgerBonus + challengeBonus,
    40,
    98,
  );

  const walletCurrency = wallet?.currency ?? 'JOD';
  const walletStatusValue = wallet
    ? wallet.wallet.status === 'active'
      ? 'Wallet account is active and ready for protected transfers.'
      : wallet.wallet.status === 'limited'
        ? 'Wallet account is in limited mode and may require extra checks.'
        : `Wallet account is ${wallet.wallet.status}.`
    : 'Waiting for wallet status.';
  const sourceValue = !meta
    ? 'Waiting for live wallet data from the backend.'
    : meta.degraded
      ? 'Wallet data could not be refreshed. Try again.'
      : 'Live wallet data is available from the backend.';
  const protectionValue = !wallet
    ? 'Wallet protection details appear after the snapshot loads.'
    : !wallet.pinSet
      ? 'Set a wallet PIN before sending money.'
      : transferChallenge
        ? `OTP step-up is active via ${transferChallenge.deliveryChannel ?? 'your secure channel'}${transferChallenge.maskedDestination ? ` to ${transferChallenge.maskedDestination}` : ''}.`
        : 'PIN verification is required before every transfer.';
  const fundsVisibilityValue = wallet
    ? `${formatMoneyValue(wallet.balance, walletCurrency, formatMoney)} available and ${formatMoneyValue(wallet.pendingBalance, walletCurrency, formatMoney)} pending.`
    : 'Waiting for the wallet balance and pending funds.';
  const railValue = defaultPaymentMethodLabel
    ? `Default payout rail: ${defaultPaymentMethodLabel}.`
    : wallet?.wallet.paymentMethods.length
      ? `${pluralize(wallet.wallet.paymentMethods.length, 'saved payment rail')} available, but no default is pinned.`
      : 'Add a funding or payout rail before large transfers.';

  return {
    score,
    scoreLabel: 'Payment status',
    tierLabel: getTierLabel(score),
    headline:
      wallet && wallet.pinSet && meta && !meta.degraded
        ? 'Wallet is ready'
        : wallet
          ? 'Finish wallet setup'
          : 'Connect your wallet',
    detail: !wallet
      ? 'Wallet status appears when the backend returns your balance and payment details.'
      : !wallet.pinSet
        ? 'Set a wallet PIN before sending money.'
        : meta?.degraded
          ? 'Wallet data could not be refreshed. Retry before moving money.'
          : `Balance, payment method, and transfer protection are visible before money moves. ${pluralize(totalTransactions, 'recorded transaction')} already appear in the live ledger.`,
    signals: [
      {
        id: 'wallet-status',
        label: 'Wallet status',
        tone: wallet?.wallet.status === 'active' ? 'green' : 'gold',
        value: walletStatusValue,
      },
      {
        id: 'source-posture',
        label: 'Live data',
        tone: meta && !meta.degraded ? 'cyan' : 'gold',
        value: sourceValue,
      },
      {
        id: 'transfer-protection',
        label: 'Transfer protection',
        tone: wallet?.pinSet ? 'green' : 'gold',
        value: protectionValue,
      },
      {
        id: 'funds-visibility',
        label: 'Balance',
        tone: wallet ? 'cyan' : 'gold',
        value: fundsVisibilityValue,
      },
      {
        id: 'payout-rail',
        label: 'Payment method',
        tone: defaultPaymentMethodLabel ? 'green' : 'gold',
        value: railValue,
      },
    ],
  };
}
