import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Airport,
  LocationSuggestion,
  DefaultSuggestion,
} from "./types/airport";

// US state names for airport lookup
const US_STATES = new Set([
  "alabama",
  "alaska",
  "arizona",
  "arkansas",
  "california",
  "colorado",
  "connecticut",
  "delaware",
  "florida",
  "georgia",
  "hawaii",
  "idaho",
  "illinois",
  "indiana",
  "iowa",
  "kansas",
  "kentucky",
  "louisiana",
  "maine",
  "maryland",
  "massachusetts",
  "michigan",
  "minnesota",
  "mississippi",
  "missouri",
  "montana",
  "nebraska",
  "nevada",
  "new hampshire",
  "new jersey",
  "new mexico",
  "new york",
  "north carolina",
  "north dakota",
  "ohio",
  "oklahoma",
  "oregon",
  "pennsylvania",
  "rhode island",
  "south carolina",
  "south dakota",
  "tennessee",
  "texas",
  "utah",
  "vermont",
  "virginia",
  "washington",
  "west virginia",
  "wisconsin",
  "wyoming",
]);

function isUSStateName(stateName: string): boolean {
  return US_STATES.has(stateName.toLowerCase());
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the path to an airline logo image
 * @param airlineCode - The IATA airline code (e.g., "AA", "DL")
 * @returns The path to the airline logo image, or multi.png as fallback
 */
export function getAirlineLogo(
  airlineCode?: string,
  segments?: Array<{ airline: string }>
): string {
  // If no airline code, return multi logo
  if (!airlineCode) {
    return "/airline_logos/multi.png";
  }

  // If we have segments and there are multiple segments with different airlines
  if (segments && segments.length > 1) {
    const uniqueAirlines = new Set(segments.map((segment) => segment.airline));
    if (uniqueAirlines.size > 1) {
      return "/airline_logos/multi.png";
    }
  }

  // Use local airline logo from /public/airline_logos/
  return `/airline_logos/${airlineCode.toUpperCase()}.png`;
}

// Default suggestions when no search query
export const defaultSuggestions: DefaultSuggestion[] = [
  // {
  //   id: "anywhere",
  //   name: "Anywhere",
  //   description: "Search for trips to anywhere in the world",
  //   type: "anywhere",
  //   featured: true,
  // },
  {
    id: "paris",
    name: "Paris, France",
    description: "Capital of France",
    type: "city",
  },
  {
    id: "chicago",
    name: "Chicago, Illinois",
    description: "City in Illinois",
    type: "city",
  },
  {
    id: "new-york",
    name: "New York, United States",
    description: "City in New York",
    type: "city",
  },
  {
    id: "london",
    name: "London, United Kingdom",
    description: "Capital of England",
    type: "city",
  },
];

// Cache for API results to avoid repeated requests
const searchCache = new Map<
  string,
  (LocationSuggestion | CityWithAirports)[]
>();

/**
 * Search airports using server-side API
 * This is much more efficient than loading 4000 airports client-side
 */
async function fetchAirports(query: string): Promise<Airport[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: "50", // Get enough for good results
    });

    // Determine the base URL based on environment
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/airports?${params}`);
    if (!response.ok) {
      throw new Error(`Airport search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export interface CityWithAirports {
  id: string;
  name: string;
  description: string;
  type: "city";
  airports: LocationSuggestion[];
}

