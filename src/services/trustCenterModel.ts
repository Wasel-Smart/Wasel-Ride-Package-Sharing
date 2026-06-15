export type TrustStepId =
  | 'identity'
  | 'email'
  | 'phone'
  | 'driver_documents'
  | 'wallet_standing';

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
  role: 'rider' | 'driver' | 'both';
  licenseNumber: string | null;
}

export interface WalletStandingStepMeta {
  walletStatus: 'active' | 'limited' | 'frozen' | 'closed' | 'unavailable';
}

export interface TrustCenterStatus {
  fetchedAt: string;
  verificationLevel: string;
  completedSteps: number;
  totalSteps: number;
  nextStepId: TrustStepId | null;
  blockedSteps: TrustStepId[];
  steps: {
    identity: TrustStepStatus<IdentityStepMeta>;
    email: TrustStepStatus<EmailStepMeta>;
    phone: TrustStepStatus<PhoneStepMeta>;
    driverDocuments: TrustStepStatus<DriverDocumentsStepMeta>;
    walletStanding: TrustStepStatus<WalletStandingStepMeta>;
  };
}

type FallbackTrustUser = {
  role: 'rider' | 'driver' | 'both';
  verificationLevel: string;
  email?: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  walletStatus: 'active' | 'limited' | 'frozen' | 'closed';
  sanadVerified?: boolean;
  verified?: boolean;
};

function buildStatus<TMeta>(
  id: TrustStepId,
  state: TrustStepState,
  detail: string,
  meta: TMeta,
  options?: {
    failureReason?: string | null;
    updatedAt?: string | null;
  },
): TrustStepStatus<TMeta> {
  return {
    id,
    state,
    detail,
    failureReason: options?.failureReason ?? null,
    updatedAt: options?.updatedAt ?? null,
    meta,
  };
}

function pickNextStepId(
  steps: TrustCenterStatus['steps'],
): TrustCenterStatus['nextStepId'] {
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
  const identityComplete =
    Boolean(user.sanadVerified || user.verified) ||
    verificationLevel === 'level_2' ||
    verificationLevel === 'level_3';

  const identity = identityComplete
    ? buildStatus(
        'identity',
        'completed',
        'Identity verification is complete.',
        {
          providerReference: null,
          documentReference: null,
        },
      )
    : buildStatus(
        'identity',
        verificationLevel === 'level_1' ? 'in_progress' : 'not_started',
        verificationLevel === 'level_1'
          ? 'Identity verification is still in progress.'
          : 'Submit Sanad verification to continue.',
        {
          providerReference: null,
          documentReference: null,
        },
      );

  const email = buildStatus(
    'email',
    user.emailVerified ? 'completed' : user.email ? 'in_progress' : 'not_started',
    user.emailVerified
      ? 'Email is verified.'
      : user.email
        ? 'Email confirmation is still required.'
        : 'Add an email address to continue.',
    {
      email: user.email ?? null,
    },
  );

  const phone = buildStatus(
    'phone',
    user.phoneVerified ? 'completed' : user.phone ? 'not_started' : 'not_started',
    user.phoneVerified
      ? 'Phone number is verified.'
      : user.phone
        ? 'Send a verification code to confirm this phone number.'
        : 'Add a phone number to receive a verification code.',
    {
      phone: user.phone ?? null,
      expiresAt: null,
    },
  );

  const driverDocuments =
    user.role === 'driver' || user.role === 'both'
      ? verificationLevel === 'level_3'
        ? buildStatus(
            'driver_documents',
            'completed',
            'Driver documents are approved.',
            {
              role: user.role,
              licenseNumber: null,
            },
          )
        : buildStatus(
            'driver_documents',
            verificationLevel === 'level_2' ? 'in_progress' : 'not_started',
            verificationLevel === 'level_2'
              ? 'Driver documents are waiting for final review.'
              : 'Submit driver license and compliance documents.',
            {
              role: user.role,
              licenseNumber: null,
            },
          )
      : buildStatus(
          'driver_documents',
          'not_started',
          'Enable Driver mode before submitting driver documents.',
          {
            role: user.role,
            licenseNumber: null,
          },
        );

  const walletStanding: TrustCenterStatus['steps']['walletStanding'] =
    user.walletStatus === 'active'
      ? buildStatus(
          'wallet_standing',
          'completed',
          'Wallet standing is healthy.',
          {
            walletStatus: 'active',
          },
        )
      : user.walletStatus === 'limited'
        ? buildStatus(
            'wallet_standing',
            'in_progress',
            'Wallet standing is limited and may block some actions.',
            {
              walletStatus: 'limited',
            },
          )
        : buildStatus(
            'wallet_standing',
            'failed',
            `Wallet standing is ${user.walletStatus}.`,
            {
              walletStatus:
                user.walletStatus === 'closed'
                  ? 'closed'
                  : user.walletStatus === 'frozen'
                    ? 'frozen'
                    : 'unavailable',
            },
            {
              failureReason:
                user.walletStatus === 'closed'
                  ? 'Wallet is closed and must be restored before payouts can continue.'
                  : 'Wallet is frozen and needs review before payouts can continue.',
            },
          );

  const steps = {
    identity,
    email,
    phone,
    driverDocuments,
    walletStanding,
  };
  const allSteps = Object.values(steps);

  return {
    fetchedAt: new Date().toISOString(),
    verificationLevel,
    completedSteps: allSteps.filter(step => step.state === 'completed').length,
    totalSteps: allSteps.length,
    nextStepId: pickNextStepId(steps),
    blockedSteps: allSteps.filter(step => step.state === 'failed').map(step => step.id),
    steps,
  };
}
