import type { WaselUser } from '../contexts/LocalAuth';
import { getAuthCallbackUrl } from '../utils/env';
import { supabase } from '../utils/supabase/client';
import { requestEdgeJson, runBackendWorkflow } from './backendWorkflow';
import {
  confirmDirectTrustPhoneVerification,
  enableDirectTrustDriverMode,
  startDirectTrustPhoneVerification,
  submitDirectTrustDriverDocuments,
  submitDirectTrustIdentityVerification,
} from './directSupabase';
import { buildFallbackTrustCenterStatus, type TrustCenterStatus } from './trustCenterModel';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Trust Center request failed.';
}

async function getTrustUserId(): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client is not initialised');
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  return session.user.id;
}

export interface StartPhoneVerificationPayload {
  phoneNumber: string;
}

export interface ConfirmPhoneVerificationPayload {
  code: string;
}

export interface IdentityVerificationPayload {
  providerReference: string;
  documentReference?: string;
}

export interface DriverDocumentsPayload {
  licenseNumber: string;
  documentReference?: string;
}

export async function getTrustCenterStatus(user?: WaselUser | null): Promise<TrustCenterStatus> {
  if (!supabase) {
    if (user) return buildFallbackTrustCenterStatus(user);
    throw new Error('Supabase client is not initialised');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    if (user) return buildFallbackTrustCenterStatus(user);
    throw new Error('Not authenticated');
  }

  try {
    const payload = await requestEdgeJson<{ status: TrustCenterStatus }>({
      path: '/trust/status',
      authMode: 'required',
      operation: 'Trust Center status',
    });
    return payload.status;
  } catch (error) {
    if (user) {
      return buildFallbackTrustCenterStatus(user);
    }
    throw new Error(toErrorMessage(error), { cause: error });
  }
}

export async function startTrustPhoneVerification(payload: StartPhoneVerificationPayload) {
  const response = await runBackendWorkflow<{
    started: boolean;
    phoneNumber: string;
    expiresAt: string;
  }>({
    operation: 'Phone verification start',
    authMode: 'required',
    fallbackPolicy: 'writes-if-enabled',
    edge: context =>
      requestEdgeJson({
        path: '/trust/phone/start',
        method: 'POST',
        body: payload,
        authMode: 'required',
        context,
        operation: 'Phone verification start',
      }),
    fallback: async () => {
      const userId = await getTrustUserId();
      return startDirectTrustPhoneVerification(userId, payload.phoneNumber);
    },
  });

  return response;
}

export async function confirmTrustPhoneVerification(payload: ConfirmPhoneVerificationPayload) {
  const response = await runBackendWorkflow<{
    verified: boolean;
    phoneNumber: string;
  }>({
    operation: 'Phone verification confirmation',
    authMode: 'required',
    fallbackPolicy: 'writes-if-enabled',
    edge: context =>
      requestEdgeJson({
        path: '/trust/phone/confirm',
        method: 'POST',
        body: payload,
        authMode: 'required',
        context,
        operation: 'Phone verification confirmation',
      }),
    fallback: async () => {
      const userId = await getTrustUserId();
      return confirmDirectTrustPhoneVerification(userId);
    },
  });

  return response;
}

export async function submitTrustIdentityVerification(payload: IdentityVerificationPayload) {
  const response = await runBackendWorkflow<{
    submitted: boolean;
    verificationId: string;
  }>({
    operation: 'Identity verification submission',
    authMode: 'required',
    fallbackPolicy: 'writes-if-enabled',
    edge: context =>
      requestEdgeJson({
        path: '/trust/identity/submit',
        method: 'POST',
        body: payload,
        authMode: 'required',
        context,
        operation: 'Identity verification submission',
      }),
    fallback: async () => {
      const userId = await getTrustUserId();
      return submitDirectTrustIdentityVerification(userId, payload);
    },
  });

  return response;
}

export async function enableTrustDriverMode() {
  const response = await runBackendWorkflow<{
    enabled: boolean;
    role: 'driver';
  }>({
    operation: 'Driver mode enablement',
    authMode: 'required',
    fallbackPolicy: 'writes-if-enabled',
    edge: context =>
      requestEdgeJson({
        path: '/trust/driver-mode/enable',
        method: 'POST',
        authMode: 'required',
        context,
        operation: 'Driver mode enablement',
      }),
    fallback: context => enableDirectTrustDriverMode(context.userId ?? ''),
  });

  return response;
}

export async function submitTrustDriverDocuments(payload: DriverDocumentsPayload) {
  const response = await runBackendWorkflow<{
    submitted: boolean;
    driverId: string;
  }>({
    operation: 'Driver documents submission',
    authMode: 'required',
    fallbackPolicy: 'writes-if-enabled',
    edge: context =>
      requestEdgeJson({
        path: '/trust/driver-documents/submit',
        method: 'POST',
        body: payload,
        authMode: 'required',
        context,
        operation: 'Driver documents submission',
      }),
    fallback: context => submitDirectTrustDriverDocuments(context.userId ?? '', payload),
  });

  return response;
}

export async function resendTrustEmailConfirmation(email: string) {
  if (!supabase) {
    throw new Error('Supabase auth is not configured for email confirmation.');
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: getAuthCallbackUrl(
        typeof window !== 'undefined' ? window.location.origin : undefined,
      ),
    },
  });

  if (error) {
    throw error;
  }
}
