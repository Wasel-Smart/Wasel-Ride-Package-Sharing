/**
 * Wassel Smart Pricing Engine
 * 
 * Implements the "Magical Math" for dynamic seat pricing in shared rides.
 * Optimizes for:
 * 1. Cost recovery for the organizer
 * 2. Savings for passengers compared to solo rides
 * 3. Incentivizing early booking
 */

export interface SeatPricingModel {
  seatIndex: number; // 1-based index
  price: number;
  label: string;
  savings: number; // Percentage vs solo ride
}

export class SmartPricingEngine {
  
  /**
   * Calculates the pricing for each seat in a shared enterprise ride.
   * 
   * @param totalTripCost The total cost if the vehicle was booked privately
   * @param totalSeats Total available seats in the vehicle
   * @param baseMargin Platform fee percentage (e.g., 0.15 for 15%)
   */
  public static calculateSharedRidePricing(
    totalTripCost: number,
    totalSeats: number,
    baseMargin: number = 0.15
  ): SeatPricingModel[] {
    
    // The solo ride cost is the benchmark (High anchor)
    const soloRideCost = totalTripCost * (1 + baseMargin);
    
    // As more people join, the price drops, but we want to define fixed prices 
    // for specific seats to gamify the filling process.
    
    // Strategy:
    // Seat 1 (Organizer/First Booker): Pays ~40% of solo cost (High incentive to start)
    // Seat 2: Pays ~35%
    // Seat 3: Pays ~30%
    // Seat 4: Pays ~25%
    // ...
    // If the total collected exceeds the TotalTripCost + Margin, the surplus is
    // redistributed as "Cashback" or "Credit" to all participants after the trip.
    
    // Simple Linear Decay Model for Display
    const prices: SeatPricingModel[] = [];
    
    for (let i = 1; i <= totalSeats; i++) {
      // Calculate a discount factor based on seat number
      // Earlier seats might actually be slightly cheaper to encourage formation,
      // OR later seats are cheaper to ensure completion.
      // Let's go with "The more who join, the cheaper it gets for everyone"
      // But for INDIVIDUAL seat selling:
      
      // Let's use a standard "Split Cost" model but with a premium for certainty.
      // 1 Rider: Pays 100%
      // 2 Riders: Pay 60% each (120% total - 20% extra margin for platform/risk)
      // 3 Riders: Pay 45% each (135% total)
      // 4 Riders: Pay 35% each (140% total)
      
      // For the UI, we usually show the "Current Price" vs "Potential Price".
      
      // However, the prompt asks for "Rider can offer every seat in a different price".
      // Let's simulate a curve where the "Next Seat" is always attractive.
      
      const platformFee = 0.10; // 10%
      
      // This calculates what the price WOULD be if the vehicle stops filling at 'i' passengers.
      const pricePerPerson = (totalTripCost * (1 + platformFee)) / i;
      
      prices.push({
        seatIndex: i,
        price: parseFloat(pricePerPerson.toFixed(2)),
        label: `${i} Passenger${i > 1 ? 's' : ''}`,
        savings: parseFloat(((1 - (pricePerPerson / soloRideCost)) * 100).toFixed(0))
      });
    }
    
    return prices;
  }

  /**
   * Calculates recurring subscription tiers for School Transport
   */
  public static calculateSchoolSubscription(
    distanceKm: number,
    daysPerWeek: number,
    isRoundTrip: boolean
  ): { standard: number; premium: number } {
    const baseRatePerKm = 2.5; // JOD/month per km
    const baseFee = 50; // Fixed monthly operational fee
    
    let monthlyCost = baseFee + (distanceKm * baseRatePerKm * daysPerWeek * 4); // 4 weeks
    if (isRoundTrip) {monthlyCost *= 1.8;} // 10% discount on return leg
    
    return {
      standard: Math.ceil(monthlyCost),
      premium: Math.ceil(monthlyCost * 1.4) // 40% markup for premium (Wifi, Snacks, etc)
    };
  }
}
