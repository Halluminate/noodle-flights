// app/api/flights/route.ts
import { NextResponse } from "next/server";
import { generateFlights, Cabin } from "@/lib/flightGen";
import { generateLayoverFlights } from "@/lib/layoverGen";
import { getAllAirportsForCity, getMajorAirportsForCountry } from "@/lib/utils";
// Server-side airport lookup functions (copied from the API endpoint)
import airports from '@/data/airports.json';

export interface Airport {
  name: string;
  city: string;
  country: string;
  iata: string;
  lat: number;
  lon: number;
  tz: string;
  routeCount: number;
  airlines: Record<string, number>;
  hubScore: number;
}

// Cache for frequently looked-up cities (server-side cache)
const cityAirportCache = new Map<string, string>();

/**
 * Finds the best airport for a given city name using dynamic lookup
 */
function findBestAirportForCity(cityName: string): string | null {
  if (!cityName) return null;
  
  // Check cache first
  const cacheKey = cityName.toLowerCase().trim();
  if (cityAirportCache.has(cacheKey)) {
    return cityAirportCache.get(cacheKey)!;
  }
  
  const normalizedCityName = cityName.toLowerCase().trim();
  
  // Find all airports for this city
  const cityAirports = (airports as Airport[]).filter(airport => 
    airport.city && airport.city.toLowerCase() === normalizedCityName
  );
  
  if (cityAirports.length === 0) {
    // Try fuzzy matching for common variations
    const fuzzyMatches = (airports as Airport[]).filter(airport => {
      if (!airport.city) return false;
      const airportCity = airport.city.toLowerCase();
      return airportCity.includes(normalizedCityName) || 
             normalizedCityName.includes(airportCity) ||
             // Handle common abbreviations
             (normalizedCityName === 'sf' && airportCity === 'san francisco') ||
             (normalizedCityName === 'nyc' && airportCity === 'new york') ||
             (normalizedCityName === 'la' && airportCity === 'los angeles') ||
             (normalizedCityName === 'dc' && airportCity === 'washington') ||
             (normalizedCityName === 'miami' && airportCity === 'miami') ||
             (normalizedCityName === 'chicago' && airportCity === 'chicago') ||
             (normalizedCityName === 'atlanta' && airportCity === 'atlanta') ||
             (normalizedCityName === 'dallas' && airportCity === 'dallas') ||
             (normalizedCityName === 'phoenix' && airportCity === 'phoenix') ||
             (normalizedCityName === 'las vegas' && airportCity === 'las vegas') ||
             (normalizedCityName === 'san diego' && airportCity === 'san diego') ||
             (normalizedCityName === 'denver' && airportCity === 'denver') ||
             (normalizedCityName === 'minneapolis' && airportCity === 'minneapolis') ||
             (normalizedCityName === 'detroit' && airportCity === 'detroit') ||
             (normalizedCityName === 'philadelphia' && airportCity === 'philadelphia') ||
             (normalizedCityName === 'orlando' && airportCity === 'orlando') ||
             (normalizedCityName === 'tampa' && airportCity === 'tampa') ||
             (normalizedCityName === 'nashville' && airportCity === 'nashville') ||
             (normalizedCityName === 'austin' && airportCity === 'austin') ||
             (normalizedCityName === 'houston' && airportCity === 'houston') ||
             (normalizedCityName === 'new orleans' && airportCity === 'new orleans') ||
             (normalizedCityName === 'portland' && airportCity === 'portland') ||
             (normalizedCityName === 'salt lake city' && airportCity === 'salt lake city') ||
             (normalizedCityName === 'kansas city' && airportCity === 'kansas city') ||
             (normalizedCityName === 'st louis' && airportCity === 'st. louis') ||
             (normalizedCityName === 'cincinnati' && airportCity === 'cincinnati') ||
             (normalizedCityName === 'cleveland' && airportCity === 'cleveland') ||
             (normalizedCityName === 'pittsburgh' && airportCity === 'pittsburgh') ||
             (normalizedCityName === 'buffalo' && airportCity === 'buffalo') ||
             (normalizedCityName === 'albany' && airportCity === 'albany') ||
             (normalizedCityName === 'hartford' && airportCity === 'hartford') ||
             (normalizedCityName === 'providence' && airportCity === 'providence') ||
             (normalizedCityName === 'manchester' && airportCity === 'manchester') ||
             (normalizedCityName === 'burlington' && airportCity === 'burlington') ||
             (normalizedCityName === 'bangor' && airportCity === 'bangor') ||
             (normalizedCityName === 'portland (maine)' && airportCity === 'portland (maine)') ||
             (normalizedCityName === 'lisbon' && airportCity === 'lisbon') ||
             (normalizedCityName === 'porto' && airportCity === 'porto') ||
             (normalizedCityName === 'milan' && airportCity === 'milan') ||
             (normalizedCityName === 'venice' && airportCity === 'venice') ||
             (normalizedCityName === 'florence' && airportCity === 'florence') ||
             (normalizedCityName === 'naples' && airportCity === 'naples') ||
             (normalizedCityName === 'palermo' && airportCity === 'palermo') ||
             (normalizedCityName === 'athens' && airportCity === 'athens') ||
             (normalizedCityName === 'thessaloniki' && airportCity === 'thessaloniki') ||
             (normalizedCityName === 'brussels' && airportCity === 'brussels') ||
             (normalizedCityName === 'antwerp' && airportCity === 'antwerp') ||
             (normalizedCityName === 'copenhagen' && airportCity === 'copenhagen') ||
             (normalizedCityName === 'stockholm' && airportCity === 'stockholm') ||
             (normalizedCityName === 'oslo' && airportCity === 'oslo') ||
             (normalizedCityName === 'helsinki' && airportCity === 'helsinki') ||
             (normalizedCityName === 'reykjavik' && airportCity === 'reykjavik') ||
             (normalizedCityName === 'dublin' && airportCity === 'dublin') ||
             (normalizedCityName === 'cork' && airportCity === 'cork') ||
             (normalizedCityName === 'edinburgh' && airportCity === 'edinburgh') ||
             (normalizedCityName === 'glasgow' && airportCity === 'glasgow') ||
             (normalizedCityName === 'manchester (uk)' && airportCity === 'manchester (uk)') ||
             (normalizedCityName === 'birmingham' && airportCity === 'birmingham') ||
             (normalizedCityName === 'liverpool' && airportCity === 'liverpool') ||
             (normalizedCityName === 'newcastle' && airportCity === 'newcastle') ||
             (normalizedCityName === 'belfast' && airportCity === 'belfast') ||
             (normalizedCityName === 'cardiff' && airportCity === 'cardiff') ||
             (normalizedCityName === 'prague' && airportCity === 'prague') ||
             (normalizedCityName === 'budapest' && airportCity === 'budapest') ||
             (normalizedCityName === 'warsaw' && airportCity === 'warsaw') ||
             (normalizedCityName === 'krakow' && airportCity === 'krakow') ||
             (normalizedCityName === 'gdansk' && airportCity === 'gdansk') ||
             (normalizedCityName === 'bucharest' && airportCity === 'bucharest') ||
             (normalizedCityName === 'sofia' && airportCity === 'sofia') ||
             (normalizedCityName === 'zagreb' && airportCity === 'zagreb');
    });
    
    if (fuzzyMatches.length === 0) {
      return null;
    }
    
    cityAirports.push(...fuzzyMatches);
  }
  
  if (cityAirports.length === 0) {
    return null;
  }
  
  // Select the best airport based on hubScore and routeCount
  const bestAirport = cityAirports.reduce((best, current) => {
    // Lower hubScore is better (1 = major hub, 5 = small airport)
    if (current.hubScore < best.hubScore) return current;
    if (current.hubScore > best.hubScore) return best;
    
    // If hubScores are equal, prefer higher routeCount
    if (current.routeCount > best.routeCount) return current;
    if (current.routeCount < best.routeCount) return best;
    
    // If everything is equal, prefer the first one (deterministic)
    return best;
  });
  
  // Cache the result
  cityAirportCache.set(cacheKey, bestAirport.iata);
  
  return bestAirport.iata;
}

