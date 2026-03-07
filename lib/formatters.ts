// lib/formatters.ts
// Frontend formatting utilities for raw flight data

import { DateTime } from "luxon";
import { Airport } from "@/lib/types/airport";

// Import airport data for timezone information
import airportsData from "@/data/airports.json";

const airports: Airport[] = airportsData as Airport[];

/**
 * Get airport timezone by IATA code
 */
export function getAirportTimezone(iataCode: string): string {
  const airport = airports.find(a => a.iata === iataCode);
  if (!airport) {
    throw new Error(`Airport with IATA code "${iataCode}" not found`);
  }
  return airport.tz;
}

/**
 * Calculate the calendar day difference between departure and arrival
 * Returns 0 if same day, +1 if next day, +2 if day after, -1 if previous day (date line crossing), etc.
 */
function calculateCalendarDayDifference(departureTime: DateTime, arrivalTime: DateTime): number {
  // Extract just the calendar dates (year, month, day) without timezone considerations
  const departureDate = departureTime.toFormat('yyyy-MM-dd');
  const arrivalDate = arrivalTime.toFormat('yyyy-MM-dd');
  
  // Compare the actual dates
  if (departureDate === arrivalDate) {
    return 0;
  }
  
  // Calculate the difference in days using the ISO date strings
  const depDateTime = DateTime.fromISO(departureDate);
  const arrDateTime = DateTime.fromISO(arrivalDate);
  
  return Math.round(arrDateTime.diff(depDateTime, 'days').days);
}

/**
 * Convert a number to superscript Unicode characters
 */
function toSuperscript(num: number): string {
  const superscriptMap: { [key: string]: string } = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };
  
  return num.toString().split('').map(digit => superscriptMap[digit] || digit).join('');
}

/**
 * Format price from raw USD amount
 */
export function formatPrice(priceUsd: number): string {
  return `$${priceUsd.toLocaleString()}`;
}

/**
 * Format duration from minutes to human readable
 */
export function formatDuration(durationMin: number): string {
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  if (hours === 0) {
    return `${minutes} min`;
  } else {
    return `${hours} hr ${minutes} min`;
  }
}

/**
 * Format emissions with comparison to average
 */
export function formatEmissions(emissionsKg: number): {
  emissions: string;
  emissionChange: string;
} {
  const avgEmissions = 350; // baseline average
  const emissionDiff = ((emissionsKg - avgEmissions) / avgEmissions * 100);
  
  return {
    emissions: `${emissionsKg} kg CO2e`,
    emissionChange: emissionDiff > 0 
      ? `+${Math.round(emissionDiff)}% emissions`
      : `${Math.round(emissionDiff)}% emissions`
  };
}

/**
 * Format time from ISO string to local time in airport timezone
 */
export function formatTime(isoTime: string, airportCode: string): string {
  const timezone = getAirportTimezone(airportCode);
  const dateTime = DateTime.fromISO(isoTime).setZone(timezone);
  
  return dateTime.toFormat('h:mm a');
}

/**
 * Format route string
 */
export function formatRoute(origin: string, destination: string): string {
  return `${origin} – ${destination}`;
}

/**
 * Format stop information (for future use when we have connecting flights)
 */
export function formatStops(stops: number = 0): string {
  if (stops === 0) return "Nonstop";
  if (stops === 1) return "1 stop";
  return `${stops} stops`;
}

/**
 * Format stop details
 */
export function formatStopDetails(origin: string, destination: string, connectingAirports: string[] = []): string {
  if (connectingAirports.length === 0) {
    return ""; // Don't show route details for nonstop flights
  }
  return `${origin} → ${connectingAirports.join(" → ")} → ${destination}`;
}

/**
 * Format layover duration
 */
export function formatLayoverDuration(layoverMinutes: number): string {
  if (layoverMinutes < 60) {
    return `${layoverMinutes} min`;
  }
  const hours = Math.floor(layoverMinutes / 60);
  const minutes = layoverMinutes % 60;
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}

