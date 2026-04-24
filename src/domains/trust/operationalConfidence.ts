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
    return 'High confidence';
  }

  if (score >= 78) {
    return 'Ready now';
  }

  return 'Review lane';
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
      ? 'Publish-ready supply lane'
      : 'Operationally ready route'
    : driverPlan
      ? 'Route plan with visible proof'
      : 'Build route confidence';
  const detail = corridor.demandSource === 'live'
    ? 'Live demand, corridor proof, and WhatsApp-led coordination are visible before you publish.'
    : driverPlan
      ? 'Route economics are already visible. Publish once the route details and coordination lane feel clean.'
      : 'Choose the corridor first so Wasel can show route intelligence before the lane goes live.';

  const routeSignalValue = corridor.demandScore !== null
    ? `${corridor.demandScore}/100 demand${corridor.routeOwnershipScore !== null ? ` with ${corridor.routeOwnershipScore}/100 corridor proof.` : '.'}`
    : driverPlan
      ? `${driverPlan.corridor.predictedDemandScore}/100 predicted demand with ${driverPlan.corridor.autoGroupWindow}`
      : 'Choose a corridor to unlock route intelligence.';
  const liveCorridorValue =
    corridor.matchingRideCount > 0
      ? `${pluralize(corridor.matchingRideCount, 'live route')} already posted on this corridor.`
      : 'This route will open the first visible supply lane on the corridor.';
  const laneFitValue = acceptsPackages
    ? `Passenger seats plus ${packageCapacity ?? 'medium'} parcels can move on the same lane.`
    : 'Passenger seats only, with WhatsApp as the primary coordination lane.';

  return {
    score,
    scoreLabel: 'Operational confidence',
    tierLabel: getTierLabel(score),
    headline,
    detail,
    signals: [
      {
        id: 'live-corridor',
        label: 'Live corridor',
        tone: corridorCount > 0 ? 'green' : 'gold',
        value: liveCorridorValue,
      },
      {
        id: 'route-signal',
        label: 'Route signal',
        tone: corridor.demandScore !== null || driverPlan ? 'cyan' : 'gold',
        value: routeSignalValue,
      },
      {
        id: 'coordination-lane',
        label: 'Coordination lane',
        tone: 'green',
        value: acceptsPackages
          ? 'WhatsApp-first coordination for riders, packages, and handoffs.'
          : 'WhatsApp-first coordination for riders once the route is live.',
      },
      {
        id: 'lane-fit',
        label: 'Lane fit',
        tone: 'gold',
        value: laneFitValue,
      },
      {
        id: 'draft-state',
        label: 'Draft state',
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
    scoreLabel: 'Operational confidence',
    tierLabel: getTierLabel(score),
    headline:
      corridor.packageReadyRideCount > 0 && hasRecipientWhatsApp
        ? 'Package lane ready now'
        : corridor.packageReadyRideCount > 0 || preferredRide
          ? 'Visible handoff lane'
          : 'Queue with route proof',
    detail:
      corridor.packageReadyRideCount > 0
        ? 'Live package-ready supply is already visible, so sender, holder, and receiver can move through one coordinated lane.'
        : 'The request can still be created now, but confidence rises once a package-ready captain is visible on the corridor.',
    signals: [
      {
        id: 'route-readiness',
        label: 'Route readiness',
        tone: corridor.packageReadyRideCount > 0 ? 'green' : 'gold',
        value:
          corridor.packageReadyRideCount > 0
            ? `${pluralize(corridor.packageReadyRideCount, 'package-ready ride')} live on ${routeLabel}. Next wave: ${nextWaveLabel}.`
            : `No package-ready ride is live on ${routeLabel} yet. Next wave: ${nextWaveLabel}.`,
      },
      {
        id: 'coordination-lane',
        label: 'Coordination lane',
        tone: hasRecipientWhatsApp ? 'green' : 'gold',
        value: hasRecipientWhatsApp
          ? 'Recipient can be reached directly on WhatsApp once the handoff starts.'
          : 'Wasel can keep the WhatsApp handoff lane open until the recipient number is added.',
      },
      {
        id: 'handoff-posture',
        label: 'Handoff posture',
        tone: preferredRide || corridor.packageReadyRideCount > 0 ? 'cyan' : 'gold',
        value: preferredRide
          ? `Pinned to the ${preferredRide.from} to ${preferredRide.to} ride at ${preferredRide.time}.`
          : corridor.packageReadyRideCount > 0
            ? 'This request can attach to the next live captain on the corridor.'
            : 'Queue now and let Wasel attach the request when the next captain goes live.',
      },
      {
        id: 'price-clarity',
        label: 'Price clarity',
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
    ? 'Waiting for the live wallet feed.'
    : meta.degraded
      ? 'Backup wallet snapshot is active while the primary feed recovers.'
      : meta.source === 'edge-api'
        ? 'Primary edge wallet sync is live.'
        : 'Direct wallet sync is live.';
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
    scoreLabel: 'Operational confidence',
    tierLabel: getTierLabel(score),
    headline:
      wallet && wallet.pinSet && meta && !meta.degraded
        ? 'Protected wallet lane'
        : wallet
          ? 'Transfer-ready wallet'
          : 'Finish wallet setup',
    detail: !wallet
      ? 'Wallet confidence appears once the balance, transfer protection, and payout rail are visible together.'
      : !wallet.pinSet
        ? 'Set a wallet PIN before sending money so every transfer stays step-up protected.'
        : meta?.degraded
          ? 'Transfers stay protected, but this session is reading from a backup wallet snapshot.'
          : `Balance, payout rail, and step-up protection are visible before money moves. ${pluralize(totalTransactions, 'recorded transaction')} already sit in the live ledger.`,
    signals: [
      {
        id: 'wallet-status',
        label: 'Wallet status',
        tone: wallet?.wallet.status === 'active' ? 'green' : 'gold',
        value: walletStatusValue,
      },
      {
        id: 'source-posture',
        label: 'Source posture',
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
        label: 'Funds visibility',
        tone: wallet ? 'cyan' : 'gold',
        value: fundsVisibilityValue,
      },
      {
        id: 'payout-rail',
        label: 'Payout rail',
        tone: defaultPaymentMethodLabel ? 'green' : 'gold',
        value: railValue,
      },
    ],
  };
}
