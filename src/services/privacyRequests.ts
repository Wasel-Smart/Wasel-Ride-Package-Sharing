import { supabase } from '@/services/core';

type PrivacyRequestType = 'data_export' | 'account_deletion';

function requireUserId(userId: string | undefined): string {
  if (!userId?.trim()) {
    throw new Error('You must be signed in to submit this request.');
  }

  return userId;
}

async function getCurrentUserId(): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  return requireUserId(data.user?.id);
}

async function requestPrivacyAction(type: PrivacyRequestType): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const userId = await getCurrentUserId();
  const rpcName =
    type === 'data_export' ? 'request_data_export' : 'request_account_deletion';

  const { error } = await supabase.rpc(rpcName, {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }
}

export function requestDataExport(): Promise<void> {
  return requestPrivacyAction('data_export');
}

export function requestAccountDeletion(): Promise<void> {
  return requestPrivacyAction('account_deletion');
}

export async function signOutAfterAccountDeletion(): Promise<void> {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

