import seedrandom from "seedrandom";
import airports from "@/data/airports.json";
import airlines from "@/data/airlines.json";
import planes from "@/data/planes.json";
import { haversine, toLocalIso } from "./geo";
import { DateTime } from "luxon";
import { GLOBAL_RNG_SEED } from "./flightConfig";

export type Cabin = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

// Base cost per mile for economy class (in USD)
const BASE_CPM_ECONOMY = 0.13;

export interface SearchParams {
  origin: string;
  dest: string;
  date: string;     // YYYY-MM-DD
  cabin: Cabin;
}

export interface CabinPrice {
  cabin: Cabin;
  priceUsd: number;
  seatsRemaining: number;
}

export interface Flight {
  flightNumber: string;
  airline: string;        // IATA code
  airlineName: string;    // Full airline name
  aircraft: string;       // Aircraft type
  depart: string;         // ISO-8601 local
  arrive: string;         // ISO-8601 local
  durationMin: number;
  distanceKm: number;
  cabinPricing: CabinPrice[];  // Prices and availability for each cabin class
  emissions: number;      // CO2 emissions in kg
  
  // Legacy field for backward compatibility - will be economy price or requested cabin price
  priceUsd: number;
}

/* ---------- constants ---------- */
const CRUISE_KMH = 850;
const TAXI_MIN   = 40;

const CLASS_MULT: Record<Cabin, number> = {
  ECONOMY: 1,
  PREMIUM_ECONOMY: 1.3,
  BUSINESS: 2.4,
  FIRST: 10.4,
};

// Cabin availability probabilities based on flight characteristics
const CABIN_AVAILABILITY_RATES = {
  ECONOMY: 1.0,           // All flights have economy
  PREMIUM_ECONOMY: 0.8,   // 80% of flights
  BUSINESS: 0.6,          // 60% of flights  
  FIRST: 0.3,             // 30% of flights
};

// Premium cabin availability is higher for certain factors
const PREMIUM_BOOST_FACTORS = {
  LONG_HAUL_KM: 3000,     // Flights over 3000km more likely to have premium cabins
  MAJOR_HUB_SCORE: 2,     // Major hubs (score 1-2) more likely to have premium cabins
};

// --- aircraft range heuristics ---------------------------------
const REGIONAL_CODES = new Set([
  "AT4","AT5","AT7","DH3","DH4","DH8","SF3","EM2","ER3","ER4","ERD",
  "E70","E75","E90","E95","CR2","CR7","CR9","AR1","AR7","SU9","MRJ"
]);

const WIDE_BODY_CODES = new Set([
  "332","333","338","339","340","343","346","359","35K","388",
  "744","748","764","772","773","77L","77W","788","789","78K"
]);

/* ---------- helpers ---------- */
function rangeBoost(code: string, dKm: number): number {
  if (dKm > 4000 && WIDE_BODY_CODES.has(code)) return 3;          // long-haul
  if (dKm < 800  && REGIONAL_CODES.has(code))   return 2;          // short-haul
  if (800 <= dKm && dKm <= 4000 &&
      !WIDE_BODY_CODES.has(code) && !REGIONAL_CODES.has(code)) {
    return 1.5;                                                    // mid-haul narrow-body
  }
  return 1;
}


function hubScore(iata: string) {
  return airports.find(a => a.iata === iata)?.hubScore ?? 5;
}

function isUSDomesticFlight(origin: string, dest: string): boolean {
  const originAirport = airports.find(a => a.iata === origin);
  const destAirport = airports.find(a => a.iata === dest);
  
  return originAirport?.country === "United States" && 
         destAirport?.country === "United States";
}

/**
 * Determines which cabin classes are available for a specific flight
 */
function determineCabinAvailability(
  origin: string,
  dest: string,
  distanceKm: number,
  airlineCode: string,
  flightNumber: string,
  rng: () => number
): Cabin[] {
  const availableCabins: Cabin[] = [];
  
  // Economy is always available
  availableCabins.push("ECONOMY");
  
  // Calculate boost factors for premium cabins
  const isLongHaul = distanceKm > PREMIUM_BOOST_FACTORS.LONG_HAUL_KM;
  const originHubScore = hubScore(origin);
  const destHubScore = hubScore(dest);
  const isMajorRoute = originHubScore <= PREMIUM_BOOST_FACTORS.MAJOR_HUB_SCORE || 
                       destHubScore <= PREMIUM_BOOST_FACTORS.MAJOR_HUB_SCORE;
  
  // Base multiplier for premium cabin availability
  let premiumMultiplier = 1.0;
  if (isLongHaul) premiumMultiplier *= 1.5;
  if (isMajorRoute) premiumMultiplier *= 1.3;
  
  // Premium airlines are more likely to have premium cabins
  const premiumAirlines = ["AA", "UA", "DL", "LH", "BA", "AF", "KL", "SQ", "CX", "JL", "EK", "QR", "TK"];
  if (premiumAirlines.includes(airlineCode)) {
    premiumMultiplier *= 1.4;
  }
  
  // Check each premium cabin class
  const cabinTypes: Cabin[] = ["PREMIUM_ECONOMY", "BUSINESS", "FIRST"];
  
  for (const cabinType of cabinTypes) {
    const baseRate = CABIN_AVAILABILITY_RATES[cabinType];
    const adjustedRate = Math.min(0.95, baseRate * premiumMultiplier);
    
    if (rng() < adjustedRate) {
      availableCabins.push(cabinType);
    }
  }
  
  return availableCabins;
}

