// lib/geo.ts
import { DateTime } from "luxon";
import airports from "@/data/airports.json";

export function haversine(origin: string, dest: string): number {
  const R = 6371; // km
  const deg2rad = (d: number) => (d * Math.PI) / 180;

  const a = airports.find(a => a.iata === origin);
  const b = airports.find(a => a.iata === dest);
  
  if (!a) {
    throw new Error(`Airport with IATA code "${origin}" not found`);
  }
  if (!b) {
    throw new Error(`Airport with IATA code "${dest}" not found`);
  }

  const dLat = deg2rad(b.lat - a.lat);
  const dLon = deg2rad(b.lon - a.lon);

  const lat1 = deg2rad(a.lat);
  const lat2 = deg2rad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h)); // km
}

export function toLocalIso(iata: string, day: string, minutesOfDay: number) {
  const airport = airports.find(a => a.iata === iata);
  if (!airport) {
    throw new Error(`Airport with IATA code "${iata}" not found`);
  }
  const tz = airport.tz;
  // Use luxon for simplicity
  return DateTime.fromISO(day, { zone: tz })
    .plus({ minutes: minutesOfDay })
    .toISO({ suppressMilliseconds: true });
}
