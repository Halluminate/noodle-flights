"use client"

import React, { createContext, useContext, useState } from 'react'
import { addYears } from 'date-fns'

export interface PassengerCounts {
  adults: number
  children: number
  infants: number
  lapInfants: number
}

export interface FlightSegment {
  id: string
  from: string
  to: string
  date?: Date
}

interface SearchContextType {
  // Core search parameters
  tripType: string
  fromLocation: string
  toLocation: string
  departureDate?: Date
  returnDate?: Date
  passengers: PassengerCounts
  travelClass: string
  
  // Computed values
  totalPassengers: number
  today: Date
  maxDate: Date
  
  // Setters
  setTripType: React.Dispatch<React.SetStateAction<string>>
  setFromLocation: (location: string) => void
  setToLocation: (location: string) => void
  setDepartureDate: (date?: Date) => void
  setReturnDate: (date?: Date) => void
  setPassengers: (passengers: PassengerCounts) => void
  setTravelClass: (travelClass: string) => void
  
  // Helper functions
  swapLocations: () => void
  hasMultipleLocations: (location: string) => boolean
  isSwapDisabled: boolean
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = addYears(today, 1)
  
  const [tripType, setTripType] = useState("round-trip")
  const [fromLocation, setFromLocation] = useState("San Francisco")
  const [toLocation, setToLocation] = useState("")
  const [departureDate, setDepartureDate] = useState<Date>()
  const [returnDate, setReturnDate] = useState<Date>()
  const [passengers, setPassengers] = useState<PassengerCounts>({
    adults: 1,
    children: 0,
    infants: 0,
    lapInfants: 0,
  })
  const [travelClass, setTravelClass] = useState("economy")
  
  const totalPassengers = passengers.adults + passengers.children + passengers.infants + passengers.lapInfants
  
  const hasMultipleLocations = (location: string) => {
    return location.includes(" • ")
  }
  
  const isSwapDisabled = hasMultipleLocations(fromLocation) || hasMultipleLocations(toLocation)
  
  const swapLocations = () => {
    if (isSwapDisabled) return
    const temp = fromLocation
    setFromLocation(toLocation)
    setToLocation(temp)
  }
  
  const value: SearchContextType = {
    // State
    tripType,
    fromLocation,
    toLocation,
    departureDate,
    returnDate,
    passengers,
    travelClass,
    
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
    
    // Helper functions
    swapLocations,
    hasMultipleLocations,
    isSwapDisabled,
  }
  
  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}