/**
 * Format layover details for display
 */
export function formatLayoverDetails(layoverAirport: string, layoverMinutes: number): string {
  return `${formatLayoverDuration(layoverMinutes)} ${layoverAirport}`;
}

/**
 * Format segment details for multi-segment flights
 */
export function formatSegmentDetails(segments: Array<{
  origin: string;
  destination: string;
  airline: string;
  flightNumber: string;
  durationMin: number;
}>): string[] {
  return segments.map((segment, index) => {
    const segmentNum = index + 1;
    return `Segment ${segmentNum}: ${segment.origin} → ${segment.destination} (${segment.airline} ${segment.flightNumber}, ${formatDuration(segment.durationMin)})`;
  });
}

/**
 * Check if flight is red-eye based on departure and arrival times
 */
export function getCalendarDayDifference(departIso: string, arriveIso: string, originCode: string, destCode: string): number {
  try {
    const originTz = getAirportTimezone(originCode);
    const destTz = getAirportTimezone(destCode);
    
    // Parse ISO strings while preserving their timezone information
    const departureTime = DateTime.fromISO(departIso, { setZone: true }).setZone(originTz);
    const arrivalTime = DateTime.fromISO(arriveIso, { setZone: true }).setZone(destTz);
    
    return calculateCalendarDayDifference(departureTime, arrivalTime);
  } catch {
    return 0;
  }
}

/**
 * Get formatted departure and arrival times with red-eye detection
 */
export function formatFlightTimes(
  departIso: string, 
  arriveIso: string, 
  originCode: string, 
  destCode: string
): {
  departure: string;
  arrival: string;
  calDayDifference: number;
} {
  try {
    const originTz = getAirportTimezone(originCode);
    const destTz = getAirportTimezone(destCode);
    
    // Parse ISO strings while preserving their timezone information
    const departureTime = DateTime.fromISO(departIso, { setZone: true }).setZone(originTz);
    const arrivalTime = DateTime.fromISO(arriveIso, { setZone: true }).setZone(destTz);
    
    const calDayDifference = calculateCalendarDayDifference(departureTime, arrivalTime);
    
    // Format the day difference indicator
    let dayIndicator = '';
    if (calDayDifference !== 0) {
      const sign = calDayDifference > 0 ? '⁺' : '⁻';
      const absValue = Math.abs(calDayDifference);
      dayIndicator = `${sign}${toSuperscript(absValue)}`;
    }
    
    return {
      departure: departureTime.toFormat('h:mm a'),
      arrival: arrivalTime.toFormat('h:mm a') + dayIndicator,
      calDayDifference
    };
  } catch {
    return {
      departure: 'Unknown',
      arrival: 'Unknown',
      calDayDifference: 0
    };
  }
}

/**
 * Format datetime for tooltip display
 * Format: "HH:MM AM/PM on DoW, Month DD"
 * Example: "11:05 PM on Sun, Sept 21"
 */
export function formatFlightTimeTooltip(
  isoString: string,
  airportCode: string
): string {
  try {
    const timezone = getAirportTimezone(airportCode);
    const dateTime = DateTime.fromISO(isoString, { setZone: true }).setZone(timezone);
    
    // Format the date parts
    const time = dateTime.toFormat('h:mm a'); // "11:05 PM"
    const dayOfWeek = dateTime.toFormat('ccc'); // "Sun"
    const month = dateTime.toFormat('MMM'); // "Sep" - we'll convert to "Sept"
    const day = dateTime.toFormat('d'); // "21"
    
    // Convert month abbreviations to match user's requirement format
    const monthFormatted = month === 'Sep' ? 'Sept' : month;
    
    return `${time} on ${dayOfWeek}, ${monthFormatted} ${day}`;
  } catch {
    return 'Unknown time';
  }
}
