import { useFlight } from '@/providers/flight-provider'

/**
 * Hook that provides only search parameter values from FlightContext
 * Use this in components that need trip type, passengers, or travel class
 */
export function useFlightSearchParams() {
  const { 
    tripType,
    setTripType,
    passengers,
    setPassengers,
    totalPassengers,
    travelClass,
    setTravelClass
  } = useFlight()
  
  return { 
    tripType,
    setTripType,
    passengers,
    setPassengers,
    totalPassengers,
    travelClass,
    setTravelClass
  }
}