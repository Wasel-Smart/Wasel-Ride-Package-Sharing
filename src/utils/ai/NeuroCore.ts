import { OrganicGrowth } from '../growth/organicGrowth';

export interface NeuroPrediction {
  demandScore: number; // 0-100
  suggestedPriceMultiplier: number; // 1.0 - 2.5
  estimatedArrival: number; // minutes
  carbonSaved: number; // kg CO2
  churnProbability: number; // 0-1
}

export interface DemandHotspot {
  lat: number;
  lng: number;
  intensity: number; // 0-100
  label: string;
}

class NeuroCoreService {
  private static instance: NeuroCoreService;
  
  // Simulated learning parameters
  private learningRate = 0.05;
  private demandMatrix: Record<string, number> = {
    'Amman': 85,
    'Zarqa': 65,
    'Irbid': 70,
    'Aqaba': 90,
    'Airport': 95
  };

  private constructor() {}

  public static getInstance(): NeuroCoreService {
    if (!NeuroCoreService.instance) {
      NeuroCoreService.instance = new NeuroCoreService();
    }
    return NeuroCoreService.instance;
  }

  /**
   * Calculates dynamic pricing based on real-time demand, supply, and user loyalty.
   */
  public calculateDynamicPricing(basePrice: number, location: string, isRushHour: boolean): { price: number, multiplier: number, reason: string } {
    const demand = this.demandMatrix[location] || 50;
    let multiplier = 1.0;

    // Demand Logic
    if (demand > 80) multiplier += 0.3;
    if (demand > 90) multiplier += 0.2;

    // Time Logic
    if (isRushHour) multiplier += 0.25;

    // AI "smoothing" to prevent extreme spikes
    multiplier = Math.min(multiplier, 2.5);
    
    // Eco-discount (subsidized by efficiency)
    const finalPrice = basePrice * multiplier;

    return {
      price: parseFloat(finalPrice.toFixed(2)),
      multiplier,
      reason: demand > 80 ? 'High Demand' : 'Standard Fare'
    };
  }

  /**
   * Optimizes route for EV efficiency and returns carbon savings.
   */
  public analyzeEVRoute(distanceKm: number, batteryLevel: number): { feasible: boolean, chargingStops: number, carbonSaved: number } {
    const avgRange = 300; // km
    const efficiency = 0.15; // kWh per km
    
    // Carbon calculation (vs petrol car ~120g/km)
    const petrolCarbon = distanceKm * 0.12; 
    const evCarbon = distanceKm * 0.02; // electricity generation footprint
    const saved = petrolCarbon - evCarbon;

    return {
      feasible: batteryLevel > (distanceKm / avgRange) * 100,
      chargingStops: distanceKm > avgRange ? Math.ceil(distanceKm / avgRange) : 0,
      carbonSaved: parseFloat(saved.toFixed(2))
    };
  }

  /**
   * Generates predictive demand hotspots for drivers.
   */
  public getPredictiveHotspots(): DemandHotspot[] {
    // In a real app, this would come from ML models analyzing historical data
    return [
      { lat: 31.9539, lng: 35.9106, intensity: 90, label: 'Abdali Boulevard (High Demand)' },
      { lat: 31.9632, lng: 35.9304, intensity: 75, label: '7th Circle' },
      { lat: 31.7226, lng: 35.9936, intensity: 95, label: 'QA Airport (Surge)' }
    ];
  }

  /**
   * Analyzes user behavior to suggest retention actions.
   */
  public getRetentionStrategy(userTrips: number, lastTripDate: Date): string | null {
    const daysSinceLastTrip = (new Date().getTime() - lastTripDate.getTime()) / (1000 * 3600 * 24);
    
    if (daysSinceLastTrip > 30) return 'offer_20_percent_discount';
    if (userTrips > 10 && daysSinceLastTrip < 7) return 'offer_loyalty_badge';
    
    return null;
  }

  /**
   * Simulates reinforcement learning from trip outcomes.
   */
  public recordTripOutcome(tripId: string, outcome: 'booked' | 'completed' | 'cancelled'): void {
    // In a real system, this would update weights in the ML model
    console.log(`[NeuroCore] Learning from trip ${tripId}: ${outcome}`);
    // Simulate updating demand matrix
    if (outcome === 'booked') {
       // slightly increase demand perception for this type of trip
       this.learningRate += 0.001; 
    }
  }

  /**
   * Checks if a trip completion should trigger a "Delight Moment" via the Organic Growth Engine.
   * This is part of the "Shine From Within" philosophy.
   */
  public checkTripDelight(userId: string): { triggered: boolean, type?: string } {
    return OrganicGrowth.checkForDelightMoment(userId);
  }

  /**
   * Calculates the dynamic price per seat for shared enterprise rides.
   * The more people join, the lower the price per person drops, incentivizing network effects.
   */
  public calculateSharedRidePricing(totalTripCost: number, currentPassengers: number, capacity: number): { pricePerSeat: number, savings: number, nextPrice: number } {
    // Base logic:
    // 1 passenger: Pays 100% + 20% margin
    // 2 passengers: Pay 60% each (120% total)
    // 3 passengers: Pay 45% each (135% total)
    // 4 passengers: Pay 35% each (140% total)
    
    // Formula: Total collection target = Cost * (1.2 + (passengers * 0.05)) (Margin increases slightly with volume)
    // Price per person = Total collection target / passengers
    
    const calculateForN = (n: number) => {
        if (n === 0) return totalTripCost * 1.2;
        const targetCollection = totalTripCost * (1.2 + ((n - 1) * 0.05));
        return targetCollection / n;
    };

    const currentPrice = calculateForN(currentPassengers);
    const nextPrice = calculateForN(currentPassengers + 1);
    
    // Savings compared to solo ride
    const soloPrice = calculateForN(1);
    const savings = soloPrice - currentPrice;

    return {
      pricePerSeat: parseFloat(currentPrice.toFixed(2)),
      savings: parseFloat(savings.toFixed(2)),
      nextPrice: parseFloat(nextPrice.toFixed(2))
    };
  }
}

export const NeuroCore = NeuroCoreService.getInstance();
