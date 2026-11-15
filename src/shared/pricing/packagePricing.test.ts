import { describe, expect, it } from 'vitest';
import { calculatePackageDeliveryFee } from '../../../supabase/functions/_shared/package-pricing';
import { calculateDirectPrice } from './priceCalculator';

describe('package pricing parity', () => {
  it.each([0.5, 1, 1.5, 2, 5])('keeps the checkout and edge quote aligned at %s kg', weightKg => {
    expect(calculatePackageDeliveryFee(weightKg)).toBe(
      calculateDirectPrice('package', weightKg, 8).price,
    );
  });
});