export async function searchAirports(
  query: string
): Promise<(LocationSuggestion | CityWithAirports)[]> {
  if (!query) return defaultSuggestions;

  let searchQuery = query.toLowerCase().trim();
  if (!searchQuery) return defaultSuggestions;

  // Handle "Airport Code, City Name" format (e.g. "SFO, San Francisco")
  const airportCityPattern = /^([A-Z]{2,4}),\s*(.+)$/i;
  const match = query.match(airportCityPattern);
  if (match && match[2]) {
    const [, , cityName] = match;
    // Search using just the city name for better results
    searchQuery = cityName.toLowerCase().trim();
  }

  // Check if explicitly searching for an airport code early
  const looksLikeAirportCode = /^[A-Za-z]{2,4}$/.test(searchQuery);

  // For single character searches, only match start of words in default suggestions
  const matchingDefaultSuggestions = defaultSuggestions.filter((suggestion) => {
    const name = suggestion.name.toLowerCase();
    if (searchQuery.length === 1) {
      // For single character, only match if name starts with the character
      return name.startsWith(searchQuery);
    }
    // For longer searches, allow partial matches
    return name.includes(searchQuery);
  });

  // Only return default suggestions if they match AND the query is very short (1-2 chars)
  // For 3+ character queries that look like airport codes, prioritize airport searches
  // This ensures airport codes like "ORD" don't get blocked by default suggestions
  if (
    matchingDefaultSuggestions.length > 0 &&
    searchQuery.length <= 2 &&
    !looksLikeAirportCode
  ) {
    return matchingDefaultSuggestions;
  }

  // NEW: Create priority-based result maps
  const exactAirportCodeMatches = new Map<string, LocationSuggestion>();
  const airportCodePrefixMatches = new Map<string, LocationSuggestion>();
  const cityResults = new Map<string, CityWithAirports>();
  const directAirportMatches = new Map<string, LocationSuggestion>();
  const secondaryMatches = new Map<string, LocationSuggestion>();
  const countryCounts = new Map<string, number>();

  // Check cache first
  const cacheKey = searchQuery;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  const airports = await fetchAirports(searchQuery);

  airports.forEach((airport) => {
    if (!airport.name || !airport.iata) return;

    const toLower = (str: string | null | undefined): string =>
      (str || "").toLowerCase();

    const airportName = toLower(airport.name);
    const cityName = toLower(airport.city);
    const countryName = toLower(airport.country);
    const stateName = toLower(airport.state_name);
    const stateCode = toLower(airport.state_code);
    const code = toLower(airport.iata);

    // For single character searches, only match if city, airport name, or state name starts with the character
    if (searchQuery.length === 1) {
      // Only match if city, airport name, or state name starts with the character
      if (
        !cityName.startsWith(searchQuery) &&
        !airportName.startsWith(searchQuery) &&
        !stateName.startsWith(searchQuery)
      ) {
        return;
      }
    }

    const location = [airport.city, airport.state_name, airport.country]
      .filter(Boolean)
      .join(", ");

    const airportSuggestion: LocationSuggestion = {
      id: airport.iata,
      name: airport.name,
      description: `${airport.iata} - ${location}`,
      type: "airport",
      code: airport.iata,
      data: airport,
    };

    // NEW: Priority 1 - Exact airport code match (highest priority)
    if (code === searchQuery) {
      exactAirportCodeMatches.set(airport.iata, airportSuggestion);
      return; // Skip other checks since this is the highest priority match
    }

    // NEW: Priority 2 - Airport code prefix match (for 2-3 char queries)
    if (
      searchQuery.length >= 2 &&
      searchQuery.length <= 3 &&
      code.startsWith(searchQuery)
    ) {
      airportCodePrefixMatches.set(airport.iata, airportSuggestion);
      return; // Skip other checks since this is high priority
    }

    // Check primary fields (city, airport name, and state name)
    // Split city, airport, and state names into words for better partial matching
    const cityWords = cityName.split(/\s+/);
    const airportWords = airportName.split(/\s+/);
    const stateWords = stateName.split(/\s+/);

    const primaryMatch =
      cityName.includes(searchQuery) ||
      airportName.includes(searchQuery) ||
      stateName.includes(searchQuery) ||
      cityWords.some((word) => word.includes(searchQuery)) ||
      airportWords.some((word) => word.includes(searchQuery)) ||
      stateWords.some((word) => word.includes(searchQuery));

    // Check secondary fields (including airport code and state code partial matches for longer queries)
    const secondaryMatch =
      searchQuery.length > 1 &&
      !primaryMatch &&
      (code.includes(searchQuery) ||
        countryName.includes(searchQuery) ||
        stateCode.includes(searchQuery));

    // Track country matches separately to build country suggestions
    if (airport.country) {
      const countryLower = airport.country.toLowerCase();
      const countryMatches =
        searchQuery.length === 1
          ? countryLower.startsWith(searchQuery)
          : countryLower.includes(searchQuery);
      if (countryMatches) {
        countryCounts.set(
          airport.country,
          (countryCounts.get(airport.country) || 0) + 1
        );
      }
    }

    if (primaryMatch || secondaryMatch) {
      // Store matches in appropriate maps based on match type
      if (primaryMatch) {
        // Only group by city if the search query specifically matches the city name
        const cityNameMatches =
          cityName.startsWith(searchQuery) ||
          cityWords.some((word) => word.startsWith(searchQuery));
        const stateNameMatches =
          stateName.startsWith(searchQuery) ||
          stateWords.some((word) => word.startsWith(searchQuery));

        if (cityNameMatches || stateNameMatches) {
          // Priority 3 - City name or state name starts with query
          const cityKey = `${airport.city}-${airport.state_name || ""}-${airport.country}`;
          if (!cityResults.has(cityKey)) {
            const cityDisplayName = [
              airport.city,
              airport.state_name,
              airport.country,
            ]
              .filter(Boolean)
              .join(", ");

            cityResults.set(cityKey, {
              id: cityKey,
              name: cityDisplayName,
              description: `Airports in ${airport.city}`,
              type: "city",
              airports: [],
            });
          }
          cityResults.get(cityKey)?.airports.push(airportSuggestion);
        } else if (
          airportName.startsWith(searchQuery) ||
          airportWords.some((word) => word.startsWith(searchQuery))
        ) {
          // Priority 4 - Airport name starts with query
          directAirportMatches.set(airport.iata, airportSuggestion);
        } else {
          // Priority 5 - Other primary matches (partial word matches that don't start with query)
          directAirportMatches.set(airport.iata, airportSuggestion);
        }
      } else if (secondaryMatch) {
        // Priority 6 - Secondary matches (country, partial airport code for 4+ chars)
        secondaryMatches.set(airport.iata, airportSuggestion);
      }
    }
  });

  // NEW: Assemble results in priority order
  // Sort airports within each city group by relevance (best airport first)
  cityResults.forEach((cityGroup) => {
    cityGroup.airports.sort((a, b) => {
      const scoreA = (a.data?.hubScore || 5) * 1000 - (a.data?.routeCount || 0);
      const scoreB = (b.data?.hubScore || 5) * 1000 - (b.data?.routeCount || 0);
      return scoreA - scoreB; // Lower score = better (hubScore 1 < 2 < 3)
    });
  });

  // Build country suggestions (limit to avoid clutter)
  const countrySuggestions: DefaultSuggestion[] = Array.from(
    countryCounts.entries()
  )
    .sort((a, b) => {
      const [nameA, countA] = a;
      const [nameB, countB] = b;
      const aStarts = nameA.toLowerCase().startsWith(searchQuery) ? 0 : 1;
      const bStarts = nameB.toLowerCase().startsWith(searchQuery) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      if (countA !== countB) return countB - countA; // higher count first
      return nameA.localeCompare(nameB);
    })
    .slice(0, 5)
    .map(([countryName]) => ({
      id: `country-${countryName.toLowerCase().replace(/\s+/g, "-")}`,
      name: countryName,
      description: "Country",
      type: "country" as const,
    }));

  // Helper function to calculate relevance score (lower = better)
  const getRelevanceScore = (suggestion: LocationSuggestion): number => {
    if (!suggestion.data) return 9999; // Default high score for suggestions without airport data
    const hubScore = suggestion.data.hubScore || 5;
    const routeCount = suggestion.data.routeCount || 0;
    // Combine hub score (primary) and route count (secondary)
    // Lower hub score is better (1 is highest priority), higher route count is better
    // Use hubScore directly since 1 < 2 < 3, etc.
    return hubScore * 1000 - routeCount;
  };

  // Helper function to sort suggestions by relevance
  const sortByRelevance = (
    suggestions: LocationSuggestion[]
  ): LocationSuggestion[] => {
    return suggestions.sort(
      (a, b) => getRelevanceScore(a) - getRelevanceScore(b)
    );
  };

  // Sort city groups by the best airport in each group (lowest hubScore)
  const sortedCityResults = Array.from(cityResults.values()).sort((a, b) => {
    if (a.airports.length === 0) return 1;
    if (b.airports.length === 0) return -1;

    const bestAirportA = a.airports[0]!; // Already sorted by relevance, safe to assert
    const bestAirportB = b.airports[0]!;

    const scoreA =
      (bestAirportA.data?.hubScore || 5) * 1000 -
      (bestAirportA.data?.routeCount || 0);
    const scoreB =
      (bestAirportB.data?.hubScore || 5) * 1000 -
      (bestAirportB.data?.routeCount || 0);

    return scoreA - scoreB; // Lower score = better
  });

  const results = [
    ...matchingDefaultSuggestions,
    ...sortByRelevance(Array.from(exactAirportCodeMatches.values())),
    ...sortByRelevance(Array.from(airportCodePrefixMatches.values())),
    ...countrySuggestions,
    ...sortedCityResults, // City groups sorted by best airport in each group
    ...sortByRelevance(Array.from(directAirportMatches.values())),
    ...sortByRelevance(Array.from(secondaryMatches.values())),
  ];

  // Cache the results for future requests
  searchCache.set(cacheKey, results);

  return results;
}

