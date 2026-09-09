import { describe, it, expect } from 'vitest';
import { maskPhoneNumber, maskCustomerName } from '@/shared/privacy/masking';

describe( 'Privacy & Data Masking', () => {
  it( 'masks phone numbers safely', () => {
    expect( maskPhoneNumber( '0791234567' ) ).toBe( '079***4567' );
    expect( maskPhoneNumber( '0789991122' ) ).toBe( '078***1122' );
    expect( maskPhoneNumber( '+962791234567' ) ).toBe( '+96***4567' );
    expect( maskPhoneNumber( '123' ) ).toBe( '***' );
    expect( maskPhoneNumber( '' ) ).toBe( '***' );
  } );

  it( 'masks customer names safely', () => {
    expect( maskCustomerName( 'Ahmad Al-Khalil' ) ).toBe( 'Ahmad A.' );
    expect( maskCustomerName( 'Sara Majali' ) ).toBe( 'Sara M.' );
    expect( maskCustomerName( 'Tariq' ) ).toBe( 'Tariq' );
    expect( maskCustomerName( '' ) ).toBe( 'Customer' );
  } );
} );

