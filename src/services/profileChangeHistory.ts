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

export async function recordProfileChange(
  userId: string,
  fieldName: string,
  oldValue: unknown,
  newValue: unknown,
): Promise<void> {
  void userId;
  void fieldName;
  void oldValue;
  void newValue;
}

export async function getProfileChangeHistory(
  userId: string,
  limit = 50,
): Promise<ProfileChangeHistoryEntry[]> {
  void userId;
  void limit;
  return [];
}

export async function revertProfileChange(
  userId: string,
  changeId: string,
): Promise<{ success: boolean; error?: string }> {
  void userId;
  void changeId;
  return { success: false, error: 'Profile change revert is handled by the backend audit workflow.' };
}
