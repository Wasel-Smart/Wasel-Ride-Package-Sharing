export type TrustStepId = 'identity' | 'email' | 'phone' | 'driver_documents' | 'wallet_standing';

export type TrustStepState = 'not_started' | 'in_progress' | 'completed' | 'failed';

export interface TrustStepStatus<TMeta = Record<string, unknown>> {
  id: TrustStepId;
  state: TrustStepState;
  detail: string;
  failureReason: string | null;
  updatedAt: string | null;
  meta: TMeta;
}

export interface IdentityStepMeta {
  providerReference: string | null;
  documentReference: string | null;
}

export interface EmailStepMeta {
  email: string | null;
}

export interface PhoneStepMeta {
  phone: string | null;
  expiresAt: string | null;
}

export interface DriverDocumentsStepMeta {
  role: 'rider' | 'driver' | 'both' | 'admin';
  licenseNumber: string | null;
}

export interface WalletStandingStepMeta {
  walletStatus: 'active' | 'limited' | 'frozen' | 'closed' | 'unavailable';
}

export interface ReviewHistoryItem {
  id: string;
  type: 'identity' | 'driver_documents';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  failureReason: string | null;
  providerReference: string | null;
  documentReference: string | null;
}

export interface TrustCenterStatus {
  fetchedAt: string;
  verificationLevel: string;
  completedSteps: number;
  totalSteps: number;
  nextStepId: TrustStepId | null;
  blockedSteps: TrustStepId[];
  reviewHistory: ReviewHistoryItem[];
  steps: {
    identity: TrustStepStatus<IdentityStepMeta>;
    email: TrustStepStatus<EmailStepMeta>;
    phone: TrustStepStatus<PhoneStepMeta>;
    driverDocuments: TrustStepStatus<DriverDocumentsStepMeta>;
    walletStanding: TrustStepStatus<WalletStandingStepMeta>;
  };
}

type FallbackTrustUser = {
  role: 'rider' | 'driver' | 'both' | 'admin';
  verificationLevel: string;
  email?: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  walletStatus: 'active' | 'limited' | 'frozen' | 'closed' | 'unavailable';
  sanadVerified?: boolean;
  verified?: boolean;
};

function buildStatus<TMeta>(
  id: TrustStepId,
  state: TrustStepState,
  meta: TMeta,
  options: { detail: string; failureReason?: string | null; updatedAt?: string | null },
): TrustStepStatus<TMeta> {
  return {
    id,
    state,
    detail: options.detail,
    failureReason: options.failureReason ?? null,
    updatedAt: options.updatedAt ?? null,
    meta,
  };
}

function buildIdentityStep(user: FallbackTrustUser, verificationLevel: string): TrustStepStatus<IdentityStepMeta> {
  const identityComplete =
    Boolean(user.sanadVerified || user.verified) ||
    verificationLevel === 'level_2' ||
    verificationLevel === 'level_3';

  const meta: IdentityStepMeta = { providerReference: null, documentReference: null };

  if (identityComplete) {
    return buildStatus('identity', 'completed', meta, { detail: 'Identity verification is complete.' });
  }

  const state = verificationLevel === 'level_1' ? 'in_progress' : 'not_started';
  const detail =
    verificationLevel === 'level_1'
      ? 'Identity verification is still in progress.'
      : 'Submit Sanad verification to continue.';
  return buildStatus('identity', state, meta, { detail });
}

function buildEmailStep(user: FallbackTrustUser): TrustStepStatus<EmailStepMeta> {
  const state = user.emailVerified ? 'completed' : user.email ? 'in_progress' : 'not_started';
  const detail = user.emailVerified
    ? 'Email is verified.'
    : user.email
      ? 'Email confirmation is still required.'
      : 'Add an email address to continue.';
  return buildStatus('email', state, { email: user.email ?? null }, { detail });
}

