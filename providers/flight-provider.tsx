"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { addYears, addDays } from "date-fns";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { 
  FlightSearchParams,
  encodeFlightSearchToUrl,
  decodeFlightSearchFromUrl
} from "@/lib/utils/url-state";

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
  lapInfants: number;
}

export interface FlightSegment {
  id: string;
  from: string;
  to: string;
  date?: Date;
}

export interface FlightData {
  tripType: string;
  fromLocation: string;
  toLocation: string;
  departureDate?: Date;
  returnDate?: Date;
  passengers: PassengerCounts;
  travelClass: string;
  flightSegments: FlightSegment[];
}

export interface SelectedFlightSegment {
  departure: string;
  arrival: string;
  departureIso?: string;
  arrivalIso?: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  aircraft: string;
  flightNumber: string;
  calDayDifference?: number;
  airline: string;
  airlineName: string;
}

// Interface for selected flight data
export interface SelectedFlight {
  id: number;
  airline: string;
  airlineCode: string;
  logo?: string;
  departure: string;
  arrival: string;
  departureIso?: string; // Original ISO departure time
  arrivalIso?: string;   // Original ISO arrival time
  duration: string;
  route: string;
  stops: string;
  stopDetails: string;
  emissions: string;
  emissionChange: string;
  price: string;
  priceUsd: number;
  priceLabel: string;
  departureAirport: string;
  arrivalAirport: string;
  aircraft: string;
  flightNumber: string;
  class: string;
  date: string;
  calDayDifference?: number;
  segments?: SelectedFlightSegment[];
}

declare global {
  interface Window {
    __testingAPI?: {
      getState: () => unknown;
    };
  }
}

interface FlightContextType {
  // State
  tripType: string;
  fromLocation: string;
  toLocation: string;
  departureDate?: Date;
  returnDate?: Date;
  passengers: PassengerCounts;
  travelClass: string;
  flightSegments: FlightSegment[];
  
  // Selected flights state
  selectedDepartingFlight?: SelectedFlight;
  selectedReturningFlight?: SelectedFlight;
  
  // Search trigger state
  searchTrigger: number;
  
  // Computed values
  totalPassengers: number;
  today: Date;
  maxDate: Date;
  
  // Setters
  setTripType: React.Dispatch<React.SetStateAction<string>>;
  setFromLocation: (location: string) => void;
  setToLocation: (location: string) => void;
  setDepartureDate: (date?: Date) => void;
  setReturnDate: (date?: Date) => void;
  setPassengers: (passengers: PassengerCounts) => void;
  setTravelClass: (travelClass: string) => void;
  setFlightSegments: (segments: FlightSegment[]) => void;
  
  // Search trigger functions
  triggerSearch: () => void;
  setFromLocationAndTriggerSearch: (location: string) => void;
  setToLocationAndTriggerSearch: (location: string) => void;
  setDepartureDateAndTriggerSearch: (date?: Date) => void;
  setReturnDateAndTriggerSearch: (date?: Date) => void;
  setPassengersAndTriggerSearch: (passengers: PassengerCounts) => void;
  setTravelClassAndTriggerSearch: (travelClass: string) => void;
  
  // Flight selection functions
  selectDepartingFlight: (flight: SelectedFlight) => void;
  selectReturningFlight: (flight: SelectedFlight) => void;
  clearSelectedFlights: () => void;
  clearDepartingFlight: () => void;
  clearReturningFlight: () => void;
  
  // Helper functions
  updateFlightSegment: (id: string, field: keyof FlightSegment, value: string | Date) => void;
  addFlightSegment: () => void;
  removeFlightSegment: (id: string) => void;
  swapLocations: () => void;
  swapSegmentLocations: (id: string) => void;
  hasMultipleLocations: (location: string) => boolean;
  isSwapDisabled: boolean;
  
  // Get complete flight data
  getFlightData: () => FlightData;
  
  // URL state management
  updateUrlWithCurrentState: (replace?: boolean) => void;
  initializeFromUrl: () => void;
  navigateToSearchWithState: () => void;
}

const FlightContext = createContext<FlightContextType | undefined>(undefined);

