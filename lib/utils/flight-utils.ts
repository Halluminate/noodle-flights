// Note: This function is now deprecated in favor of server-side airport lookup
// Use the useAirportLookup hook in React components instead
import { Flight } from "@/lib/flightGen"
import { LayoverFlight } from "@/lib/layoverGen"

// DEPRECATED: Airport lookup is now handled server-side via /api/airports/lookup
// Use the useAirportLookup hook in React components instead
export const getAirportCodeFromLocation = (location: string | undefined, fallback: string) => {
    return fallback
}

// Helper function to convert flight stops format to filter format
export const normalizeStopsForFilter = (stops: string): 'nonstop' | 'one-or-fewer' | 'two-or-fewer' => {
    if (stops === "Nonstop") return 'nonstop'
    if (stops === "1 stop") return 'one-or-fewer'
    return 'two-or-fewer' // for "2 stops" or "3 stops" etc.
}

// Helper function to get the cheapest price from a flight array
export const getCheapestPrice = (
    flights: Array<Pick<Flight | LayoverFlight, "priceUsd">>
): number => {
    if (flights.length === 0) return 0
    return Math.min(...flights.map(flight => flight.priceUsd))
}

// Helper function to extract connecting airports from stopDetails
export const extractConnectingAirports = (stopDetails: string): string[] => {
    if (!stopDetails || stopDetails === "Nonstop" || stopDetails === "") {
        return []
    }
    
    // Extract airport codes from stopDetails
    // Examples: "1 hr AUH" -> ["AUH"], "4 hrs DXB" -> ["DXB"], "DOH, LHR" -> ["DOH", "LHR"]
    const airportCodes: string[] = []
    
    // Match pattern like "1 hr AUH" or "4 hrs DXB"
    const singleStopMatch = stopDetails.match(/\d+\s*hrs?\s+([A-Z]{3})/i)
    if (singleStopMatch) {
        airportCodes.push(singleStopMatch[1])
    } else {
        // Match pattern like "DOH, LHR" or "DEL, LAX"
        const multipleStopsMatch = stopDetails.match(/([A-Z]{3}(?:,\s*[A-Z]{3})*)/i)
        if (multipleStopsMatch) {
            const codes = multipleStopsMatch[1].split(',').map(code => code.trim())
            airportCodes.push(...codes)
        }
    }
    
    return airportCodes
}

// Helper function to extract stopover duration from stopDetails
export const extractStopoverDuration = (stopDetails: string): number | null => {
    if (!stopDetails || stopDetails === "Nonstop" || stopDetails === "") {
        return null
    }
    
    // Extract duration from patterns like "1 hr AUH", "4 hrs DXB", "3 hrs AMS"
    const durationMatch = stopDetails.match(/(\d+)\s*hrs?/i)
    if (durationMatch) {
        return parseInt(durationMatch[1], 10)
    }
    
    return null
}

// Helper function to parse time string to minutes for sorting
export const parseTimeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
}

// Helper function to parse duration to minutes
export const parseDurationToMinutes = (duration: string): number => {
    const matches = duration.match(/(\d+)\s*hrs?\s*(\d+)?\s*min/i)
    if (!matches) return 0
    const hours = parseInt(matches[1]) || 0
    const minutes = parseInt(matches[2]) || 0
    return hours * 60 + minutes
}

// Helper function to parse time string to hour (24-hour format)
export const parseTimeToHour = (timeString: string): number => {
    // Remove any extra characters like ⁺¹ (next day indicator)
    const cleanTime = timeString.replace(/[⁺¹]/g, '')
    const [hours] = cleanTime.split(':').map(Number)
    return hours
}

// Helper function to parse emissions to number
export const parseEmissions = (emissions: string): number => {
    const match = emissions.match(/(\d+(?:,\d+)*)\s*kg/)
    if (!match) return 0
    return parseInt(match[1].replace(',', ''))
}
