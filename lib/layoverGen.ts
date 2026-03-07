import { Flight, SearchParams, generateFlights } from './flightGen';
import airports from '@/data/airports.json';
import { haversine } from './geo';
import { DateTime } from 'luxon';
import seedrandom from 'seedrandom';
import { GLOBAL_RNG_SEED } from './flightConfig';

// Extended flight interface for layover flights
export interface LayoverFlight extends Omit<Flight, 'depart' | 'arrive' | 'durationMin'> {
  segments: FlightSegment[];
  totalDurationMin: number;
  layoverDurationMin: number;
  layoverAirport: string;
  // Keep original depart/arrive for the full journey
  depart: string;  // First segment departure
  arrive: string;  // Last segment arrival
}

export interface FlightSegment {
  flightNumber: string;
  airline: string;
  airlineName: string;
  aircraft: string;
  depart: string;
  arrive: string;
  durationMin: number;
  origin: string;
  destination: string;
}

// Configuration constants
const MAX_HUB_SCORE = 2; // Only consider hubs with score 1 or 2 (biggest airports)
const MAX_DETOUR_FACTOR = 1.5; // 50% max detour
const MIN_CONNECTION_MINUTES = 45;
const MAX_CONNECTION_HOURS = 4;
const MAX_HUBS_TO_CONSIDER = 5;
const MAX_OUTBOUND_FLIGHTS = 3;
const MAX_CONNECTIONS_PER_OUTBOUND = 2;
const MAX_LAYOVER_RESULTS = 10;
const LAYOVER_PRICE_FACTOR = 0.9; // Slight discount for connecting flight
const MIN_DISTANCE_KM = 500; // Minimum distance for layovers

// Type guard to check if a flight is a layover flight
export function isLayoverFlight(flight: Flight | LayoverFlight): flight is LayoverFlight {
  return 'segments' in flight && 'layoverAirport' in flight;
}

/**
 * Find viable hub airports for connecting flights between origin and destination
 */
function findViableHubs(origin: string, dest: string): string[] {
  const originAirport = airports.find(a => a.iata === origin);
  const destAirport = airports.find(a => a.iata === dest);
  
  if (!originAirport || !destAirport) return [];
  
  const directDistance = haversine(origin, dest);
  const maxDetour = directDistance * MAX_DETOUR_FACTOR;
  
  // For very short flights (< MIN_DISTANCE_KM), layovers don't make sense
  if (directDistance < MIN_DISTANCE_KM) {
    return [];
  }
  
  // Start with all airports
  let candidates = airports;
  
  // Filter by hub score (now inverted: 1=biggest, 5=smallest)
  candidates = candidates.filter(hub => hub.hubScore <= MAX_HUB_SCORE);
  
  // Filter out origin and destination
  candidates = candidates.filter(hub => hub.iata !== origin && hub.iata !== dest);
  
  // Filter by geographic viability
  candidates = candidates.filter(hub => {
    const leg1 = haversine(origin, hub.iata);
    const leg2 = haversine(hub.iata, dest);
    const totalDistance = leg1 + leg2;
    
    // Avoid backtracking and excessive detours
    if (totalDistance > maxDetour) return false;
    
    // Both legs should be reasonable (not too short)
    if (leg1 < 200 || leg2 < 200) return false;
    
    return true;
  });
  
  // Filter by airline compatibility
  // candidates = candidates.filter(hub => {
  //   const hubAirlines = Object.keys(hub.airlines || {});
  //   const originAirlines = Object.keys(originAirport.airlines || {});
  //   const destAirlines = Object.keys(destAirport.airlines || {});
    
  //   // Hub should have airlines that also serve origin and destination
  //   const viableForOrigin = hubAirlines.some(airline => originAirlines.includes(airline));
  //   const viableForDest = hubAirlines.some(airline => destAirlines.includes(airline));
    
  //   return viableForOrigin && viableForDest;
  // });
  
  // Sort and limit
  const viableHubs = candidates
    .sort((a, b) => {
      // Deterministic multi-key sort:
      // 1) hubScore ascending (1 = biggest hub)
      // 2) routeCount descending (higher = better)
      // 3) lexicographic IATA code as final tiebreaker (guarantees no 0 return)
      if (a.hubScore !== b.hubScore) return a.hubScore - b.hubScore;
      if (a.routeCount !== b.routeCount) return b.routeCount - a.routeCount;
      return a.iata.localeCompare(b.iata);
    })
    .slice(0, MAX_HUBS_TO_CONSIDER);
  
  return viableHubs.map(hub => hub.iata);
}

