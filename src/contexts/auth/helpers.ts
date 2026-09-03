import type { User } from '@supabase/auth-js';

export function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? 'Wasel',
    lastName: parts.slice(1).join(' ') || 'User',
  };
}

export function getProfileDisplayName(authUser: User) {
  const metadata = authUser.user_metadata ?? {};
  const fullName = String(metadata.full_name ?? metadata.name ?? '').trim();
  if (fullName) {
    return splitFullName(fullName);
  }

  const emailLocalPart = authUser.email?.split('@')[0]?.trim() || 'Wasel User';
  return splitFullName(emailLocalPart);
}