/**
 * Backward-compatible function to get airport code from location string
 */
function getAirportCode(location: string | undefined, fallback: string = "SFO"): string {
  if (!location) return fallback;
  
  // If location contains a comma, extract the part before the comma (airport code)
  const firstPart = location?.split(',')[0]?.trim() || '';
  
  // If the first part looks like an airport code (2-4 uppercase letters), return it
  if (/^[A-Z]{2,4}$/.test(firstPart)) {
    return firstPart;
  }
  
  // Otherwise, it's likely a city name, so try to find the best airport
  const airportCode = findBestAirportForCity(firstPart);
  if (airportCode) {
    return airportCode;
  }
  
  // If no match found, return the original first part or fallback
  return firstPart || fallback;
}
import { GLOBAL_RNG_SEED } from "@/lib/flightConfig";

type LegInput = { origin: string; dest: string; date: string };

/**
 * Expands a location string to airport codes.
 * If it's already an airport code, returns it as-is.
 * If it's a city name, returns all airports for that city.
 */
async function expandToAirportCodes(location: string): Promise<string[]> {
  // If location contains a comma, extract the part before the comma
  const firstPart = location.split(',')[0]?.trim() || location;
  
  // If the first part looks like an airport code (2-4 uppercase letters), return it as-is
  if (/^[A-Z]{2,4}$/.test(firstPart)) {
    return [firstPart];
  }
  
  // Otherwise, it's likely a city or country (may include country qualifier)
  // Use the full location string, not just the first part
  const locationString = location;
  
  // First try to get all airports for this location treated as a city
  const cityAirports = await getAllAirportsForCity(locationString);
  
  if (cityAirports.length > 0) {
    return cityAirports;
  }

  // Next: treat the input as a country name and return a curated set of major airports
  // Cap to avoid generating an excessive number of combinations
  const countryAirports = getMajorAirportsForCountry(locationString, 6);
  if (countryAirports.length > 0) {
    return countryAirports;
  }
  
  // Fallback: use the dynamic airport lookup
  const airportCode = getAirportCode(locationString, firstPart);
  return [airportCode];
  
  // If still no match found, return the original string as a fallback
  return [firstPart];
}

