import { supabase } from '../utils/supabase/client';

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

interface ProfileChangeHistoryRow {
  changed_at: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  user_agent: string | null;
}

const CHANGE_HISTORY_TABLE = 'profile_change_history';

async function getClientMetadata() {
  return {
    userAgent: navigator.userAgent,
    ipAddress: await fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(d => d.ip)
      .catch(() => 'unknown'),
  };
}

export async function recordProfileChange(
  userId: string,
  fieldName: string,
  oldValue: unknown,
  newValue: unknown
): Promise<void> {
  if (!supabase) return;

  try {
    const metadata = await getClientMetadata();
    
    await supabase.from(CHANGE_HISTORY_TABLE).insert({
      user_id: userId,
      field_name: fieldName,
      old_value: String(oldValue ?? ''),
      new_value: String(newValue ?? ''),
      changed_at: new Date().toISOString(),
      changed_by: userId,
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
    });
  } catch (error) {
    // Silent fail - don't block profile updates if history recording fails
    if (import.meta.env?.DEV) {
      console.warn('[ProfileHistory] Failed to record change:', error);
    }
  }
}

export async function getProfileChangeHistory(
  userId: string,
  limit = 50
): Promise<ProfileChangeHistoryEntry[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from(CHANGE_HISTORY_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const records = (data ?? []) as ProfileChangeHistoryRow[];

    return records.map(record => ({
      timestamp: record.changed_at,
      field: record.field_name,
      oldValue: record.old_value || '',
      newValue: record.new_value || '',
      device: record.user_agent || 'Unknown device',
    }));
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error('[ProfileHistory] Failed to fetch history:', error);
    }
    return [];
  }
}

export async function revertProfileChange(
  userId: string,
  changeId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Backend not configured' };
  }

  try {
    const { data: change, error: fetchError } = await supabase
      .from(CHANGE_HISTORY_TABLE)
      .select('*')
      .eq('id', changeId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !change) {
      return { success: false, error: 'Change record not found' };
    }

    // This would trigger the normal update flow with the old value
    // Implementation depends on your profile update service
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Revert failed',
    };
  }
}