/**
 * Generate layover flights for a given route
 */
export function generateLayoverFlights(
  params: SearchParams,
  seedVersion: number = GLOBAL_RNG_SEED
): LayoverFlight[] {
  const { origin, dest, date, cabin } = params;
  
  // Find viable hub airports
  const hubs = findViableHubs(origin, dest);
  if (hubs.length === 0) return [];
  
  const layoverFlights: LayoverFlight[] = [];
  const rng = seedrandom(`${seedVersion}|layover|${origin}|${dest}|${date}`);
  
  for (const hub of hubs) {
    // Generate flights for first leg (origin -> hub)
    const leg1Flights = generateFlights({
      origin,
      dest: hub,
      date,
      cabin
    }, seedVersion);
    
    if (leg1Flights.length === 0) continue;
    
    // Consider only top outbound flights to limit combinations
    const outboundFlights = leg1Flights.slice(0, MAX_OUTBOUND_FLIGHTS);
    
    for (const outbound of outboundFlights) {
      const arrivalTime = DateTime.fromISO(outbound.arrive, { setZone: true });
      
      // Calculate connection window
      const minConnectionTime = arrivalTime.plus({ minutes: MIN_CONNECTION_MINUTES });
      const maxConnectionTime = arrivalTime.plus({ hours: MAX_CONNECTION_HOURS });
      
      // Determine the date for searching connecting flights
      // If arrival is late in the day, we might need next day's flights
      const connectionDate = minConnectionTime.toISODate();
      if (!connectionDate) continue;
      
      // Generate connecting flights (hub -> dest)
      const leg2Flights = generateFlights({
        origin: hub,
        dest,
        date: connectionDate,
        cabin
      }, seedVersion);
      
      if (leg2Flights.length === 0) continue;
      
      // Find compatible connections
      const validConnections = leg2Flights.filter(flight => {
        const departTime = DateTime.fromISO(flight.depart, { setZone: true });
        return departTime >= minConnectionTime && departTime <= maxConnectionTime;
      });
      
      // Create layover flights from valid combinations
      const connectionsToUse = validConnections.slice(0, MAX_CONNECTIONS_PER_OUTBOUND);
      
      for (const connection of connectionsToUse) {
        const connectionDepartTime = DateTime.fromISO(connection.depart, { setZone: true });
        const layoverDuration = Math.round(
          connectionDepartTime.diff(arrivalTime, 'minutes').minutes
        );
        
        const totalDuration = outbound.durationMin + connection.durationMin + layoverDuration;
        
        // Calculate combined price with slight discount for inconvenience
        const basePrice = outbound.priceUsd + connection.priceUsd * LAYOVER_PRICE_FACTOR;
        
        // Add some randomness to price (±5%)
        const priceVariation = 0.95 + rng() * 0.1;
        const totalPrice = Math.round(basePrice * priceVariation);
        
        // Combined emissions
        const totalEmissions = Math.round(outbound.emissions + connection.emissions * 1.1); // Slight increase for takeoff/landing
        
        // Prefer same airline connections
        const sameAirline = outbound.airline === connection.airline;
        
        // Combine cabin pricing from both segments
        const combinedCabinPricing = outbound.cabinPricing.map(outboundCabin => {
          const connectionCabin = connection.cabinPricing.find(cp => cp.cabin === outboundCabin.cabin);
          
          // Layover flight is only available if both segments have seats available
          const outboundSeats = outboundCabin.seatsRemaining ?? 0;
          const connectionSeats = connectionCabin?.seatsRemaining ?? 0;
          const seatsRemaining = Math.min(outboundSeats, connectionSeats);
          
          let combinedPrice = 0;
          
          if (seatsRemaining > 0 && connectionCabin) {
            combinedPrice = Math.round((outboundCabin.priceUsd + connectionCabin.priceUsd) * LAYOVER_PRICE_FACTOR);
          }
          
          return {
            cabin: outboundCabin.cabin,
            priceUsd: combinedPrice,
            seatsRemaining
          };
        });
        
        layoverFlights.push({
          flightNumber: `${outbound.flightNumber}/${connection.flightNumber}`,
          airline: sameAirline ? outbound.airline : outbound.airline, // Primary carrier
          airlineName: sameAirline ? outbound.airlineName : `${outbound.airlineName} / ${connection.airlineName}`,
          aircraft: outbound.aircraft, // Just show first segment aircraft
          distanceKm: outbound.distanceKm + connection.distanceKm,
          priceUsd: totalPrice,
          emissions: totalEmissions,
          cabinPricing: combinedCabinPricing,
          segments: [
            {
              flightNumber: outbound.flightNumber,
              airline: outbound.airline,
              airlineName: outbound.airlineName,
              aircraft: outbound.aircraft,
              depart: outbound.depart,
              arrive: outbound.arrive,
              durationMin: outbound.durationMin,
              origin,
              destination: hub
            },
            {
              flightNumber: connection.flightNumber,
              airline: connection.airline,
              airlineName: connection.airlineName,
              aircraft: connection.aircraft,
              depart: connection.depart,
              arrive: connection.arrive,
              durationMin: connection.durationMin,
              origin: hub,
              destination: dest
            }
          ],
          totalDurationMin: totalDuration,
          layoverDurationMin: layoverDuration,
          layoverAirport: hub,
          depart: outbound.depart,  // First segment departure
          arrive: connection.arrive  // Last segment arrival
        });
      }
    }
  }
  
  // Sort by a combination of price and duration
  return layoverFlights
    .sort((a, b) => {
      // Deterministic score: first by price+dur heuristic, then by flightNumber
      const scoreA = a.priceUsd + a.totalDurationMin * 0.5;
      const scoreB = b.priceUsd + b.totalDurationMin * 0.5;
      if (scoreA !== scoreB) return scoreA - scoreB;
      // Fallback tiebreaker so comparator never returns 0 in production vs local
      return a.flightNumber.localeCompare(b.flightNumber);
    })
    .slice(0, MAX_LAYOVER_RESULTS);
}

/**
 * Combine direct and layover flights with appropriate sorting
 */
export function combineFlights(
  directFlights: Flight[],
  layoverFlights: LayoverFlight[],
  preferDirectFlights: boolean = true
): (Flight | LayoverFlight)[] {
  const allFlights = [...directFlights, ...layoverFlights];
  
  return allFlights.sort((a, b) => {
    const isLayoverA = isLayoverFlight(a);
    const isLayoverB = isLayoverFlight(b);
    
    // Calculate base scores
    let scoreA = a.priceUsd;
    let scoreB = b.priceUsd;
    
    // Add penalties/bonuses
    if (preferDirectFlights) {
      if (isLayoverA) scoreA += 50; // Penalty for layover
      if (isLayoverB) scoreB += 50;
    }
    
    // Add duration factor for layovers
    if (isLayoverA) scoreA += a.totalDurationMin * 0.3;
    if (isLayoverB) scoreB += b.totalDurationMin * 0.3;
    
    if (scoreA !== scoreB) return scoreA - scoreB;
    // Final deterministic tiebreaker
    return a.flightNumber.localeCompare(b.flightNumber);
  });
}
