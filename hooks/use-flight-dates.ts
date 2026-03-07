import { useFlight } from '@/providers/flight-provider'

/**
 * Hook that provides only date-related values from FlightContext
 * Use this in components that only need to work with dates
 */
export function useFlightDates() {
  const { 
    departureDate, 
    returnDate, 
    setDepartureDate, 
    setReturnDate,
    setDepartureDateAndTriggerSearch,
    setReturnDateAndTriggerSearch,
    today,
    maxDate
  } = useFlight()
  
  return { 
    departureDate, 
    returnDate, 
    setDepartureDate, 
    setReturnDate,
    setDepartureDateAndTriggerSearch,
    setReturnDateAndTriggerSearch,
    today,
    maxDate
  }
}