// Flight price data generation
export interface FlightPriceData {
  date: string;
  price: number;
  month: string;
}

export function generateFlightPriceData(
  departureDate: Date,
  travelClass: string = "economy",
  daysRange: number = 60
): FlightPriceData[] {
  const data: FlightPriceData[] = [];

  // Base prices for different classes (in USD)
  const basePrices = {
    economy: 200,
    "premium-economy": 400,
    business: 600,
    first: 800,
  };

  const basePrice =
    basePrices[travelClass as keyof typeof basePrices] || basePrices.economy;

  for (let i = 0; i < daysRange; i++) {
    // Create a new date object for each iteration to avoid modifying the original
    const currentDate = new Date(departureDate.getTime());
    currentDate.setDate(currentDate.getDate() + i);

    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Weekend pricing (higher prices)
    let priceMultiplier = isWeekend ? 1.4 : 1.0;

    // Add seasonal variation (higher prices in summer months)
    const month = currentDate.getMonth();
    if (month >= 5 && month <= 8) {
      // June to September
      priceMultiplier *= 1.3;
    }

    // Add day-of-week variation
    const dayVariation = dayOfWeek * 10 + (Math.random() * 40 - 20);

    // Add some randomness but keep it reasonable
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

    let finalPrice = Math.round(
      (basePrice * priceMultiplier + dayVariation) * randomFactor
    );

    // Ensure price stays within 0-750 range
    finalPrice = Math.max(0, Math.min(750, finalPrice));

    data.push({
      date: currentDate.toLocaleDateString("en-CA"), // YYYY-MM-DD format in local timezone
      price: finalPrice,
      month: currentDate.toLocaleDateString("en-US", { month: "short" }),
    });
  }

  return data;
}