/**
 * Calculates pricing and availability for each cabin class on a flight
 */
function calculateCabinPricing(
  availableCabins: Cabin[],
  basePrice: number,
  demandMultiplier: number,
  rng: () => number
): CabinPrice[] {
  const cabinPricing: CabinPrice[] = [];
  
  for (const cabin of ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] as Cabin[]) {
    const isAvailable = availableCabins.includes(cabin);
    
    if (isAvailable) {
      // Apply cabin class multiplier to base price
      let price = Math.round(basePrice * CLASS_MULT[cabin]);
      
      // Apply cabin-specific demand/volatility
      let premiumVolatility = 1;
      if (cabin === "ECONOMY") premiumVolatility = 0.85 + rng() * 0.4; // ±20% extra for economy
      else if (cabin === "PREMIUM_ECONOMY") premiumVolatility = 0.9 + rng() * 0.3; // ±15% extra
      else if (cabin === "BUSINESS") premiumVolatility = 0.8 + rng() * 0.5; // ±25% extra  
      else if (cabin === "FIRST") premiumVolatility = 0.7 + rng() * 0.7; // ±35% extra
      
      price = Math.round(price * demandMultiplier * premiumVolatility);
      
      // Simple seat availability simulation (could be enhanced further)
      const seatsRemaining = Math.floor(rng() * 20) + 1; // 1-20 seats
      
      cabinPricing.push({
        cabin,
        priceUsd: price,
        seatsRemaining
      });
    } else {
      cabinPricing.push({
        cabin,
        priceUsd: 0,
        seatsRemaining: 0
      });
    }
  }
  
  return cabinPricing;
}

