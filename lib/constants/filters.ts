export const ALLIANCES = [
  { code: "oneworld", name: "Oneworld" },
  { code: "skyteam", name: "SkyTeam" },
  { code: "star-alliance", name: "Star Alliance" },
];

// Alliance member mappings - maps alliance codes to their member airline codes
export const ALLIANCE_MEMBERS: Record<string, string[]> = {
  "oneworld": [
    "AS", // Alaska Airlines
    "AA", // American Airlines  
    "BA", // British Airways
    "CX", // Cathay Pacific
    "FJ", // Fiji Airways (full member since 1 Apr 2025)
    "AY", // Finnair
    "IB", // Iberia
    "JL", // Japan Airlines
    "MH", // Malaysia Airlines
    "WY", // Oman Air (full member since 30 Jun 2025)
    "QF", // Qantas
    "QR", // Qatar Airways
    "AT", // Royal Air Maroc
    "RJ", // Royal Jordanian
    "UL"  // SriLankan Airlines
  ],
  "skyteam": [
    "AR", // Aerolíneas Argentinas
    "AM", // Aeroméxico
    "UX", // Air Europa
    "AF", // Air France
    "CI", // China Airlines
    "MU", // China Eastern Airlines
    "DL", // Delta Air Lines
    "GA", // Garuda Indonesia
    "KQ", // Kenya Airways
    "KL", // KLM Royal Dutch Airlines
    "KE", // Korean Air
    "ME", // Middle East Airlines (MEA)
    "SV", // Saudia
    "SK", // Scandinavian Airlines (SAS)
    "RO", // TAROM
    "VN", // Vietnam Airlines
    "VS", // Virgin Atlantic
    "MF"  // XiamenAir
  ],
  "star-alliance": [
    "A3", // Aegean Airlines
    "AC", // Air Canada
    "CA", // Air China
    "AI", // Air India
    "NZ", // Air New Zealand
    "NH", // All Nippon Airways (ANA)
    "OZ", // Asiana Airlines
    "OS", // Austrian Airlines
    "AV", // Avianca
    "SN", // Brussels Airlines
    "CM", // Copa Airlines
    "OU", // Croatia Airlines
    "MS", // EgyptAir
    "ET", // Ethiopian Airlines
    "BR", // EVA Air
    "LO", // LOT Polish Airlines
    "LH", // Lufthansa
    "ZH", // Shenzhen Airlines
    "SQ", // Singapore Airlines
    "SA", // South African Airways
    "LX", // Swiss International Air Lines
    "TP", // TAP Air Portugal
    "TG", // Thai Airways International
    "TK", // Turkish Airlines
    "UA"  // United Airlines
  ]
};

export const AIRLINES = [
  { code: "AF", name: "Air France" },
  { code: "AI", name: "Air India" },
  { code: "OS", name: "Austrian" },
  { code: "LH", name: "Lufthansa" },
  { code: "BA", name: "British Airways" },
  { code: "AA", name: "American Airlines" },
  { code: "DL", name: "Delta Air Lines" },
  { code: "UA", name: "United Airlines" },
  { code: "EK", name: "Emirates" },
  { code: "QR", name: "Qatar Airways" },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "CX", name: "Cathay Pacific" },
  { code: "JL", name: "Japan Airlines" },
  { code: "NH", name: "ANA" },
  { code: "KL", name: "KLM" },
  { code: "IB", name: "Iberia" },
  { code: "AZ", name: "ITA Airways" },
  { code: "TK", name: "Turkish Airlines" },
  { code: "EY", name: "Etihad Airways" },
  { code: "VS", name: "Virgin Atlantic" },
];

export const BOOKING_OPTIONS = [
  {
    id: 1,
    name: "Book with Skyscanner",
    type: "flight",
    url: "https://skyscanner.halluminate.ai",
    hasCarousel: false,
  },
  {
    id: 2,
    name: "Book with United Airlines",
    type: "airline",
    url: "https://united.halluminate.ai",
    hasCarousel: true,
  },
];

