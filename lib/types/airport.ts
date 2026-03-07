export interface Airport {
  name: string;
  city: string;
  country: string;
  iata: string;
  lat: number;
  lon: number;
  tz: string;
  routeCount: number;
  hubScore: number;
  state_name?: string;
  state_code?: string;
}

export interface LocationSuggestion {
  id: string;
  name: string;
  description: string;
  type: "anywhere" | "continent" | "country" | "city" | "airport" | "station";
  code?: string;
  data?: Airport;
  featured?: boolean;
}

export interface DefaultSuggestion extends LocationSuggestion {
  featured?: boolean;
}

export interface CityWithAirports {
  id: string;
  name: string;
  description: string;
  type: "city";
  airports: LocationSuggestion[];
}