function parseLegs(q: URLSearchParams): LegInput[] {
  const tripType = q.get("tripType") ?? "one-way";

  if (tripType === "multi-city") {
    const raw = q.get("segments");
    if (!raw) throw new Error("segments missing for multi-city");
    return JSON.parse(raw);
  }

  const origin = q.get("origin")!;
  const dest   = q.get("destination")!;
  const dep    = q.get("departureDate")!;
  const legs: LegInput[] = [{ origin, dest, date: dep }];

  if (tripType === "round-trip") {
    const ret = q.get("returnDate");
    if (!ret) throw new Error("returnDate required for round-trip");
    legs.push({ origin: dest, dest: origin, date: ret });
  }
  return legs;
}

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const legs = parseLegs(q);

    const cabin = (q.get("travelClass") ?? "economy").replace("-", "_").toUpperCase() as Cabin;
    const excludeLayovers = q.get("excludeLayovers") === "true"; // Optional parameter to exclude layover flights

    const seed  = GLOBAL_RNG_SEED;       // use global seed from config
    
    const out = await Promise.all(legs.map(async (leg, idx) => {
      // Expand origin and destination to all possible airports
      const originAirports = await expandToAirportCodes(leg.origin);
      const destAirports = await expandToAirportCodes(leg.dest);
      
      // Generate flights for all airport combinations
      const allFlights = [];
      const allLayoverFlights = [];
      
      for (const origin of originAirports) {
        for (const dest of destAirports) {
          // Generate direct flights
          const rawFlights = generateFlights({ 
            origin, 
            dest, 
            date: leg.date, 
            cabin 
          }, seed);
          
          // Add metadata to track which airports were used
          const adjustedFlights = rawFlights.map(f => ({
            ...f,
            // Add metadata only - prices remain per passenger
            originAirport: origin,
            destinationAirport: dest,
          }));
          
          allFlights.push(...adjustedFlights);
          
          // Generate layover flights unless explicitly excluded
          if (!excludeLayovers) {
            const layoverFlights = generateLayoverFlights({
              origin,
              dest,
              date: leg.date,
              cabin
            }, seed);
            
            // Add metadata to track which airports were used
            const adjustedLayoverFlights = layoverFlights.map(f => ({
              ...f,
              // Add metadata only - prices remain per passenger
              originAirport: origin,
              destinationAirport: dest,
            }));
            
            allLayoverFlights.push(...adjustedLayoverFlights);
          }
        }
      }
      
      // Combine direct and layover flights unless layovers are excluded
      const combinedFlights = !excludeLayovers 
        ? [...allFlights, ...allLayoverFlights]
        : allFlights;
      
      // Sort flights by price (raw data, no ranking)
      combinedFlights.sort((a, b) => a.priceUsd - b.priceUsd);
      
      return {
        legId: idx,
        origin: leg.origin, // Keep original search terms
        dest: leg.dest,
        date: leg.date,
        flights: combinedFlights,
        expandedOrigins: originAirports,
        expandedDestinations: destAirports,
      };
    }));

    // Transform response to match frontend expectations
    const response = {
      success: true,
      departingFlights: out[0]?.flights || [],
      returningFlights: out[1]?.flights || [],
      legs: out, // Keep the full leg data for compatibility
      expandedOrigins: out[0]?.expandedOrigins || [],
      expandedDestinations: out[0]?.expandedDestinations || []
    };



    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