export const CONNECTING_AIRPORTS = [
  { code: "AUH", name: "Abu Dhabi" },
  { code: "ADD", name: "Addis Ababa" },
  { code: "AMM", name: "Amman" },
  { code: "AMS", name: "Amsterdam" },
  { code: "BRU", name: "Brussels" },
  { code: "CAI", name: "Cairo" },
  { code: "DOH", name: "Doha" },
  { code: "DXB", name: "Dubai" },
  { code: "FRA", name: "Frankfurt" },
  { code: "IST", name: "Istanbul" },
  { code: "JFK", name: "New York JFK" },
  { code: "LHR", name: "London Heathrow" },
  { code: "MUC", name: "Munich" },
  { code: "ORD", name: "Chicago O'Hare" },
  { code: "SIN", name: "Singapore" },
  { code: "VIE", name: "Vienna" },
  { code: "ZUR", name: "Zurich" },
];

export const STOP_OPTIONS = [
  { value: "any", label: "Any number of stops" },
  { value: "nonstop", label: "Non-stop only" },
  { value: "one-or-fewer", label: "One stop or fewer" },
  { value: "two-or-fewer", label: "Two stops or fewer" },
];

// Helper function to expand alliance selections to include member airlines
export function expandAirlineSelection(selectedAirlines: string[]): string[] {
  const expandedSet = new Set<string>();
  
  for (const selection of selectedAirlines) {
    if (ALLIANCE_MEMBERS[selection]) {
      // This is an alliance - add all member airlines
      ALLIANCE_MEMBERS[selection].forEach(airline => expandedSet.add(airline));
    } else {
      // This is an individual airline
      expandedSet.add(selection);
    }
  }
  
  return Array.from(expandedSet);
}

// Helper function to check if a selection contains an alliance
export function hasAllianceSelected(selectedAirlines: string[]): boolean {
  return selectedAirlines.some(selection => ALLIANCE_MEMBERS[selection] !== undefined);
}

// Derived constants
export const ALL_AIRLINE_ITEMS = [...ALLIANCES, ...AIRLINES];
export const DEFAULT_AIRLINE_CODES = AIRLINES.map((a) => a.code);
export const AIRLINE_ONLY_CODES = AIRLINES.map((a) => a.code);
export const DEFAULT_CONNECTING_AIRPORT_CODES = CONNECTING_AIRPORTS.map(
  (a) => a.code
);

type FlightAirlineRecord = {
  airline?: string;
  segments?: Array<{ airline?: string }>;
};

type AirlineRecord = {
  code: string;
  name: string;
};

// City to Airport Code Mapping
// Helper function to extract unique airline codes from flight results
export function extractAirlinesFromFlights(flights: FlightAirlineRecord[]): string[] {
  const airlineSet = new Set<string>();
  
  flights.forEach(flight => {
    if (flight.segments && Array.isArray(flight.segments)) {
      // LayoverFlight - extract from all segments
      flight.segments.forEach((segment) => {
        if (segment.airline) {
          airlineSet.add(segment.airline);
        }
      });
    } else if (flight.airline) {
      // Direct Flight
      airlineSet.add(flight.airline);
    }
  });
  
  return Array.from(airlineSet);
}

// Helper function to get airline name from code using airlines data
export async function getAirlineName(code: string): Promise<string> {
  try {
    // Import airlines data dynamically to avoid bundling all airline data
    const airlinesData = await import('@/data/airlines.json');
    const airline = (airlinesData.default as AirlineRecord[]).find((a) => a.code === code);
    return airline ? airline.name : code; // fallback to code if name not found
  } catch {
    return code; // fallback to code if import fails
  }
}

// Helper function to combine popular airlines with airlines from flight results
export async function getCombinedAirlineOptions(flightAirlineCodes: string[]): Promise<Array<{ code: string; name: string }>> {
  const popularAirlineCodes = AIRLINES.map(a => a.code);
  const allAirlineCodes = [...new Set([...popularAirlineCodes, ...flightAirlineCodes])];
  
  // Get names for all airline codes
  const airlineOptions = await Promise.all(
    allAirlineCodes.map(async (code) => {
      // Check if it's in our popular airlines first
      const popularAirline = AIRLINES.find(a => a.code === code);
      if (popularAirline) {
        return popularAirline;
      }
      
      // Otherwise, look it up from the full dataset
      const name = await getAirlineName(code);
      return { code, name };
    })
  );
  
  // Sort alphabetically by airline name
  return airlineOptions.sort((a, b) => a.name.localeCompare(b.name));
}

