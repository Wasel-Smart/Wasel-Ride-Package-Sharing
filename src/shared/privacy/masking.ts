/**
 * Wasel Platform - Privacy & Data Masking Utilities
 * Prevents phone number and customer PII harvesting on public tracking views.
 */

/**
 * Masks a Jordanian or international phone number for public/driver views.
 * Examples:
 *   "0791234567" -> "079***4567"
 *   "+962791234567" -> "+962 79*** 4567"
 */
export function maskPhoneNumber ( phone: string ): string {
  if ( !phone || typeof phone !== 'string' ) {
    return '***';
  }

  const cleaned = phone.trim();
  if ( cleaned.length <= 6 ) {
    return '***';
  }

  const first = cleaned.slice( 0, 3 );
  const last = cleaned.slice( -4 );
  return `${ first }***${ last }`;
}

/**
 * Masks customer name for tracking privacy.
 * Example:
 *   "Ahmad Al-Khalil" -> "Ahmad A."
 */
export function maskCustomerName ( fullName: string ): string {
  if ( !fullName || typeof fullName !== 'string' ) {
    return 'Customer';
  }

  const parts = fullName.trim().split( /\s+/ );
  if ( parts.length === 1 ) {
    return parts[ 0 ]!;
  }

  return `${ parts[ 0 ]! } ${ parts[ parts.length - 1 ]![ 0 ]!.toUpperCase() }.`;
}