/**
 * Determines if a flight price should be colored green.
 * A price is green if it's at or very near the lowest price (within ~5% of minimum).
 */
export function shouldHighlightPrice(
  currentPrice: number,
  allPrices: number[]
): boolean {
  if (allPrices.length === 0) return false;

  const minPrice = Math.min(...allPrices);
  const threshold = minPrice * 1.05; // Within 5% of lowest price

  return currentPrice <= threshold;
}

// Import airports data directly for server-side usage
import airportsData from "@/data/airports.json";
import { Flight } from "./flightGen";
import { LayoverFlight, isLayoverFlight } from "./layoverGen";

/**
 * Get all airport codes for a given location string.
 * Handles both "City, Country" and "City" formats.
 * - "London, United Kingdom" → Only UK airports
 * - "London" → All airports named London (UK, Canada, etc.)
 */
export async function getAllAirportsForCity(
  location: string
): Promise<string[]> {
  try {
    // Parse the location string to extract city and optional country
    const parts = location
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length === 0) {
      return [];
    }

    const cityName = parts[0]!; // Safe because we checked parts.length > 0
    const countryName = parts.length > 1 ? parts[1] : null;

    // When running server-side, use the airports data directly to avoid HTTP call issues
    const airports: Airport[] =
      typeof window === "undefined"
        ? (airportsData as Airport[])
        : await fetchAirports(cityName);

    // Filter airports that match the city name and have valid IATA codes
    let cityAirports = airports.filter(
      (airport) =>
        airport.city &&
        airport.iata &&
        airport.city.toLowerCase() === cityName.toLowerCase() &&
        airport.iata.length >= 3
    );

    // If a country was specified, filter by country as well
    if (countryName) {
      // Handle US states - if the country name is a US state, look for US airports
      const isUSState = isUSStateName(countryName);
      const targetCountry = isUSState ? "United States" : countryName;
      const filteredByCountry = cityAirports.filter((airport) => {
        if (isUSState) {
          // For US states, also check if the airport's state matches
          return (
            airport.country &&
            airport.country.toLowerCase() === targetCountry.toLowerCase() &&
            airport.state_name &&
            airport.state_name.toLowerCase() === countryName.toLowerCase()
          );
        } else {
          return (
            airport.country &&
            airport.country.toLowerCase() === targetCountry.toLowerCase()
          );
        }
      });

      cityAirports = filteredByCountry;
    }
    // If no country specified, include airports from all countries with that city name
    // This allows users to see all "London" airports (UK, Canada, etc.) when they just search "London"

    // Return array of IATA codes
    return cityAirports.map((airport) => airport.iata);
  } catch {
    return [];
  }
}

