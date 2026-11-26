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
export function isValidJordanCliqPhone ( phone: string ): boolean {
  const cleaned = phone.replace( /[\s\-+]/g, '' );
  // Matches 077..., 078..., 079... or 96277..., 96278..., 96279...
  return /^(?:(?:00962|962|0)?7[789]\d{7})$/.test( cleaned );
}

/**
 * Validates a Jordanian IBAN (28 characters, starts with JO).
 */
export function isValidJordanIban ( iban: string ): boolean {
  const cleaned = iban.replace( /\s/g, '' ).toUpperCase();
  // JO IBANs are exactly 30 characters: JO(2) + check(2) + bank(4) + account(22)
  return /^JO\d{2}[A-Z]{4}\d{22}$/.test( cleaned );
}

/**
 * Generates an EMVCo-compatible QR string or deep link for Jordanian banking applications.
 *
 * AMOUNT FORMAT: JoPACC expects `amount` as a JOD decimal string with exactly 3 decimal
 * places (e.g. "1.000" for one dinar). This is NOT fils/minor units — do not multiply by
 * 1000. The deeplink passes amountJod directly via `.toFixed(3)`.
 *
 * SANDBOX VERIFICATION REQUIRED: before go-live, run a 1.000 JOD test deposit in the
 * JoPACC sandbox and confirm the receiver ledger shows exactly 1 JOD (not 1000).
 * Log the sandbox receipt transactionId here once verified.
 *
 * Ref: CBJ JoPACC Instant Payment Scheme Specifications v3.x, Section 4.2.1 (Amount Field).
 */
export function generateJordanCliqDeeplink ( req: CliqPaymentRequest ): string {
  const amountFormatted = req.amountJod.toFixed( 3 );
  const cleanId = encodeURIComponent( req.identifierValue.trim() );
  const ref = encodeURIComponent( req.orderOrBookingId );
  const note = encodeURIComponent( req.note || `Wasel #${ req.orderOrBookingId }` );

  return `jopacc://cliq?type=${ req.identifierType }&id=${ cleanId }&amount=${ amountFormatted }&currency=JOD&ref=${ ref }&note=${ note }`;
}

/**
 * Formats a QR code payload readable by JoPACC mobile banking scanners.
 */
export function generateJordanCliqQrPayload ( req: CliqPaymentRequest ): string {
  const amountFormatted = req.amountJod.toFixed( 3 );
  return [
    'CLIQ_JO',
    `TYPE:${ req.identifierType }`,
    `ID:${ toQrField( req.identifierValue ) }`,
    `AMT:${ amountFormatted }`,
    'CUR:JOD',
    `REF:${ toQrField( req.orderOrBookingId ) }`,
  ].join( '|' );
}

/**
 * The QR payload is pipe-delimited, so a field value must never carry the delimiter or a
 * control character: a recipient alias such as "WASEL|AMT:0.001" would otherwise inject a
 * second AMT field that a scanner may read instead of the real amount.
 */
function toQrField ( value: string ): string {
  return String( value )
    .split( '' )
    .filter( char => char !== '|' && char.charCodeAt( 0 ) > 31 && char.charCodeAt( 0 ) !== 127 )
    .join( '' )
    .trim();
}

