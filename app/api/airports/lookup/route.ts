import { NextRequest, NextResponse } from 'next/server';
import airports from '@/data/airports.json';

// US state names for airport lookup
const US_STATES = new Set([
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
  'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
  'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
  'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire',
  'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
  'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
  'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia',
  'wisconsin', 'wyoming'
]);

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
  
  // If we found airports, we need to handle the case where the input might include a US state
  // For example, "Chicago, Illinois" should match "Chicago" in "United States"
  if (cityAirports.length === 0) {
    // Check if the input contains a comma (might be "City, State" format)
    const parts = cityName.split(',').map(part => part.trim());
    if (parts.length > 1) {
      const cityPart = parts[0];
      const statePart = parts[1];
      
      // Check if the second part is a US state
      if (cityPart && statePart && US_STATES.has(statePart.toLowerCase())) {
        // Look for airports in the US with this city name
        const usCityAirports = (airports as Airport[]).filter(airport => 
          airport.city && 
          airport.city.toLowerCase() === cityPart.toLowerCase() &&
          airport.country && 
          airport.country.toLowerCase() === 'united states'
        );
        
        if (usCityAirports.length > 0) {
          cityAirports.push(...usCityAirports);
        }
      }
    }
  }
  
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const fallback = searchParams.get('fallback') || 'SFO';
    
    if (!location) {
      return NextResponse.json({ error: 'Location parameter is required' }, { status: 400 });
    }
    
    const airportCode = getAirportCode(location, fallback);
    
    return NextResponse.json({
      location,
      airportCode,
      fallback
    });
    
  } catch (error) {
    console.error('Airport lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