function pickAirline(
  origin: string,
  dest: string,
  rng: () => number
): { code: string; name: string } {
  // Get airline distributions from origin and destination airports
  const originAirport = airports.find(a => a.iata === origin);
  const destAirport = airports.find(a => a.iata === dest);
  const isDomesticUS = isUSDomesticFlight(origin, dest);
  
  // Collect all airlines that serve either airport with their frequencies
  const airlineWeights = new Map<string, number>();
  
  // Add airlines from origin airport
  if (originAirport?.airlines) {
    for (const [code, freq] of Object.entries(originAirport.airlines)) {
      const frequency = typeof freq === 'number' ? freq : 0;
      const airline = airlines.find(al => al.code === code);
      
      // For US domestic flights, only include US airlines
      if (isDomesticUS && airline?.country !== "United States") {
        continue;
      }
      
      airlineWeights.set(code, (airlineWeights.get(code) || 0) + frequency * 2); // Weight origin higher
    }
  }
  
  // Add airlines from destination airport
  if (destAirport?.airlines) {
    for (const [code, freq] of Object.entries(destAirport.airlines)) {
      const frequency = typeof freq === 'number' ? freq : 0;
      const airline = airlines.find(al => al.code === code);
      
      // For US domestic flights, only include US airlines
      if (isDomesticUS && airline?.country !== "United States") {
        continue;
      }
      
      airlineWeights.set(code, (airlineWeights.get(code) || 0) + frequency);
    }
  }
  
  // If no airline data available, fall back to hub-based selection
  if (airlineWeights.size === 0) {
    // Filter airlines by country for US domestic flights
    const availableAirlines = isDomesticUS 
      ? airlines.filter(al => al.country === "United States")
      : airlines;
    
    // Compute weights based on airline importance and whether the airline has hubs at
    // the origin / destination airports. `hubs` can now be a list of strings (legacy)
    // or a list of objects like `{ code: "DFW", routes: 432 }` after the dataset
    // enrichment.
    const weights = availableAirlines.map(al => {
      // Base weight proportional to importance (range 0-1), fall back to 1 for
      // safety on legacy objects that lack the field.
      let w = 1 + (al.importance ?? 0);

      const hubCodes: string[] = Array.isArray(al.hubs)
        ? typeof al.hubs[0] === "string"
          // Legacy format: string[]
          ? (al.hubs as unknown as string[])
          // New format: { code: string; routes: number }[]
          : (al.hubs as { code: string }[]).map(h => h.code)
        : [];

      if (hubCodes.includes(origin)) w += 3;
      if (hubCodes.includes(dest)) w += 2;
      return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let x = rng() * total;
    for (let i = 0; i < availableAirlines.length; i++) {
      x -= weights[i] ?? 0;
      const airline = availableAirlines[i];
      if (x <= 0 && airline) return { code: airline.code, name: airline.name };
    }
    const fallbackAirline = availableAirlines[0];
    if (fallbackAirline) return { code: fallbackAirline.code, name: fallbackAirline.name };
  }
  
  // Select airline based on weighted distribution
  const totalWeight = Array.from(airlineWeights.values()).reduce((a, b) => a + b, 0);
  let x = rng() * totalWeight;
  
  for (const [code, weight] of airlineWeights.entries()) {
    x -= weight;
    if (x <= 0) {
      const airline = airlines.find(al => al.code === code);
      if (airline) {
        return { code: airline.code, name: airline.name };
      }
    }
  }
  
  // Fallback to first airline in the weights map
  const firstCode = Array.from(airlineWeights.keys())[0];
  const firstAirline = airlines.find(al => al.code === firstCode);
  return firstAirline 
    ? { code: firstAirline.code, name: firstAirline.name }
    : { code: airlines[0]?.code ?? "XX", name: airlines[0]?.name ?? "Unknown Airline" };
}

/**
 * Choose an aircraft using airline-specific frequencies first,
 * then fall back to global popularity.  Adds a simple range fit boost.
 */
function pickAircraft(
  airlineCode: string,
  distanceKm: number,
  rng: () => number
): string {
  // Define a more flexible type that matches the actual JSON structure
  type PlaneData = {
    code: string;
    name: string;
    routeCount: number;
    airlines?: Record<string, number | undefined>;
  };

  // Type assertion for the imported planes data
  const planesData = planes as PlaneData[];

  // Helper function to safely get airline frequency
  const getAirlineFrequency = (plane: PlaneData, airlineCode: string): number | undefined => {
    if (!plane.airlines) return undefined;
    return plane.airlines[airlineCode];
  };

  // Narrow to planes actually flown by this airline (with defined frequency)
  const airlineFleet = planesData.filter(p => {
    const frequency = getAirlineFrequency(p, airlineCode);
    return frequency != null && frequency > 0;
  });

  const pool = airlineFleet.length > 0 ? airlineFleet : planesData;

  // Build weights
  const weights = pool.map(p => {
    const base = airlineFleet.length > 0
      ? (getAirlineFrequency(p, airlineCode) ?? 0.001)  // airline-specific share
      : (p.routeCount || 1);                            // global fallback
    return base * rangeBoost(p.code, distanceKm);
  });

  const total = weights.reduce((a, b) => a + b, 0);
  
  // Ensure we have valid weights
  if (total <= 0) {
    return planesData[0]?.name ?? "Boeing 737";
  }

  let x = rng() * total;

  for (let i = 0; i < pool.length; i++) {
    x -= weights[i] ?? 0;
    const aircraft = pool[i];
    if (x <= 0 && aircraft) return aircraft.name;               // return full aircraft name
  }
  return pool[0]?.name ?? "Boeing 737";                             // fallback
}


function generateEmissions(rng: () => number): number {
  // Random emissions between 200-400 kg CO2
  return Math.round(200 + rng() * 200);
}

function airlineCpm(
    code: string,
    seedVersion: number
  ): number {
    const base = BASE_CPM_ECONOMY;
  
    // Enhanced jitter with wider spread, skewed toward higher prices
    // Range: [-0.02, +0.07] = 0.09 total width (was 0.035)
    const rng = seedrandom(`${seedVersion}|${code}`);
    const delta = rng() * 0.09 - 0.02;   // width 0.09, skewed positive
    return +(base + delta).toFixed(3);     // 3-dp for stability
  }

/* ---------- main ---------- */

/**
 * Generates all available flights for a route, regardless of cabin class
 * Each flight includes pricing and availability for all cabin classes
 */
function generateBaseFlights(
  origin: string,
  dest: string,
  date: string,
  seedVersion: number = GLOBAL_RNG_SEED
): Flight[] {
  if (origin === dest) return [];

  // Remove cabin from seed - flights should be consistent regardless of requested cabin
  const rng = seedrandom(`${seedVersion}|${origin}|${dest}|${date}`);

  /* feasibility & quantity */
  // With inverted hubScore (1=biggest, 5=smallest), we want lower scores for more flights
  // Convert to inverse scoring: 6 - hubScore gives us (5,4,3,2,1) → (1,2,3,4,5)
  const originHubFactor = 6 - hubScore(origin);
  const destHubFactor = 6 - hubScore(dest);
  const routeFactor = originHubFactor * destHubFactor;
  if (routeFactor < 2 && rng() < 0.8) return [];

  const daily = Math.max(1, Math.round(routeFactor * 1.2 + rng() * 3 - 1));

  /* pre-compute distance and mean duration */
  const distKm = haversine(origin, dest);
  const meanDur = distKm / CRUISE_KMH * 60 + TAXI_MIN;

  const flights: Flight[] = [];

  for (let i = 0; i < daily; i++) {
    const depMin = Math.round((i + 0.3 + 0.4 * rng()) * 1440 / daily);
    const durMin = Math.round(meanDur + (rng() - 0.5) * 15);

    const airlineInfo = pickAirline(origin, dest, rng);
    const aircraft = pickAircraft(airlineInfo.code, distKm, rng);
    const emissions = generateEmissions(rng);
    const flightNumber = `${airlineInfo.code}${100 + Math.floor(rng() * 900)}`;
    
    // Calculate base economy price (without cabin multiplier)
    const cpm = airlineCpm(airlineInfo.code, seedVersion);
    const basePrice = Math.round(distKm * 0.621 * cpm);

    /* per-flight demand/timing modifier */
    const demandMultiplier = 0.8 + rng() * 0.5; // Range: 0.8 to 1.3

    /* weekend / demand modifier */
    const dow = DateTime.fromISO(date).weekday; // 1=Mon
    const weekendMultiplier = (dow === 5 || dow === 6) ? 1.1 : 1.0;
    
    const adjustedBasePrice = Math.round(basePrice * demandMultiplier * weekendMultiplier);

    // Determine which cabin classes are available for this flight
    const availableCabins = determineCabinAvailability(
      origin, 
      dest, 
      distKm, 
      airlineInfo.code, 
      flightNumber, 
      rng
    );

    // Calculate pricing for all cabin classes
    const cabinPricing = calculateCabinPricing(
      availableCabins,
      adjustedBasePrice,
      demandMultiplier,
      rng
    );

    // Create departure time in origin timezone
    const departureIso = toLocalIso(origin, date, depMin) ?? "";
    
    // Calculate arrival time by adding duration to departure, then convert to destination timezone
    const departureDateTime = DateTime.fromISO(departureIso, { setZone: true });
    const arrivalDateTime = departureDateTime.plus({ minutes: durMin });
    
    // Get destination timezone and convert arrival time
    const destAirport = airports.find(a => a.iata === dest);
    if (!destAirport) {
      throw new Error(`Airport with IATA code "${dest}" not found`);
    }
    const arrivalIso = arrivalDateTime.setZone(destAirport.tz).toISO({ suppressMilliseconds: true }) ?? "";

    // Use economy price for legacy priceUsd field
    const economyPricing = cabinPricing.find(cp => cp.cabin === "ECONOMY");
    const legacyPrice = economyPricing?.priceUsd ?? adjustedBasePrice;

    flights.push({
      flightNumber,
      airline: airlineInfo.code,
      airlineName: airlineInfo.name,
      aircraft,
      depart: departureIso,
      arrive: arrivalIso,
      durationMin: durMin,
      distanceKm: Math.round(distKm),
      cabinPricing,
      emissions,
      priceUsd: legacyPrice, // Legacy field - economy price
    });
  }

  return flights;
}

/**
 * Main function: generates flights and filters by requested cabin availability
 */
export function generateFlights(
  params: SearchParams,
  seedVersion: number = GLOBAL_RNG_SEED
): Flight[] {
  const { origin, dest, date, cabin } = params;
  
  // Generate all base flights for the route
  const allFlights = generateBaseFlights(origin, dest, date, seedVersion);
  
  // Filter flights that have availability in the requested cabin class
  const availableFlights = allFlights.filter(flight => {
    const cabinInfo = flight.cabinPricing.find(cp => cp.cabin === cabin);
    return (cabinInfo?.seatsRemaining ?? 0) > 0;
  });

  // Update legacy priceUsd field to reflect requested cabin price
  const flightsWithRequestedPrice = availableFlights.map(flight => {
    const cabinInfo = flight.cabinPricing.find(cp => cp.cabin === cabin);
    return {
      ...flight,
      priceUsd: cabinInfo?.priceUsd ?? flight.priceUsd
    };
  });

  return flightsWithRequestedPrice.sort((a, b) => a.priceUsd - b.priceUsd);
}

/**
 * Alternative function: gets all flights with full cabin pricing information
 * Useful for APIs that want to show all flight options regardless of cabin preference
 */
export function generateAllFlights(
  origin: string,
  dest: string,
  date: string,
  seedVersion: number = GLOBAL_RNG_SEED
): Flight[] {
  return generateBaseFlights(origin, dest, date, seedVersion)
    .sort((a, b) => a.priceUsd - b.priceUsd);
}
