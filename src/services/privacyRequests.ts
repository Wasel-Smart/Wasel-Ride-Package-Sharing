import { API_URL, fetchWithRetry, getAuthDetails, supabase } from '@/services/core';

async function postPrivacyRequest(path: string): Promise<Response> {
  if (!supabase) {throw new Error('Supabase is not configured.');}
  const { token } = await getAuthDetails();
  return fetchWithRetry(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

async function readPrivacyRequestError(response: Response, fallback: string): Promise<never> {
  const payload = await response.json().catch(() => ({}));
  throw new Error(typeof payload.error === 'string' ? payload.error : fallback);
}

export function requestDataExport(): Promise<DataExportLink> {
  return requestPrivacyDataExport();
}

export type DataExportLink = { downloadUrl: string; expiresAt: number };

async function requestPrivacyDataExport(): Promise<DataExportLink> {
  const response = await postPrivacyRequest('/gdpr/data-exports');
  if (!response.ok) {
    return readPrivacyRequestError(response, 'Data export could not be created.');
  }
  const payload = await response.json() as Partial<DataExportLink>;
  if (typeof payload.downloadUrl !== 'string' || !Number.isFinite(payload.expiresAt)) {
    throw new Error('The export was created, but its download link is unavailable.');
  }
  return { downloadUrl: payload.downloadUrl, expiresAt: payload.expiresAt as number };
}

export function requestAccountDeletion(): Promise<void> {
  return postPrivacyRequest('/gdpr/deletions').then(async response => {
    if (!response.ok) {
      await readPrivacyRequestError(response, 'Account deletion could not be requested.');
    }
  });
}

export async function signOutAfterAccountDeletion(): Promise<void> {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}
