import { useFilters } from "@/providers/flight-filters-context";
import { useFlight } from "@/providers/flight-provider";
import { Flight } from "@/lib/flightGen";
import { LayoverFlight, isLayoverFlight } from "@/lib/layoverGen";
import { DateTime } from "luxon";
import { getAirportTimezone } from "@/lib/formatters";
import {
  DEFAULT_CONNECTING_AIRPORT_CODES,
  DEFAULT_AIRLINE_CODES,
  expandAirlineSelection,
} from "@/lib/constants/filters";

export function useFlightFiltering() {
  const { filters, priceRange } = useFilters();
  const { passengers, travelClass } = useFlight();

  // Calculate bag costs based on current filters
  const calculateBagCost = () => {
    return filters.bags.carryOn * 25 + filters.bags.checked * 50;
  };

  // Calculate display price for a flight including bag costs
  const calculateDisplayPrice = (flight: Flight | LayoverFlight) => {
    const cabinClass = travelClass.replace("-", "_").toUpperCase();
    const cabinInfo = flight.cabinPricing?.find(
      (cp) => cp.cabin === cabinClass
    );
    const basePrice = cabinInfo?.priceUsd || flight.priceUsd;
    return basePrice + calculateBagCost();
  };

  // Filter function for flights based on current filters
  const filterFlights = (
    flights: (Flight | LayoverFlight)[],
    isReturn: boolean = false
  ) => {
    return flights.filter((flight) => {
      // Check seat availability first - if not enough seats, hide the flight
      const totalPassengers =
        passengers.adults + passengers.children + passengers.infants;
      // Note: lap infants don't need their own seat

      // Convert travel class format (e.g., "economy" -> "ECONOMY")
      const cabinClass = travelClass.replace("-", "_").toUpperCase();

      // Find the cabin pricing for the selected travel class
      const cabinInfo = flight.cabinPricing?.find(
        (cp) => cp.cabin === cabinClass
      );

      // If no cabin info or not enough seats, filter out this flight
      if (!cabinInfo || cabinInfo.seatsRemaining < totalPassengers) {
        // Flight filtered out by seat availability
        return false;
      }

      // Use base price for filtering (don't mutate the original flight object)
      const basePrice = cabinInfo.priceUsd;
      // Calculate display price for comparison (includes bag costs)
      const displayPrice = basePrice + calculateBagCost();
      // Airlines filter
      if (filters.airlines.length > 0) {
        // Expand alliance selections to include member airlines
        const expandedAirlines = expandAirlineSelection(filters.airlines);

        // If all airlines are selected, don't filter (show all)
        const isAllAirlinesSelected =
          expandedAirlines.length === DEFAULT_AIRLINE_CODES.length &&
          expandedAirlines.every((code) =>
            DEFAULT_AIRLINE_CODES.includes(code)
          ) &&
          DEFAULT_AIRLINE_CODES.every((code) =>
            expandedAirlines.includes(code)
          );

        if (!isAllAirlinesSelected) {
          // Check if the flight's airline code is in the expanded airline list
          if (!expandedAirlines.includes(flight.airline)) {
            return false;
          }
        }
      }
      // If airlines array is empty, show all airlines (no filtering)

      // Stops filter
      if (filters.stops !== "any") {
        // Determine the stops category for this flight
        let flightStopsCategory: string;

        if (isLayoverFlight(flight)) {
          // For layover flights, count segments - 1
          const numStops = flight.segments.length - 1;
          if (numStops === 0) flightStopsCategory = "nonstop";
          else if (numStops === 1) flightStopsCategory = "one-or-fewer";
          else flightStopsCategory = "two-or-fewer";
        } else {
          // For direct flights, they are always nonstop in our system
          flightStopsCategory = "nonstop";
        }

        // If filter is 'nonstop', only show non-stop flights
        if (filters.stops === "nonstop" && flightStopsCategory !== "nonstop") {
          return false;
        }

        // If filter is 'one-or-fewer', show non-stop and 1 stop flights
        if (
          filters.stops === "one-or-fewer" &&
          flightStopsCategory !== "nonstop" &&
          flightStopsCategory !== "one-or-fewer"
        ) {
          return false;
        }

        // If filter is 'two-or-fewer', show all flights (since we only have up to 2 stops in our data)
        // This is already handled as it includes all categories
      }

      // Price filter - use display price that includes bag costs
      if (filters.priceRange !== Infinity) {
        if (displayPrice > filters.priceRange) {
          return false;
        }
      }

      // Duration filter
      if (filters.duration[1] < 24) {
        const maxDurationMinutes = filters.duration[1] * 60; // Convert hours to minutes
        const flightDuration = isLayoverFlight(flight)
          ? flight.totalDurationMin
          : flight.durationMin;
        if (flightDuration > maxDurationMinutes) {
          return false;
        }
      }

      // Emissions filter
      if (filters.emissions === "less") {
        // Only show flights with emissions below average (350 kg)
        const avgEmissions = 350;
        if (flight.emissions >= avgEmissions) {
          return false;
        }
      }

      // Times filter - Departure time
      const timeFilters = isReturn
        ? filters.times.return
        : filters.times.outbound;
      if (timeFilters.departure[0] !== 0 || timeFilters.departure[1] !== 24) {
        // Get origin airport code for timezone conversion
        let originAirport: string;
        if (isLayoverFlight(flight) && flight.segments.length > 0) {
          const firstSegment = flight.segments[0];
          originAirport = firstSegment?.origin || "";
        } else {
          originAirport = (flight as any).originAirport || "";
        }

        // Parse hour in origin timezone
        const timezone = getAirportTimezone(originAirport);
        const departureHour = DateTime.fromISO(flight.depart, {
          setZone: true,
        }).setZone(timezone).hour;
        const [minDeparture, maxDeparture] = timeFilters.departure;

        // Handle edge case where filter spans midnight (e.g., 22:00 to 06:00)
        if (minDeparture <= maxDeparture) {
          // Normal case: filter doesn't span midnight
          // Include flights that depart at or after minDeparture and before maxDeparture
          if (departureHour < minDeparture || departureHour >= maxDeparture) {
            return false;
          }
        } else {
          // Edge case: filter spans midnight (e.g., 22 to 6)
          // Include flights that depart at or after minDeparture OR before maxDeparture
          if (departureHour < minDeparture && departureHour >= maxDeparture) {
            return false;
          }
        }
      }

      // Times filter - Arrival time
      if (timeFilters.arrival[0] !== 0 || timeFilters.arrival[1] !== 24) {
        // Parse hour in destination timezone
        // Get destination airport code
        let destAirport: string;
        if (isLayoverFlight(flight) && flight.segments.length > 0) {
          const lastSegment = flight.segments[flight.segments.length - 1];
          destAirport = lastSegment?.destination || "";
        } else {
          destAirport = (flight as any).destinationAirport || "";
        }

        // Only proceed if we have a valid destination airport
        if (destAirport) {
          const timezone = getAirportTimezone(destAirport);
          const arrivalHour = DateTime.fromISO(flight.arrive, {
            setZone: true,
          }).setZone(timezone).hour;
          const [minArrival, maxArrival] = timeFilters.arrival;

          // Handle edge case where filter spans midnight (e.g., 22:00 to 06:00)
          if (minArrival <= maxArrival) {
            // Normal case: filter doesn't span midnight
            // Include flights that arrive at or after minArrival and before maxArrival
            if (arrivalHour < minArrival || arrivalHour >= maxArrival) {
              return false;
            }
          } else {
            // Edge case: filter spans midnight (e.g., 22 to 6)
            // Include flights that arrive at or after minArrival OR before maxArrival
            if (arrivalHour < minArrival && arrivalHour >= maxArrival) {
              return false;
            }
          }
        }
      }

      // Connecting airports filter
      const isDefaultAirports =
        filters.connectingAirports.length ===
          DEFAULT_CONNECTING_AIRPORT_CODES.length &&
        filters.connectingAirports.every((code) =>
          DEFAULT_CONNECTING_AIRPORT_CODES.includes(code)
        ) &&
        DEFAULT_CONNECTING_AIRPORT_CODES.every((code) =>
          filters.connectingAirports.includes(code)
        );

      if (!isDefaultAirports) {
        let connectingAirports: string[] = [];

        // Extract connecting airports based on flight type
        if (isLayoverFlight(flight)) {
          // For layover flights, use the layover airport directly
          connectingAirports = [flight.layoverAirport];
        } else {
          // For direct flights, no connecting airports
          connectingAirports = [];
        }

        // Debug: connecting airports check

        // If flight has connecting airports, check if any of them are in the selected list
        if (connectingAirports.length > 0) {
          const hasSelectedAirport = connectingAirports.some(
            (airport: string) => filters.connectingAirports.includes(airport)
          );
          if (!hasSelectedAirport) {
            return false;
          }
        } else {
          // If flight has no connecting airports (non-stop) and we have specific airports selected,
          // exclude this flight unless we're only filtering by stopover duration
          const hasStopoverDuration =
            filters.stopoverDuration[0] !== 1 ||
            filters.stopoverDuration[1] !== 24;
          if (!hasStopoverDuration) {
            return false;
          }
        }
      }

      // Stopover duration filter
      if (
        filters.stopoverDuration[0] !== 1 ||
        filters.stopoverDuration[1] !== 24
      ) {
        let stopoverDuration: number | null = null;

        if (isLayoverFlight(flight)) {
          // For layover flights, convert minutes to hours
          stopoverDuration = flight.layoverDurationMin / 60;
        } else {
          // For direct flights, no stopover duration
          stopoverDuration = null;
        }

        // If flight has stopover duration, check if it's within the selected range
        if (stopoverDuration !== null) {
          const [minDuration, maxDuration] = filters.stopoverDuration;
          if (
            stopoverDuration < minDuration ||
            stopoverDuration > maxDuration
          ) {
            return false;
          }
        } else {
          // If flight has no stopover (non-stop), exclude it when stopover duration filter is active
          return false;
        }
      }

      // Future filters can be added here
      // Example structure for other filters:
      // if (filters.airlines.length > 0 && !filters.airlines.includes(flight.airlineCode)) {
      //     return false
      // }

      return true;
    });
  };

  // Filter function that excludes price filtering (for use before round-trip pricing)
  const filterFlightsWithoutPrice = (
    flights: (Flight | LayoverFlight)[],
    isReturn: boolean = false
  ) => {
    return flights.filter((flight) => {
      // Check seat availability first - if not enough seats, hide the flight
      const totalPassengers =
        passengers.adults + passengers.children + passengers.infants;
      // Note: lap infants don't need their own seat

      // Convert travel class format (e.g., "economy" -> "ECONOMY")
      const cabinClass = travelClass.replace("-", "_").toUpperCase();

      // Find the cabin pricing for the selected travel class
      const cabinInfo = flight.cabinPricing?.find(
        (cp) => cp.cabin === cabinClass
      );

      // If no cabin info or not enough seats, filter out this flight
      if (!cabinInfo || cabinInfo.seatsRemaining < totalPassengers) {
        // Flight filtered out by seat availability
        return false;
      }

      // Airlines filter
      if (filters.airlines.length > 0) {
        // Expand alliance selections to include member airlines
        const expandedAirlines = expandAirlineSelection(filters.airlines);

        // If all airlines are selected, don't filter (show all)
        const isAllAirlinesSelected =
          expandedAirlines.length === DEFAULT_AIRLINE_CODES.length &&
          expandedAirlines.every((code) =>
            DEFAULT_AIRLINE_CODES.includes(code)
          ) &&
          DEFAULT_AIRLINE_CODES.every((code) =>
            expandedAirlines.includes(code)
          );

        if (!isAllAirlinesSelected) {
          // Check if the flight's airline code is in the expanded airline list
          if (!expandedAirlines.includes(flight.airline)) {
            return false;
          }
        }
      }
      // If airlines array is empty, show all airlines (no filtering)

      // Stops filter
      if (filters.stops !== "any") {
        // Determine the stops category for this flight
        let flightStopsCategory: string;

        if (isLayoverFlight(flight)) {
          // For layover flights, count segments - 1
          const numStops = flight.segments.length - 1;
          if (numStops === 0) flightStopsCategory = "nonstop";
          else if (numStops === 1) flightStopsCategory = "one-or-fewer";
          else flightStopsCategory = "two-or-fewer";
        } else {
          // For direct flights, they are always nonstop in our system
          flightStopsCategory = "nonstop";
        }

        // If filter is 'nonstop', only show non-stop flights
        if (filters.stops === "nonstop" && flightStopsCategory !== "nonstop") {
          return false;
        }

        // If filter is 'one-or-fewer', show non-stop and 1 stop flights
        if (
          filters.stops === "one-or-fewer" &&
          flightStopsCategory !== "nonstop" &&
          flightStopsCategory !== "one-or-fewer"
        ) {
          return false;
        }

        // If filter is 'two-or-fewer', show all flights (since we only have up to 2 stops in our data)
        // This is already handled as it includes all categories
      }

      // Duration filter
      if (filters.duration[1] < 24) {
        const maxDurationMinutes = filters.duration[1] * 60; // Convert hours to minutes
        const flightDuration = isLayoverFlight(flight)
          ? flight.totalDurationMin
          : flight.durationMin;
        if (flightDuration > maxDurationMinutes) {
          return false;
        }
      }

      // Emissions filter
      if (filters.emissions === "less") {
        // Only show flights with emissions below average (350 kg)
        const avgEmissions = 350;
        if (flight.emissions >= avgEmissions) {
          return false;
        }
      }

      // Times filter - Departure time
      const timeFilters = isReturn
        ? filters.times.return
        : filters.times.outbound;
      if (timeFilters.departure[0] !== 0 || timeFilters.departure[1] !== 24) {
        // Get origin airport code for timezone conversion
        let originAirport: string;
        if (isLayoverFlight(flight) && flight.segments.length > 0) {
          const firstSegment = flight.segments[0];
          originAirport = firstSegment?.origin || "";
        } else {
          originAirport = (flight as any).originAirport || "";
        }

        // Parse hour in origin timezone
        const timezone = getAirportTimezone(originAirport);
        const departureHour = DateTime.fromISO(flight.depart, {
          setZone: true,
        }).setZone(timezone).hour;
        const [minDeparture, maxDeparture] = timeFilters.departure;

        // Handle edge case where filter spans midnight (e.g., 22:00 to 06:00)
        if (minDeparture <= maxDeparture) {
          // Normal case: filter doesn't span midnight
          // Include flights that depart at or after minDeparture and before maxDeparture
          if (departureHour < minDeparture || departureHour >= maxDeparture) {
            return false;
          }
        } else {
          // Edge case: filter spans midnight (e.g., 22 to 6)
          // Include flights that depart at or after minDeparture OR before maxDeparture
          if (departureHour < minDeparture && departureHour >= maxDeparture) {
            return false;
          }
        }
      }

      // Times filter - Arrival time
      if (timeFilters.arrival[0] !== 0 || timeFilters.arrival[1] !== 24) {
        // Parse hour in destination timezone
        // Get destination airport code
        let destAirport: string;
        if (isLayoverFlight(flight) && flight.segments.length > 0) {
          const lastSegment = flight.segments[flight.segments.length - 1];
          destAirport = lastSegment?.destination || "";
        } else {
          destAirport = (flight as any).destinationAirport || "";
        }

        // Only proceed if we have a valid destination airport
        if (destAirport) {
          const timezone = getAirportTimezone(destAirport);
          const arrivalHour = DateTime.fromISO(flight.arrive, {
            setZone: true,
          }).setZone(timezone).hour;
          const [minArrival, maxArrival] = timeFilters.arrival;

          // Handle edge case where filter spans midnight (e.g., 22:00 to 06:00)
          if (minArrival <= maxArrival) {
            // Normal case: filter doesn't span midnight
            // Include flights that arrive at or after minArrival and before maxArrival
            if (arrivalHour < minArrival || arrivalHour >= maxArrival) {
              return false;
            }
          } else {
            // Edge case: filter spans midnight (e.g., 22 to 6)
            // Include flights that arrive at or after minArrival OR before maxArrival
            if (arrivalHour < minArrival && arrivalHour >= maxArrival) {
              return false;
            }
          }
        }
      }

      // Connecting airports filter
      const isDefaultAirports =
        filters.connectingAirports.length ===
          DEFAULT_CONNECTING_AIRPORT_CODES.length &&
        filters.connectingAirports.every((code) =>
          DEFAULT_CONNECTING_AIRPORT_CODES.includes(code)
        ) &&
        DEFAULT_CONNECTING_AIRPORT_CODES.every((code) =>
          filters.connectingAirports.includes(code)
        );

      if (!isDefaultAirports) {
        let connectingAirports: string[] = [];

        // Extract connecting airports based on flight type
        if (isLayoverFlight(flight)) {
          // For layover flights, use the layover airport directly
          connectingAirports = [flight.layoverAirport];
        } else {
          // For direct flights, no connecting airports
          connectingAirports = [];
        }

        // Debug: connecting airports check

        // If flight has connecting airports, check if any of them are in the selected list
        if (connectingAirports.length > 0) {
          const hasSelectedAirport = connectingAirports.some(
            (airport: string) => filters.connectingAirports.includes(airport)
          );
          if (!hasSelectedAirport) {
            return false;
          }
        } else {
          // If flight has no connecting airports (non-stop) and we have specific airports selected,
          // exclude this flight unless we're only filtering by stopover duration
          const hasStopoverDuration =
            filters.stopoverDuration[0] !== 1 ||
            filters.stopoverDuration[1] !== 24;
          if (!hasStopoverDuration) {
            return false;
          }
        }
      }

      // Stopover duration filter
      if (
        filters.stopoverDuration[0] !== 1 ||
        filters.stopoverDuration[1] !== 24
      ) {
        let stopoverDuration: number | null = null;

        if (isLayoverFlight(flight)) {
          // For layover flights, convert minutes to hours
          stopoverDuration = flight.layoverDurationMin / 60;
        } else {
          // For direct flights, no stopover duration
          stopoverDuration = null;
        }

        // If flight has stopover duration, check if it's within the selected range
        if (stopoverDuration !== null) {
          const [minDuration, maxDuration] = filters.stopoverDuration;
          if (
            stopoverDuration < minDuration ||
            stopoverDuration > maxDuration
          ) {
            return false;
          }
        } else {
          // If flight has no stopover (non-stop), exclude it when stopover duration filter is active
          return false;
        }
      }

      // Future filters can be added here
      // Example structure for other filters:
      // if (filters.airlines.length > 0 && !filters.airlines.includes(flight.airlineCode)) {
      //     return false
      // }

      return true;
    });
  };

  return {
    filterFlights,
    filterFlightsWithoutPrice,
    calculateBagCost,
    calculateDisplayPrice,
  };
}
