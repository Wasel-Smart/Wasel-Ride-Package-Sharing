/**
 * Wasel Platform - Jordan CliQ (JoPACC) Instant Payment Domain
 * Conforms to Central Bank of Jordan / JoPACC instant payment specifications.
 */

export type CliqIdentifierType = 'alias' | 'phone' | 'iban';

export interface CliqPaymentRequest {
  identifierType: CliqIdentifierType;
  identifierValue: string; // e.g., "WASELJO", "0791234567", or "JO..."
  amountJod: number;       // Currency in Jordanian Dinars (3 decimal places)
  orderOrBookingId: string;
  recipientName?: string;
  note?: string;
}

export interface CliqPaymentReceipt {
  transactionId: string;
  referenceId: string;
  amountJod: number;
  paidAt: string;
  senderPhone?: string;
  status: 'pending' | 'verified' | 'failed' | 'refunded';
}

/**
 * Validates a Jordanian phone number for CliQ (must start with 077, 078, or 079).
 */
export function isValidJordanCliqPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-+]/g, '');
  // Matches 077..., 078..., 079... or 96277..., 96278..., 96279...
  return /^(?:(?:00962|\+962|0)?7[789]\d{7})$/.test(cleaned);
}

/**
 * Validates a Jordanian IBAN (28 characters, starts with JO).
 */
export function isValidJordanIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return /^JO\d{2}[A-Z]{4}\d{20}$/.test(cleaned);
}

/**
 * Generates an EMVCo-compatible QR string or deep link for Jordanian banking applications.
 */
export function generateJordanCliqDeeplink(req: CliqPaymentRequest): string {
  const amountFormatted = req.amountJod.toFixed(3);
  const cleanId = encodeURIComponent(req.identifierValue.trim());
  const ref = encodeURIComponent(req.orderOrBookingId);
  const note = encodeURIComponent(req.note || `Wasel #${req.orderOrBookingId}`);

  return `jopacc://cliq?type=${req.identifierType}&id=${cleanId}&amount=${amountFormatted}&currency=JOD&ref=${ref}&note=${note}`;
}

/**
 * Formats a QR code payload readable by JoPACC mobile banking scanners.
 */
export function generateJordanCliqQrPayload(req: CliqPaymentRequest): string {
  const amountFormatted = req.amountJod.toFixed(3);
  return [
    'CLIQ_JO',
    `TYPE:${req.identifierType}`,
    `ID:${req.identifierValue.trim()}`,
    `AMT:${amountFormatted}`,
    'CUR:JOD',
    `REF:${req.orderOrBookingId}`,
  ].join('|');
}
