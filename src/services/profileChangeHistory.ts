import { requestEdgeJson } from './backendWorkflow';

export interface ProfileChangeRecord {
  id: string;
  userId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ProfileChangeHistoryEntry {
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  device: string;
}

interface ProfileChangeHistoryResponse {
  history?: ProfileChangeHistoryEntry[];
}

async function getClientMetadata() {
  return {
    userAgent: navigator.userAgent,
  };
}

export async function recordProfileChange(
  userId: string,
  fieldName: string,
  oldValue: unknown,
  newValue: unknown,
): Promise<void> {
  try {
    const metadata = await getClientMetadata();

    await requestEdgeJson({
      path: '/profile/change-history',
      operation: 'Profile change history recording',
      authMode: 'required',
      method: 'POST',
      body: {
        userId,
        fieldName,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
        userAgent: metadata.userAgent,
      },
      retries: 0,
    });
  } catch (error) {
    // Silent fail - don't block profile updates if history recording fails.
    if (import.meta.env?.DEV) {
      console.warn('[ProfileHistory] Failed to record change:', error);
    }
  }
}

export async function getProfileChangeHistory(
  userId: string,
  limit = 50,
): Promise<ProfileChangeHistoryEntry[]> {
  try {
    const params = new URLSearchParams({
      userId,
      limit: String(limit),
    });

    const response = await requestEdgeJson<ProfileChangeHistoryResponse>({
      path: `/profile/change-history?${params.toString()}`,
      operation: 'Profile change history retrieval',
      authMode: 'required',
      method: 'GET',
    });

    return response.history ?? [];
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error('[ProfileHistory] Failed to fetch history:', error);
    }
    return [];
  }
}

export async function revertProfileChange(
  userId: string,
  changeId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    return await requestEdgeJson<{ success: boolean; error?: string }>({
      path: '/profile/change-history/revert',
      operation: 'Profile change revert',
      authMode: 'required',
      method: 'POST',
      body: { userId, changeId },
      retries: 0,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Revert failed',
    };
  }
}
