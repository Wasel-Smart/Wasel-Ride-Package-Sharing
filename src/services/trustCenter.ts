import type { WaselUser } from '../contexts/LocalAuth';
import { getAuthCallbackUrl } from '../utils/env';
import { supabase } from '../utils/supabase/client';
import { requestEdgeJson, runBackendWorkflow } from './backendWorkflow';
import { enableDirectTrustDriverMode, submitDirectTrustDriverDocuments } from './directSupabase';
import { buildFallbackTrustCenterStatus, type TrustCenterStatus } from './trustCenterModel';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Trust Center request failed.';
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
    throw new Error(toErrorMessage(error));
  }
}

export async function startTrustPhoneVerification(payload: StartPhoneVerificationPayload) {
  const response = await requestEdgeJson<{
    started: boolean;
    phoneNumber: string;
    expiresAt: string;
  }>({
    path: '/trust/phone/start',
    method: 'POST',
    body: payload,
    authMode: 'required',
    operation: 'Phone verification start',
  });

  return response;
}

export async function confirmTrustPhoneVerification(payload: ConfirmPhoneVerificationPayload) {
  const response = await requestEdgeJson<{
    verified: boolean;
    phoneNumber: string;
  }>({
    path: '/trust/phone/confirm',
    method: 'POST',
    body: payload,
    authMode: 'required',
    operation: 'Phone verification confirmation',
  });

  return response;
}

export async function submitTrustIdentityVerification(payload: IdentityVerificationPayload) {
  const response = await requestEdgeJson<{
    submitted: boolean;
    verificationId: string;
  }>({
    path: '/trust/identity/submit',
    method: 'POST',
    body: payload,
    authMode: 'required',
    operation: 'Identity verification submission',
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
