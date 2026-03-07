import React from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useFlight } from "@/providers/flight-provider";
import { useFilters } from "@/providers/flight-filters-context";
import { Flight } from "@/lib/flightGen";
import { LayoverFlight } from "@/lib/layoverGen";

interface FlightDataPayload {
  departingFlights: (Flight | LayoverFlight)[];
  returningFlights: (Flight | LayoverFlight)[];
}

/**
 * Central hook for retrieving flight search results.
 *
 * It is purely driven by the *search parameters* coming from `FlightProvider`.
 * Filter state lives elsewhere and does NOT influence the query key, ensuring
 * that UI-only filters never refetch data from the API.
 */
export function useFlightData() {
  const {
    fromLocation,
    toLocation,
    departureDate,
    returnDate,
    tripType,
    travelClass,
    passengers,
    searchTrigger,
  } = useFlight();

  const { updateFlightData } = useFilters();
  const lastDataSignatureRef = React.useRef<string | null>(null);

  const canFetch = Boolean(fromLocation && toLocation && departureDate);

  const query = useQuery<FlightDataPayload, Error>({
    // Only refetch when the explicit search trigger changes
    // This prevents API calls on every keystroke edit in the /search inputs
    queryKey: ["flights", searchTrigger],
    enabled: canFetch,
    staleTime: 5 * 60 * 1000,
    placeholderData: { departingFlights: [], returningFlights: [] },
    queryFn: async () => {
      const params = new URLSearchParams({
        origin: fromLocation,
        destination: toLocation,
        departureDate: format(departureDate!, "yyyy-MM-dd"),
        tripType,
        travelClass,
        adults: passengers.adults.toString(),
      });

      if (tripType === "round-trip" && returnDate) {
        params.append("returnDate", format(returnDate, "yyyy-MM-dd"));
      }

      const res = await fetch(`/api/flights?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch flights");
      }

      return {
        departingFlights: data.departingFlights ?? [],
        returningFlights: data.returningFlights ?? [],
      } as FlightDataPayload;
    },
  });

  // Keep FilterProvider in sync with fresh data
  React.useEffect(() => {
    if (query.status === "success" && query.data) {
      const all = [...query.data.departingFlights, ...query.data.returningFlights];
      // Build a lightweight signature to avoid redundant state updates
      const signature = `${all.length}|${all[0]?.priceUsd ?? 0}|${all[all.length-1]?.priceUsd ?? 0}`;
      if (lastDataSignatureRef.current !== signature) {
        lastDataSignatureRef.current = signature;
        updateFlightData(all);
      }
    }
    if (query.status === "error") {
      if (lastDataSignatureRef.current !== "0|0|0") {
        lastDataSignatureRef.current = "0|0|0";
        updateFlightData([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.status, query.data]);



  // Clear flight data when parameters are incomplete so that UI resets gracefully
  React.useEffect(() => {
    if (!canFetch) {
      updateFlightData([]);
    }
  }, [canFetch, updateFlightData]);

  return {
    flightData: query.data ?? { departingFlights: [], returningFlights: [] },
    isLoading: query.isFetching,
  };
}
