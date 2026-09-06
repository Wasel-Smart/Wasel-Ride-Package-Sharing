import { describe, expect, it } from 'vitest';
import { evaluateTrustCapability } from '../../src/services/trustRules';

const baseUser = {
    role: 'driver' as const,
    verificationLevel: 'level_3',
    walletStatus: 'active' as const,
    trustScore: 90,
    phoneVerified: true,
    emailVerified: true,
    driverStatus: 'approved' as const,
};

describe( 'ride publishing trust gate', () => {
    it( 'requires final driver approval', () => {
        const result = evaluateTrustCapability( { ...baseUser, driverStatus: 'pending_approval' }, 'offer_ride' );

        expect( result.allowed ).toBe( false );
        expect( result.reason ).toContain( 'Driver approval' );
    } );

    it( 'allows an approved level-three driver', () => {
        const result = evaluateTrustCapability( { ...baseUser, driverStatus: 'approved' }, 'offer_ride' );

        expect( result.allowed ).toBe( true );
    } );

    it( 'accepts both-role users only after approval', () => {
        const result = evaluateTrustCapability(
            { ...baseUser, role: 'both', driverStatus: 'approved' },
            'offer_ride',
        );

        expect( result.allowed ).toBe( true );
    } );
} );
