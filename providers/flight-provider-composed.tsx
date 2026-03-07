"use client";

import React, { createContext, useContext, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import { SearchProvider, useSearch, PassengerCounts, FlightSegment } from './search-context'
import { FlightSelectionProvider, useFlightSelection, SelectedFlight } from './flight-selection-context'
import { MultiCityProvider, useMultiCity } from './multi-city-context'
import { useSearchTrigger } from '@/hooks/use-search-trigger'
import { 
  FlightSearchParams,
  encodeFlightSearchToUrl,
  decodeFlightSearchFromUrl
} from "@/lib/utils/url-state";

// Re-export types
export type { PassengerCounts, FlightSegment, SelectedFlight }

export interface FlightData {
  tripType: string;
  fromLocation: string;
  toLocation: string;
  departureDate?: Date;
  returnDate?: Date;
  passengers: PassengerCounts;
  travelClass: string;
  flightSegments: FlightSegment[];
  totalPassengers: number;
}

interface FlightContextType {
  // From SearchContext
  tripType: string;
  fromLocation: string;
  toLocation: string;
  departureDate?: Date;
  returnDate?: Date;
  passengers: PassengerCounts;
  travelClass: string;
  totalPassengers: number;
  today: Date;
  maxDate: Date;
  setTripType: React.Dispatch<React.SetStateAction<string>>;
  setFromLocation: (location: string) => void;
  setToLocation: (location: string) => void;
  setDepartureDate: (date?: Date) => void;
  setReturnDate: (date?: Date) => void;
  setPassengers: (passengers: PassengerCounts) => void;
  setTravelClass: (travelClass: string) => void;
  swapLocations: () => void;
  hasMultipleLocations: (location: string) => boolean;
  isSwapDisabled: boolean;
  
  // From FlightSelectionContext
  selectedDepartingFlight?: SelectedFlight;
  selectedReturningFlight?: SelectedFlight;
  selectDepartingFlight: (flight: SelectedFlight) => void;
  selectReturningFlight: (flight: SelectedFlight) => void;
  clearSelectedFlights: () => void;
  clearDepartingFlight: () => void;
  clearReturningFlight: () => void;
  
  // From MultiCityContext
  flightSegments: FlightSegment[];
  setFlightSegments: (segments: FlightSegment[]) => void;
  updateFlightSegment: (id: string, field: keyof FlightSegment, value: string | Date) => void;
  addFlightSegment: () => void;
  removeFlightSegment: (id: string) => void;
  swapSegmentLocations: (id: string) => void;
  
  // Search trigger
  searchTrigger: number;
  triggerSearch: () => void;
  setFromLocationAndTriggerSearch: (location: string) => void;
  setToLocationAndTriggerSearch: (location: string) => void;
  setDepartureDateAndTriggerSearch: (date?: Date) => void;
  setReturnDateAndTriggerSearch: (date?: Date) => void;
  setPassengersAndTriggerSearch: (passengers: PassengerCounts) => void;
  setTravelClassAndTriggerSearch: (travelClass: string) => void;
  
  // Get complete flight data
  getFlightData: () => FlightData;
  
  // URL state management
  updateUrlWithCurrentState: (replace?: boolean) => void;
  initializeFromUrl: () => void;
  navigateToSearchWithState: () => void;
}

const FlightContext = createContext<FlightContextType | undefined>(undefined);

// Inner component that has access to all the sub-contexts
function FlightProviderInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get values from sub-contexts
  const searchContext = useSearch();
  const selectionContext = useFlightSelection();
  const multiCityContext = useMultiCity();
  const { triggerSearch: trigger, searchId } = useSearchTrigger();
  
  // Search trigger functions
  const triggerSearch = useCallback(() => {
    trigger();
  }, [trigger]);
  
  const setFromLocationAndTriggerSearch = useCallback((location: string) => {
    searchContext.setFromLocation(location);
    triggerSearch();
  }, [searchContext, triggerSearch]);
  
  const setToLocationAndTriggerSearch = useCallback((location: string) => {
    searchContext.setToLocation(location);
    triggerSearch();
  }, [searchContext, triggerSearch]);
  
  const setDepartureDateAndTriggerSearch = useCallback((date?: Date) => {
    searchContext.setDepartureDate(date);
    triggerSearch();
  }, [searchContext, triggerSearch]);
  
  const setReturnDateAndTriggerSearch = useCallback((date?: Date) => {
    searchContext.setReturnDate(date);
    triggerSearch();
  }, [searchContext, triggerSearch]);
  
  const setPassengersAndTriggerSearch = useCallback((passengers: PassengerCounts) => {
    searchContext.setPassengers(passengers);
    triggerSearch();
  }, [searchContext, triggerSearch]);
  
  const setTravelClassAndTriggerSearch = useCallback((travelClass: string) => {
    searchContext.setTravelClass(travelClass);
    triggerSearch();
  }, [searchContext, triggerSearch]);
  
  // Get complete flight data
  const getFlightData = useCallback((): FlightData => {
    return {
      tripType: searchContext.tripType,
      fromLocation: searchContext.fromLocation,
      toLocation: searchContext.toLocation,
      departureDate: searchContext.departureDate,
      returnDate: searchContext.returnDate,
      passengers: searchContext.passengers,
      travelClass: searchContext.travelClass,
      flightSegments: multiCityContext.flightSegments,
      totalPassengers: searchContext.totalPassengers,
    };
  }, [searchContext, multiCityContext.flightSegments]);
  
  // URL state management
  const updateUrlWithCurrentState = useCallback((replace = false) => {
    const params: FlightSearchParams = {
      tripType: searchContext.tripType,
      from: searchContext.fromLocation,
      to: searchContext.toLocation,
      departureDate: searchContext.departureDate,
      returnDate: searchContext.returnDate,
      passengers: searchContext.passengers,
      travelClass: searchContext.travelClass,
      segments: searchContext.tripType === 'multi-city' ? multiCityContext.flightSegments.map(s => ({
        id: s.id,
        from: s.from,
        to: s.to,
        date: s.date
      })) : undefined
    };
    
    const urlParams = encodeFlightSearchToUrl(params);
    
    // Preserve existing filter parameters
    const filterKeys = ['stops', 'airlines', 'price', 'dt', 'at', 'dur', 'em', 'ca'];
    filterKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) {
        urlParams.set(key, value);
      }
    });
    
    const newUrl = `${pathname}?${urlParams.toString()}`;
    
    if (replace) {
      router.replace(newUrl);
    } else {
      router.push(newUrl);
    }
  }, [searchContext, multiCityContext.flightSegments, pathname, router, searchParams]);
  
  const initializeFromUrl = useCallback(() => {
    const urlState = decodeFlightSearchFromUrl(searchParams);
    
    if (urlState.tripType) searchContext.setTripType(urlState.tripType);
    if (urlState.from) searchContext.setFromLocation(urlState.from);
    if (urlState.to) searchContext.setToLocation(urlState.to);
    if (urlState.departureDate) searchContext.setDepartureDate(new Date(urlState.departureDate));
    if (urlState.returnDate) searchContext.setReturnDate(new Date(urlState.returnDate));
    if (urlState.passengers) searchContext.setPassengers(urlState.passengers);
    if (urlState.travelClass) searchContext.setTravelClass(urlState.travelClass);
    
    if (urlState.segments && urlState.segments.length > 0) {
      const segments = urlState.segments.map((s, index) => ({
        id: (index + 1).toString(),
        from: s.from || '',
        to: s.to || '',
        date: s.date ? new Date(s.date) : undefined
      }));
      multiCityContext.setFlightSegments(segments);
    }
  }, [searchParams, searchContext, multiCityContext]);
  
  const navigateToSearchWithState = useCallback(() => {
    updateUrlWithCurrentState();
    if (pathname !== '/search') {
      router.push('/search');
    }
  }, [updateUrlWithCurrentState, pathname, router]);
  
  // Combine all context values
  const value: FlightContextType = {
    // From SearchContext
    ...searchContext,
    
    // From FlightSelectionContext
    ...selectionContext,
    
    // From MultiCityContext
    ...multiCityContext,
    
    // Search trigger
    searchTrigger: searchId,
    triggerSearch,
    setFromLocationAndTriggerSearch,
    setToLocationAndTriggerSearch,
    setDepartureDateAndTriggerSearch,
    setReturnDateAndTriggerSearch,
    setPassengersAndTriggerSearch,
    setTravelClassAndTriggerSearch,
    
    // Utility functions
    getFlightData,
    updateUrlWithCurrentState,
    initializeFromUrl,
    navigateToSearchWithState,
  };
  
  return (
    <FlightContext.Provider value={value}>
      {children}
    </FlightContext.Provider>
  );
}

// Main provider that wraps all sub-providers
export function FlightProvider({ children }: { children: React.ReactNode }) {
  return (
    <SearchProvider>
      <FlightSelectionProvider>
        <MultiCityProvider>
          <FlightProviderInner>
            {children}
          </FlightProviderInner>
        </MultiCityProvider>
      </FlightSelectionProvider>
    </SearchProvider>
  );
}

export function useFlight() {
  const context = useContext(FlightContext);
  if (!context) {
    throw new Error('useFlight must be used within a FlightProvider');
  }
  return context;
}
