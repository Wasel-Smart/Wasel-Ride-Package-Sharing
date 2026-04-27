export const AUTH_DOMAIN_EVENTS = {
  signedIn: 'auth.user.signed_in',
  signedOut: 'auth.user.signed_out',
  signedUp: 'auth.user.signed_up',
  verificationRequested: 'auth.user.verification_requested',
} as const;

export interface AuthSignedInPayload {
  email: string;
  userId?: string;
}

export interface AuthSignedUpPayload {
  email: string;
  requiresEmailConfirmation?: boolean;
  userId?: string;
}
