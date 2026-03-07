import { useFlight } from '@/providers/flight-provider'

/**
 * Hook that provides only location-related values from FlightContext
 * Use this in components that only need to work with locations
 */
export function useFlightLocations() {
  const { 
    fromLocation,
    toLocation,
    setFromLocation,
    setToLocation,
    setFromLocationAndTriggerSearch,
    setToLocationAndTriggerSearch,
    swapLocations,
    hasMultipleLocations,
    isSwapDisabled
  } = useFlight()
  
  return { 
    fromLocation,
    toLocation,
    setFromLocation,
    setToLocation,
    setFromLocationAndTriggerSearch,
    setToLocationAndTriggerSearch,
    swapLocations,
    hasMultipleLocations,
    isSwapDisabled
  }
}