/**
 * Get a curated list of major airports for a given country.
 * Limits the number returned to avoid combinatorial explosion when generating routes.
 */
export function getMajorAirportsForCountry(
  country: string,
  maxCount: number = 6
): string[] {
  try {
    const countryName = country.trim().toLowerCase();
    if (!countryName) return [];

    // When running server-side, use the airports data directly
    const airports: Airport[] = airportsData as Airport[];

    // Filter valid airports in the specified country with IATA codes
    const candidates = airports.filter(
      (airport) =>
        Boolean(airport.country) &&
        Boolean(airport.iata) &&
        (airport.iata?.length ?? 0) >= 3 &&
        airport.country.toLowerCase() === countryName
    );

    if (candidates.length === 0) return [];

    // Sort by hubScore (ascending: 1 is highest priority) then by routeCount (descending)
    const sorted = candidates.sort((a, b) => {
      const hubA = a.hubScore ?? 5;
      const hubB = b.hubScore ?? 5;
      if (hubA !== hubB) return hubA - hubB; // Lower hubScore is better (1 < 2 < 3)
      const routesA = a.routeCount ?? 0;
      const routesB = b.routeCount ?? 0;
      return routesB - routesA; // Higher route count is better
    });

    // Return unique IATA codes, capped to maxCount
    const uniqueCodes = Array.from(new Set(sorted.map((a) => a.iata)));
    return uniqueCodes.slice(0, Math.max(0, maxCount));
  } catch {
    return [];
  }
}

/**
 * Calculate a score for a flight based on price and duration.
 * Lower scores are better.
 *
 * @param flight - The flight to score
 * @param hourlyValue - The value of each hour of travel time in dollars (default: $30)
 * @returns The calculated score
 */
export function calculateFlightScore(
  flight: Flight | LayoverFlight,
  hourlyValue: number = 30
): number {
  const duration = isLayoverFlight(flight)
    ? (flight as LayoverFlight).totalDurationMin
    : flight.durationMin;

  // Score = price + (duration_hours * hourly_value)
  // This means each hour of travel time is valued at the hourly_value
  return flight.priceUsd + (duration / 60) * hourlyValue;
}

export function calculateCheapestFlightScore(
  flight: Flight | LayoverFlight,
  hourlyValue: number = 10
): number {
  const duration = isLayoverFlight(flight)
    ? (flight as LayoverFlight).totalDurationMin
    : flight.durationMin;

  // Cheapest algorithm weighs price much more heavily than time
  // Lower hourly value means time is less important relative to price
  // Score = price + (duration_hours * lower_hourly_value)
  return flight.priceUsd + (duration / 60) * hourlyValue;
}
