import { Flight } from "@/lib/flightGen"
import { LayoverFlight, isLayoverFlight } from "@/lib/layoverGen"
import { SelectedFlight, SelectedFlightSegment } from "@/providers/flight-provider"
import { formatPrice, formatDuration, formatEmissions, formatFlightTimes, formatRoute, formatStops, formatStopDetails, formatLayoverDetails } from "@/lib/formatters"

type FlightWithExpandedAirports = (Flight | LayoverFlight) & {
    originAirport?: string
    destinationAirport?: string
}

// Transform raw flight data to display format
export const transformFlightForDisplay = (
    flight: Flight | LayoverFlight, 
    origin: string, 
    dest: string,
    date: string, 
    index: number,
    passengerCount: number = 1,
    bagCost: number = 0
): SelectedFlight => {
    // Use the flight's actual airport codes if available (from API expansion), otherwise fall back to passed values
    const flightWithExpandedAirports = flight as FlightWithExpandedAirports
    const actualOrigin = flightWithExpandedAirports.originAirport || origin;
    const actualDest = flightWithExpandedAirports.destinationAirport || dest;
    
    // Check if this is a layover flight
    if (isLayoverFlight(flight)) {
        const { departure, arrival, calDayDifference } = formatFlightTimes(flight.depart, flight.arrive, actualOrigin, actualDest);
        const { emissions, emissionChange } = formatEmissions(flight.emissions);
        
        // Transform segments for display
        const displaySegments: SelectedFlightSegment[] = flight.segments.map((segment) => {
            const segmentTimes = formatFlightTimes(segment.depart, segment.arrive, segment.origin, segment.destination);
            return {
                departure: segmentTimes.departure,
                arrival: segmentTimes.arrival,
                departureIso: segment.depart,
                arrivalIso: segment.arrive,
                departureAirport: segment.origin,
                arrivalAirport: segment.destination,
                duration: formatDuration(segment.durationMin),
                aircraft: segment.aircraft || '',
                flightNumber: segment.flightNumber || '',
                calDayDifference: segmentTimes.calDayDifference,
                airline: segment.airline,
                airlineName: segment.airlineName
            };
        });
        
        return {
            ...flight,
            id: index + 1,
            airline: flight.airlineName,
            airlineCode: flight.airline,
            departure,
            arrival,
            departureIso: flight.depart,
            arrivalIso: flight.arrive,
            duration: formatDuration(flight.totalDurationMin),
            route: formatRoute(actualOrigin, actualDest),
            stops: formatStops(flight.segments.length - 1),
            stopDetails: formatLayoverDetails(flight.layoverAirport, flight.layoverDurationMin),
            emissions,
            emissionChange,
            price: formatPrice((flight.priceUsd * passengerCount) + bagCost),
            priceUsd: (flight.priceUsd * passengerCount) + bagCost,
            priceLabel: "",
            departureAirport: actualOrigin,
            arrivalAirport: actualDest,
            aircraft: flight.segments[0]?.aircraft || '', // Show first segment aircraft
            flightNumber: flight.flightNumber,
            class: "economy",
            date,
            calDayDifference,
            segments: displaySegments
        };
    }
    
    // Handle direct flight
    const { departure, arrival, calDayDifference } = formatFlightTimes(flight.depart, flight.arrive, actualOrigin, actualDest);
    const { emissions, emissionChange } = formatEmissions(flight.emissions);
    
    return {
        ...flight,
        id: index + 1, // Use index-based ID for UI purposes
        airline: flight.airlineName,
        airlineCode: flight.airline,
        departure,
        arrival,
        departureIso: flight.depart, // Preserve original ISO time
        arrivalIso: flight.arrive,   // Preserve original ISO time
        duration: formatDuration(flight.durationMin),
        route: formatRoute(actualOrigin, actualDest),
        stops: formatStops(0),
        stopDetails: formatStopDetails(actualOrigin, actualDest),
        emissions,
        emissionChange,
        price: formatPrice((flight.priceUsd * passengerCount) + bagCost),
        priceUsd: (flight.priceUsd * passengerCount) + bagCost,
        priceLabel: "",
        departureAirport: actualOrigin,
        arrivalAirport: actualDest,
            aircraft: flight.aircraft || '',
            flightNumber: flight.flightNumber || '',
            class: "economy", // Default for now
        date,
        calDayDifference,
        segments: [{
            departure,
            arrival,
            departureIso: flight.depart,
            arrivalIso: flight.arrive,
            departureAirport: actualOrigin,
            arrivalAirport: actualDest,
            duration: formatDuration(flight.durationMin),
            aircraft: flight.aircraft || '',
            flightNumber: flight.flightNumber || '',
            calDayDifference,
            airline: flight.airline,
            airlineName: flight.airlineName
        }]
    };
};
