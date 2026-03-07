"use client"

import React, { createContext, useContext, useState } from 'react'
import { FlightSegment } from './search-context'

interface MultiCityContextType {
  flightSegments: FlightSegment[]
  setFlightSegments: (segments: FlightSegment[]) => void
  updateFlightSegment: (id: string, field: keyof FlightSegment, value: string | Date) => void
  addFlightSegment: () => void
  removeFlightSegment: (id: string) => void
  swapSegmentLocations: (id: string) => void
}

const MultiCityContext = createContext<MultiCityContextType | undefined>(undefined)

export function MultiCityProvider({ children }: { children: React.ReactNode }) {
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { id: "1", from: "", to: "", date: undefined },
    { id: "2", from: "", to: "", date: undefined },
  ])
  
  const updateFlightSegment = (
    id: string,
    field: keyof FlightSegment,
    value: string | Date
  ) => {
    setFlightSegments((segments) =>
      segments.map((segment) =>
        segment.id === id ? { ...segment, [field]: value } : segment
      )
    )
  }
  
  const addFlightSegment = () => {
    const newId = (Math.max(...flightSegments.map(s => parseInt(s.id))) + 1).toString()
    setFlightSegments([...flightSegments, { id: newId, from: "", to: "", date: undefined }])
  }
  
  const removeFlightSegment = (id: string) => {
    setFlightSegments(flightSegments.filter(segment => segment.id !== id))
  }
  
  const swapSegmentLocations = (id: string) => {
    setFlightSegments((segments) =>
      segments.map((segment) => {
        if (segment.id === id) {
          return { ...segment, from: segment.to, to: segment.from }
        }
        return segment
      })
    )
  }
  
  const value: MultiCityContextType = {
    flightSegments,
    setFlightSegments,
    updateFlightSegment,
    addFlightSegment,
    removeFlightSegment,
    swapSegmentLocations,
  }
  
  return (
    <MultiCityContext.Provider value={value}>
      {children}
    </MultiCityContext.Provider>
  )
}

export function useMultiCity() {
  const context = useContext(MultiCityContext)
  if (!context) {
    throw new Error('useMultiCity must be used within a MultiCityProvider')
  }
  return context
}