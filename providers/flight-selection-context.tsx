"use client"

import React, { createContext, useContext, useState } from 'react'

export interface SelectedFlight {
  id: number
  airline: string
  airlineCode: string
  logo?: string
  departure: string
  arrival: string
  departureIso?: string
  arrivalIso?: string
  duration: string
  route: string
  stops: string
  stopDetails: string
  emissions: string
  emissionChange: string
  price: string
  priceUsd: number
  priceLabel: string
  departureAirport: string
  arrivalAirport: string
  aircraft: string
  flightNumber: string
  class: string
  date: string
  calDayDifference?: number
  segments?: any[]
}

interface FlightSelectionContextType {
  // Selected flights state
  selectedDepartingFlight?: SelectedFlight
  selectedReturningFlight?: SelectedFlight
  
  // Flight selection functions
  selectDepartingFlight: (flight: SelectedFlight) => void
  selectReturningFlight: (flight: SelectedFlight) => void
  clearSelectedFlights: () => void
  clearDepartingFlight: () => void
  clearReturningFlight: () => void
}

const FlightSelectionContext = createContext<FlightSelectionContextType | undefined>(undefined)

export function FlightSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedDepartingFlight, setSelectedDepartingFlight] = useState<SelectedFlight>()
  const [selectedReturningFlight, setSelectedReturningFlight] = useState<SelectedFlight>()
  
  const selectDepartingFlight = (flight: SelectedFlight) => {
    setSelectedDepartingFlight(flight)
  }
  
  const selectReturningFlight = (flight: SelectedFlight) => {
    setSelectedReturningFlight(flight)
  }
  
  const clearSelectedFlights = () => {
    setSelectedDepartingFlight(undefined)
    setSelectedReturningFlight(undefined)
  }
  
  const clearDepartingFlight = () => {
    setSelectedDepartingFlight(undefined)
  }
  
  const clearReturningFlight = () => {
    setSelectedReturningFlight(undefined)
  }
  
  const value: FlightSelectionContextType = {
    // Selected flights
    selectedDepartingFlight,
    selectedReturningFlight,
    
    // Flight selection functions
    selectDepartingFlight,
    selectReturningFlight,
    clearSelectedFlights,
    clearDepartingFlight,
    clearReturningFlight,
  }
  
  return (
    <FlightSelectionContext.Provider value={value}>
      {children}
    </FlightSelectionContext.Provider>
  )
}

export function useFlightSelection() {
  const context = useContext(FlightSelectionContext)
  if (!context) {
    throw new Error('useFlightSelection must be used within a FlightSelectionProvider')
  }
  return context
}