export function FlightProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = addYears(today, 1);
  
  const [tripType, setTripType] = useState("round-trip");
  const [fromLocation, setFromLocation] = useState("San Francisco");
  const [toLocation, setToLocation] = useState("");
  const [departureDate, setDepartureDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [passengers, setPassengers] = useState<PassengerCounts>({
    adults: 1,
    children: 0,
    infants: 0,
    lapInfants: 0,
  });
  const [travelClass, setTravelClass] = useState("economy");
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { id: "1", from: "", to: "", date: undefined },
    { id: "2", from: "", to: "", date: undefined },
  ]);

  // Selected flights state
  const [selectedDepartingFlight, setSelectedDepartingFlight] = useState<SelectedFlight>();
  const [selectedReturningFlight, setSelectedReturningFlight] = useState<SelectedFlight>();

  // Search trigger state - increments when search should be triggered
  const [searchTrigger, setSearchTrigger] = useState(0);

  const totalPassengers = passengers.adults + passengers.children + passengers.infants + passengers.lapInfants;

  const hasMultipleLocations = (location: string) => {
    return location.includes(" • ");
  };

  const isSwapDisabled = hasMultipleLocations(fromLocation) || hasMultipleLocations(toLocation);

  const updateFlightSegment = (
    id: string,
    field: keyof FlightSegment,
    value: string | Date
  ) => {
    setFlightSegments((segments) =>
      segments.map((segment) =>
        segment.id === id ? { ...segment, [field]: value } : segment
      )
    );
  };

  const addFlightSegment = () => {
    const lastSegment = flightSegments[flightSegments.length - 1];
    const newDate = lastSegment.date ? addDays(lastSegment.date, 1) : undefined;

    const newSegment: FlightSegment = {
      id: Date.now().toString(),
      from: "",
      to: "",
      date: newDate,
    };
    setFlightSegments([...flightSegments, newSegment]);
  };

  const removeFlightSegment = (id: string) => {
    if (flightSegments.length > 1) {
      setFlightSegments(flightSegments.filter((segment) => segment.id !== id));
    }
  };

  const swapLocations = () => {
    if (isSwapDisabled) return;
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  const swapSegmentLocations = (id: string) => {
    setFlightSegments((segments) =>
      segments.map((segment) =>
        segment.id === id
          ? { ...segment, from: segment.to, to: segment.from }
          : segment
      )
    );
  };

  // Search trigger functions
  const triggerSearch = useCallback(() => {
    setSearchTrigger(prev => prev + 1);
  }, []);

  const setFromLocationAndTriggerSearch = useCallback((location: string) => {
    setFromLocation(location);
    triggerSearch();
  }, [triggerSearch]);

  const setToLocationAndTriggerSearch = useCallback((location: string) => {
    setToLocation(location);
    triggerSearch();
  }, [triggerSearch]);

  const setDepartureDateAndTriggerSearch = useCallback((date?: Date) => {
    setDepartureDate(date);
    triggerSearch();
  }, [triggerSearch]);

  const setReturnDateAndTriggerSearch = useCallback((date?: Date) => {
    setReturnDate(date);
    triggerSearch();
  }, [triggerSearch]);

  const setPassengersAndTriggerSearch = useCallback((passengers: PassengerCounts) => {
    setPassengers(passengers);
    triggerSearch();
  }, [triggerSearch]);

  const setTravelClassAndTriggerSearch = useCallback((travelClass: string) => {
    setTravelClass(travelClass);
    triggerSearch();
  }, [triggerSearch]);

  // Flight selection functions
  const selectDepartingFlight = (flight: SelectedFlight) => {
    setSelectedDepartingFlight(flight);
  };

  const selectReturningFlight = (flight: SelectedFlight) => {
    setSelectedReturningFlight(flight);
  };

  const clearSelectedFlights = useCallback(() => {
    setSelectedDepartingFlight(undefined);
    setSelectedReturningFlight(undefined);
  }, []);

  const clearDepartingFlight = useCallback(() => {
    setSelectedDepartingFlight(undefined);
  }, []);

  const clearReturningFlight = useCallback(() => {
    setSelectedReturningFlight(undefined);
  }, []);

  const getFlightData = (): FlightData => ({
    tripType,
    fromLocation,
    toLocation,
    departureDate,
    returnDate,
    passengers,
    travelClass,
    flightSegments,
  });

  // URL state management functions
  const updateUrlWithCurrentState = useCallback((replace = true) => {
    const currentSearchParams: FlightSearchParams = {
      tripType,
      from: fromLocation,
      to: toLocation,
      departureDate,
      returnDate,
      passengers,
      travelClass,
      segments: flightSegments.filter(s => s.from || s.to || s.date)
    };

    const urlParams = encodeFlightSearchToUrl(currentSearchParams);
    
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
  }, [
    tripType, fromLocation, toLocation, departureDate, returnDate, 
    passengers, travelClass, flightSegments, pathname, router, searchParams
  ]);

  const initializeFromUrl = useCallback(() => {
    const urlState = decodeFlightSearchFromUrl(searchParams);
    
    if (Object.keys(urlState).length > 0) {
      if (urlState.tripType) setTripType(urlState.tripType);
      if (urlState.from) setFromLocation(urlState.from);
      if (urlState.to) setToLocation(urlState.to);
      if (urlState.departureDate) setDepartureDate(urlState.departureDate);
      if (urlState.returnDate) setReturnDate(urlState.returnDate);
      if (urlState.passengers) setPassengers(urlState.passengers);
      if (urlState.travelClass) setTravelClass(urlState.travelClass);
      if (urlState.segments) setFlightSegments(urlState.segments);
    }
  }, [searchParams]);

  const navigateToSearchWithState = useCallback(() => {
    const currentSearchParams: FlightSearchParams = {
      tripType,
      from: fromLocation,
      to: toLocation,
      departureDate,
      returnDate,
      passengers,
      travelClass,
      segments: flightSegments.filter(s => s.from || s.to || s.date)
    };

    const urlParams = encodeFlightSearchToUrl(currentSearchParams);
    
    // Preserve existing filter parameters if we're already on the search page
    if (pathname === '/search') {
      const filterKeys = ['stops', 'airlines', 'price', 'dt', 'at', 'dur', 'em', 'ca'];
      filterKeys.forEach(key => {
        const value = searchParams.get(key);
        if (value) {
          urlParams.set(key, value);
        }
      });
    }
    
    router.push(`/search?${urlParams.toString()}`);
  }, [
    tripType, fromLocation, toLocation, departureDate, returnDate,
    passengers, travelClass, flightSegments, router, pathname, searchParams
  ]);

  // Initialize state from URL on mount (all pages)
  useEffect(() => {
    initializeFromUrl();
  }, []); // Only run on mount

  // Sync state changes to URL on main page in real-time
  useEffect(() => {
    if (pathname === '/') {
      // Always sync state to URL on main page for persistence on refresh
      updateUrlWithCurrentState(true);
    }
  }, [
    tripType, fromLocation, toLocation, departureDate, returnDate, 
    passengers, travelClass, flightSegments, pathname, updateUrlWithCurrentState
  ]);

  // Reset return date when switching to one-way and clear selected flights when trip type changes
  useEffect(() => {
    if (tripType === "one-way") {
      setReturnDate(undefined);
    }
    // Clear selected flights when trip type changes
    clearSelectedFlights();
  }, [tripType, clearSelectedFlights]);

  // Clear selected flights when locations change
  useEffect(() => {
    clearSelectedFlights();
  }, [fromLocation, toLocation, clearSelectedFlights]);

  // Add Testing API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__testingAPI = {
        getState: () => ({
          // Core form data
          tripType,
          fromLocation,
          toLocation,
          departureDate: departureDate?.toISOString(),
          returnDate: returnDate?.toISOString(),
          
          // Passenger information
          passengers: {
            adults: passengers.adults,
            children: passengers.children,
            infants: passengers.infants,
            lapInfants: passengers.lapInfants,
          },
          totalPassengers,
          
          // Travel class
          travelClass,
          
          // Multi-city segments (for multi-city trips)
          flightSegments: flightSegments.map(segment => ({
            id: segment.id,
            from: segment.from,
            to: segment.to,
            date: segment.date?.toISOString()
          })),
          
          // Form validation state
          isSearchReady: tripType === 'multi-city' 
            ? flightSegments.every(s => s.from && s.to && s.date)
            : !!(fromLocation && toLocation && departureDate && (tripType === 'one-way' || !!returnDate)),
          
          // UI state
          hasMultipleFromLocations: hasMultipleLocations(fromLocation),
          hasMultipleToLocations: hasMultipleLocations(toLocation),
        })
      };
    }
  }, [
    tripType,
    fromLocation,
    toLocation,
    departureDate,
    returnDate,
    passengers,
    travelClass,
    flightSegments,
    totalPassengers
  ]);

  const value: FlightContextType = {
    // State
    tripType,
    fromLocation,
    toLocation,
    departureDate,
    returnDate,
    passengers,
    travelClass,
    flightSegments,
    
    // Selected flights
    selectedDepartingFlight,
    selectedReturningFlight,
    
    // Search trigger state
    searchTrigger,
    
    // Computed values
    totalPassengers,
    today,
    maxDate,
    
    // Setters
    setTripType,
    setFromLocation,
    setToLocation,
    setDepartureDate,
    setReturnDate,
    setPassengers,
    setTravelClass,
    setFlightSegments,
    
    // Search trigger functions
    triggerSearch,
    setFromLocationAndTriggerSearch,
    setToLocationAndTriggerSearch,
    setDepartureDateAndTriggerSearch,
    setReturnDateAndTriggerSearch,
    setPassengersAndTriggerSearch,
    setTravelClassAndTriggerSearch,
    
    // Flight selection functions
    selectDepartingFlight,
    selectReturningFlight,
    clearSelectedFlights,
    clearDepartingFlight,
    clearReturningFlight,
    
    // Helper functions
    updateFlightSegment,
    addFlightSegment,
    removeFlightSegment,
    swapLocations,
    swapSegmentLocations,
    hasMultipleLocations,
    isSwapDisabled,
    
    // Get complete flight data
    getFlightData,
    
    // URL state management
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

export function useFlight() {
  const context = useContext(FlightContext);
  if (context === undefined) {
    throw new Error("useFlight must be used within a FlightProvider");
  }
  return context;
} 
