export type Language = 'en' | 'ar';
export type TranslationKey = string;

type TranslationTree = {
  [key: string]: string | TranslationTree;
};

const dictionaries: Record<Language, TranslationTree> = {
  en: {
    profile: {
      title: 'My Account',
      saved: 'Profile saved.',
      saveError: 'Could not save profile.',
      cancel: 'Cancel',
      changePhoto: 'Change photo',
      nameLabel: 'Name',
      phoneLabel: 'Phone',
      removePhoto: 'Remove photo',
      save: 'Save',
      edit: 'Edit',
      trustBody: 'Verification, trips, and wallet status stay connected.',
      storage: 'Storage',
      queue: 'Queue',
      network: 'Network',
      online: 'Online',
      offline: 'Offline',
      loading: 'Loading profile',
      guestTitle: 'Sign in to personalize Wasel',
      guestBody: 'Your trips, wallet, trust score, and support history will appear here.',
      trustTitle: 'Trust profile',
      notificationsReady: 'Notifications ready',
      notificationsBody: 'Ride, package, and wallet updates can reach this device.',
      secureSession: 'Secure session',
      secureSessionBody: 'Tokens are stored in protected device storage.',
      stats: { rating: 'Rating', trips: 'Trips', completed: 'Completed' },
      actions: {
        clearCache: 'Clear cache',
        clearQueue: 'Clear queue',
        refreshStats: 'Refresh stats',
        signOut: 'Sign out',
      },
    },
    trustCenter: {
      remainingChecks: '{remaining} checks remaining',
      loading: 'Loading Trust Center',
      eyebrow: 'Trust Center',
      title: 'Trusted movement profile',
      allResolved: 'All trust checks resolved',
      completed: 'Completed',
      inProgress: 'In progress',
      failed: 'Failed',
      notStarted: 'Not started',
      resendCode: 'Resend code',
      sendCode: 'Send code',
      enterCode: 'Enter code',
      confirmPhone: 'Confirm phone',
      resubmit: 'Resubmit',
      submitReview: 'Submit for review',
      enableDriverMode: 'Enable driver mode',
      licenseNumber: 'License number',
      documentReference: 'Document reference',
      submitDocuments: 'Submit documents',
      openWallet: 'Open wallet',
      refresh: 'Refresh',
    },
    wallet: {
      validAmount: 'Enter a valid amount',
      signInRequired: 'Sign in required',
      paymentCompleted: 'Payment completed',
      paymentFailed: 'Payment failed',
      stripeReady: 'Stripe ready',
      stripeKeyMissing: 'Stripe key missing',
      apiReady: 'API ready',
      apiUrlMissing: 'API URL missing',
      eyebrow: 'Wallet',
      title: 'Wasel wallet',
      subtitle: 'Add balance and pay securely for rides and packages.',
      currency: 'Currency',
      balance: 'Balance',
      mode: 'Mode',
      live: 'Live',
      setup: 'Setup',
      amountAccessibility: 'Top-up amount in JOD',
      amountPlaceholder: 'Amount in JOD',
      paymentSetupIncomplete: 'Payment setup incomplete',
      paymentSetupBody: 'Add Stripe and API configuration before accepting live payments.',
      paymentStatus: 'Payment status',
      openPaymentSheet: 'Open payment sheet',
      serverAuthorized: 'Server authorized',
      serverAuthorizedBody: 'Payment intents are created on the backend.',
    },
    auth: {
      signInButton: 'Sign in',
      signInTitle: 'Sign in',
      signInSubtitle: 'Continue to Wasel',
      signInErrorBody: 'Could not sign in. Please try again.',
      googleError: 'Google sign-in failed.',
      facebookError: 'Facebook sign-in failed.',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      signInError: 'Sign-in error',
      socialLoginTitle: 'Social login',
      socialLoginSubtitle: 'Use a connected account to continue.',
      continueWithGoogle: 'Continue with Google',
      continueWithFacebook: 'Continue with Facebook',
      secureSession: 'Secure session',
      secureSessionBody: 'Wasel stores session data in protected storage.',
      guestModeTitle: 'Guest mode',
      guestModeBody: 'Explore public corridors before signing in.',
    },
  },
  ar: {
    profile: {
      title: 'حسابي',
      stats: { rating: 'التقييم', trips: 'الرحلات', completed: 'مكتملة' },
    },
    trustCenter: { remainingChecks: '{remaining} فحوصات متبقية' },
  },
};

function resolveTranslation(key: TranslationKey, language: Language): string | undefined {
  const parts = key.split('.');
  let current: string | TranslationTree | undefined = dictionaries[language];

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = current[part];
  }

  return typeof current === 'string' ? current : undefined;
}

function interpolate(value: string, replacements?: Record<string, string | number>): string {
  if (!replacements) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    replacements[name] !== undefined ? String(replacements[name]) : match,
  );
}

export function t(
  key: TranslationKey,
  language: Language = 'en',
  replacements?: Record<string, string | number>,
): string {
  return interpolate(resolveTranslation(key, language) ?? resolveTranslation(key, 'en') ?? key, replacements);
}

export function getTranslations(language: Language): TranslationTree {
  return dictionaries[language];
}

export function useTranslation(language: Language) {
  return {
    t: (key: TranslationKey, replacements?: Record<string, string | number>) =>
      t(key, language, replacements),
  };
}