// DEPRECATED: Use the dynamic airport lookup system in lib/utils/airport-utils.ts instead
// This map is kept for backward compatibility but should not be used in new code
export const CITY_TO_AIRPORT_MAP: { [key: string]: string } = {
  "San Francisco": "SFO",
  "Los Angeles": "LAX",
  "New York": "JFK",
  London: "LHR",
  Paris: "CDG",
  Tokyo: "NRT",
  Dubai: "DXB",
  Singapore: "SIN",
  "Hong Kong": "HKG",
  Sydney: "SYD",
  Mumbai: "BOM",
  Delhi: "DEL",
  Bangkok: "BKK",
  Amsterdam: "AMS",
  Frankfurt: "FRA",
  Zurich: "ZUR",
  Vienna: "VIE",
  Rome: "FCO",
  Madrid: "MAD",
  Barcelona: "BCN",
  Berlin: "TXL", // Use Berlin-Tegel (TXL) instead of BER which doesn't exist in our data
  Munich: "MUC",
  Istanbul: "IST",
  Doha: "DOH",
  "Abu Dhabi": "AUH",
  Toronto: "YYZ",
  Vancouver: "YVR",
  Montreal: "YUL",
  Chicago: "ORD",
  Miami: "MIA",
  Boston: "BOS",
  Seattle: "SEA",
  Atlanta: "ATL",
  Dallas: "DFW",
  Phoenix: "PHX",
  "Las Vegas": "LAS",
  "San Diego": "SAN",
  Denver: "DEN",
  Minneapolis: "MSP",
  Detroit: "DTW",
  Philadelphia: "PHL",
  Washington: "DCA",
  Orlando: "MCO",
  Tampa: "TPA",
  Nashville: "BNA",
  Austin: "AUS",
  Houston: "IAH",
  "New Orleans": "MSY",
  Portland: "PDX",
  "Salt Lake City": "SLC",
  "Kansas City": "MCI",
  "St. Louis": "STL",
  Cincinnati: "CVG",
  Cleveland: "CLE",
  Pittsburgh: "PIT",
  Buffalo: "BUF",
  Albany: "ALB",
  Hartford: "BDL",
  Providence: "PVD",
  Manchester: "MHT",
  Burlington: "BTV",
  Bangor: "BGR",
  "Portland (Maine)": "PWM",
  Lisbon: "LIS",
  Porto: "OPO",
  Milan: "MXP",
  Venice: "VCE",
  Florence: "FLR",
  Naples: "NAP",
  Palermo: "PMO",
  Athens: "ATH",
  Thessaloniki: "SKG",
  Brussels: "BRU",
  Antwerp: "ANR",
  Copenhagen: "CPH",
  Stockholm: "ARN",
  Oslo: "OSL",
  Helsinki: "HEL",
  Reykjavik: "KEF",
  Dublin: "DUB",
  Cork: "ORK",
  Edinburgh: "EDI",
  Glasgow: "GLA",
  "Manchester (UK)": "MAN",
  Birmingham: "BHX",
  Liverpool: "LPL",
  Newcastle: "NCL",
  Belfast: "BFS",
  Cardiff: "CWL",
  Prague: "PRG",
  Budapest: "BUD",
  Warsaw: "WAW",
  Krakow: "KRK",
  Gdansk: "GDN",
  Bucharest: "OTP",
  Sofia: "SOF",
  Zagreb: "ZAG",
  Ljubljana: "LJU",
  Belgrade: "BEG",
  Sarajevo: "SJJ",
  Skopje: "SKP",
  Tirana: "TIA",
  Podgorica: "TGD",
  Pristina: "PRN",
  Kiev: "KBP",
  Lviv: "LWO",
  Odessa: "ODS",
  Moscow: "SVO",
  "St. Petersburg": "LED",
  Kazan: "KZN",
  Yekaterinburg: "SVX",
  Novosibirsk: "OVB",
  Irkutsk: "IKT",
  Vladivostok: "VVO",
  Khabarovsk: "KHV",
  Magadan: "GDX",
  Petropavlovsk: "PKC",
  Anchorage: "ANC",
  Fairbanks: "FAI",
  Juneau: "JNU",
  Honolulu: "HNL",
  Kahului: "OGG",
  Kona: "KOA",
  Hilo: "ITO",
  Lihue: "LIH",
};