function buildPhoneStep(user: FallbackTrustUser): TrustStepStatus<PhoneStepMeta> {
  const state = user.phoneVerified ? 'completed' : user.phone ? 'in_progress' : 'not_started';
  const detail = user.phoneVerified
    ? 'Phone number is verified.'
    : user.phone
      ? 'Send a verification code to confirm this phone number.'
      : 'Add a phone number to receive a verification code.';
  return buildStatus('phone', state, { phone: user.phone ?? null, expiresAt: null }, { detail });
}

function buildDriverDocsStep(
  user: FallbackTrustUser,
  verificationLevel: string,
): TrustStepStatus<DriverDocumentsStepMeta> {
  const isDriver = user.role === 'driver' || user.role === 'both';
  const meta: DriverDocumentsStepMeta = { role: user.role, licenseNumber: null };

  if (!isDriver) {
    return buildStatus('driver_documents', 'not_started', meta, {
      detail: 'Enable Driver mode before submitting driver documents.',
    });
  }

  if (verificationLevel === 'level_3') {
    return buildStatus('driver_documents', 'completed', meta, {
      detail: 'Driver documents are approved.',
    });
  }

  const state = verificationLevel === 'level_2' ? 'in_progress' : 'not_started';
  const detail =
    verificationLevel === 'level_2'
      ? 'Driver documents are waiting for final review.'
      : 'Submit driver license and compliance documents.';
  return buildStatus('driver_documents', state, meta, { detail });
}

function buildWalletStep(user: FallbackTrustUser): TrustCenterStatus['steps']['walletStanding'] {
  const walletStatus = resolveWalletStatusValue(user.walletStatus);

  if (user.walletStatus === 'active') {
    return buildStatus('wallet_standing', 'completed', { walletStatus: 'active' }, {
      detail: 'Wallet standing is healthy.',
    });
  }

  if (user.walletStatus === 'limited') {
    return buildStatus('wallet_standing', 'in_progress', { walletStatus: 'limited' }, {
      detail: 'Wallet standing is limited and may block some actions.',
    });
  }

  return buildStatus('wallet_standing', 'failed', { walletStatus }, {
    detail: `Wallet standing is ${user.walletStatus}.`,
    failureReason:
      user.walletStatus === 'closed'
        ? 'Wallet is closed and must be restored before payouts can continue.'
        : 'Wallet is frozen and needs review before payouts can continue.',
  });
}

function resolveWalletStatusValue(
  status: 'active' | 'limited' | 'frozen' | 'closed' | 'unavailable',
): 'active' | 'limited' | 'frozen' | 'closed' {
  if (status === 'closed') {return 'closed';}
  if (status === 'frozen') {return 'frozen';}
  return 'unavailable';
}

function pickNextStepId(steps: TrustCenterStatus['steps']): TrustCenterStatus['nextStepId'] {
  const ordered = [
    steps.phone,
    steps.email,
    steps.identity,
    steps.driverDocuments,
    steps.walletStanding,
  ];
  const next = ordered.find(step => step.state !== 'completed');
  return next?.id ?? null;
}

export function buildFallbackTrustCenterStatus(user: FallbackTrustUser): TrustCenterStatus {
  const verificationLevel = String(user.verificationLevel ?? 'level_0');

  const steps = {
    identity: buildIdentityStep(user, verificationLevel),
    email: buildEmailStep(user),
    phone: buildPhoneStep(user),
    driverDocuments: buildDriverDocsStep(user, verificationLevel),
    walletStanding: buildWalletStep(user),
  };
  const allSteps = Object.values(steps);

  return {
    fetchedAt: new Date().toISOString(),
    verificationLevel,
    completedSteps: allSteps.filter(step => step.state === 'completed').length,
    totalSteps: allSteps.length,
    nextStepId: pickNextStepId(steps),
    blockedSteps: allSteps.filter(step => step.state === 'failed').map(step => step.id),
    reviewHistory: [],
    steps,
  };
}
