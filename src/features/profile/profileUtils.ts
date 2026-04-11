import { canonicalizePhoneNumber } from '../../utils/phone';

export function getProfileInitials(name?: string | null) {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'WU';
}

export function normalizeProfilePhone(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return '';

  return canonicalizePhoneNumber(trimmed);
}

export function buildProfileExportPayload(user: {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  trips?: number;
  rating?: number;
  joinedAt?: string;
  verificationLevel?: string;
  trustScore?: number;
  walletStatus?: string;
}) {
  return {
    name: user.name ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    role: user.role ?? 'rider',
    trips: user.trips ?? 0,
    rating: user.rating ?? 0,
    joinedAt: user.joinedAt ?? '',
    verificationLevel: user.verificationLevel ?? 'level_0',
    trustScore: user.trustScore ?? 0,
    walletStatus: user.walletStatus ?? 'active',
  };
}
