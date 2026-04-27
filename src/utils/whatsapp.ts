import { getWhatsAppSupportUrl } from './env';
import { canonicalizePhoneNumber } from './phone';

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const normalizedPhone = canonicalizePhoneNumber(phone);
  if (!normalizedPhone) {
    return '';
  }

  return `https://wa.me/${normalizedPhone.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`;
}

export function buildPreferredWhatsAppUrl(args: {
  phone?: string | null;
  message: string;
  fallbackMessage?: string;
}): string {
  return (
    buildWhatsAppUrl(args.phone, args.message) ||
    getWhatsAppSupportUrl(args.fallbackMessage ?? args.message)
  );
}

export function hasWhatsAppContact(phone: string | null | undefined): boolean {
  return Boolean(canonicalizePhoneNumber(phone));
}
