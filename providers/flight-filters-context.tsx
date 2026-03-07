"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { 
  DEFAULT_AIRLINE_CODES, 
  DEFAULT_CONNECTING_AIRPORT_CODES,
  extractAirlinesFromFlights,
  getCombinedAirlineOptions
} from '@/lib/constants/filters'
import {
  FilterParams,
  encodeFiltersToUrl,
  decodeFiltersFromUrl
} from '@/lib/utils/url-state'

interface FilterState {
  stops: 'any' | 'nonstop' | 'one-or-fewer' | 'two-or-fewer'
  airlines: string[]
  bags: {
    carryOn: number
    checked: number
  }
  priceRange: number
  times: {
    outbound: {
      departure: [number, number]
      arrival: [number, number]
    }
    return: {
      departure: [number, number]
      arrival: [number, number]
    }
  }
  emissions: string
  connectingAirports: string[]
  duration: [number, number]
  stopoverDuration: [number, number]
  separateTickets: 'show' | 'hide'
}

interface PriceRange {
  min: number
  max: number
}

interface FilterContextType {
  filters: FilterState
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  resetFilters: () => void
  resetFilter: (key: keyof FilterState) => void
  activeFiltersCount: number
  availableAirlines: Array<{ code: string; name: string }>
  updateFlightData: (flights: any[]) => void
  priceRange: PriceRange
}

const defaultFilters: FilterState = {
  stops: 'any',
  airlines: [], // Will be populated with all available airlines once flight data loads
  bags: {
    carryOn: 0,
    checked: 0
  },
  priceRange: Infinity, // Will be set to dynamic max once flight data loads
  times: {
    outbound: {
      departure: [0, 24],
      arrival: [0, 24]
    },
    return: {
      departure: [0, 24],
      arrival: [0, 24]
    }
  },
  emissions: 'any',
  connectingAirports: DEFAULT_CONNECTING_AIRPORT_CODES,
  duration: [0, 24],
  stopoverDuration: [1, 24],
  separateTickets: 'show'
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [availableAirlines, setAvailableAirlines] = useState<Array<{ code: string; name: string }>>([])
  const [currentFlightData, setCurrentFlightData] = useState<any[]>([])
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 100, max: 1000 })
  const [pendingUrlUpdate, setPendingUrlUpdate] = useState<FilterState | null>(null)

  const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value }
      setPendingUrlUpdate(newFilters)
      return newFilters
    })
  }

  const resetFilters = () => {
    const newFilters = defaultFilters
    setFilters(newFilters)
    setPendingUrlUpdate(newFilters)
  }

  const resetFilter = (key: keyof FilterState) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: defaultFilters[key] }
      setPendingUrlUpdate(newFilters)
      return newFilters
    })
  }

  // URL state management for filters
  const updateUrlWithFilters = useCallback((filterState: FilterState) => {
    const currentParams = new URLSearchParams(searchParams)
    const filterParams = encodeFiltersToUrl({
      stops: filterState.stops,
      airlines: filterState.airlines,
      priceRange: filterState.priceRange,
      departureTime: filterState.times.outbound.departure,
      arrivalTime: filterState.times.outbound.arrival,
      duration: filterState.duration,
      emissions: filterState.emissions,
      connectingAirports: filterState.connectingAirports
    })
    
    // Remove existing filter parameters
    const filterKeys = ['stops', 'airlines', 'price', 'dt', 'at', 'dur', 'em', 'ca']
    filterKeys.forEach(key => currentParams.delete(key))
    
    // Add new filter parameters
    filterParams.forEach((value, key) => {
      currentParams.set(key, value)
    })
    
    const newUrl = `${pathname}?${currentParams.toString()}`
    router.replace(newUrl)
  }, [pathname, searchParams, router])

  const initializeFiltersFromUrl = () => {
    const urlFilters = decodeFiltersFromUrl(searchParams)
    
    if (Object.keys(urlFilters).length > 0) {
      setFilters(prev => ({
        ...prev,
        stops: urlFilters.stops || prev.stops,
        // Only set airlines from URL if they were explicitly filtered (not empty)
        airlines: urlFilters.airlines && urlFilters.airlines.length > 0 ? urlFilters.airlines : prev.airlines,
        // Only set price from URL if it was explicitly set
        priceRange: urlFilters.priceRange !== undefined ? urlFilters.priceRange : prev.priceRange,
        times: {
          outbound: {
            departure: urlFilters.departureTime || prev.times.outbound.departure,
            arrival: urlFilters.arrivalTime || prev.times.outbound.arrival
          },
          return: prev.times.return
        },
        duration: urlFilters.duration || prev.duration,
        emissions: urlFilters.emissions || prev.emissions,
        connectingAirports: urlFilters.connectingAirports || prev.connectingAirports
      }))
    }
  }

  const updateFlightData = (flights: any[]) => {
    setCurrentFlightData(flights)
  }

  // Calculate dynamic price range based on flight data
  const calculatePriceRange = (flights: any[]): PriceRange => {
    if (flights.length === 0) {
      return { min: 100, max: 1000 } // Default range when no flights
    }

    // Collect prices from all available cabin classes, not just the selected one
    const allPrices: number[] = []
    
    flights.forEach(flight => {
      // Add the current flight's price (for selected cabin)
      if (flight.priceUsd != null && flight.priceUsd > 0) {
        allPrices.push(flight.priceUsd)
      }
      
      // Also add prices from all available cabin classes
      if (flight.cabinPricing && Array.isArray(flight.cabinPricing)) {
        flight.cabinPricing.forEach((cabinPrice: any) => {
          if (cabinPrice.seatsRemaining > 0 && cabinPrice.priceUsd != null && cabinPrice.priceUsd > 0) {
            allPrices.push(cabinPrice.priceUsd)
          }
        })
      }
    })
    
    if (allPrices.length === 0) {
      return { min: 100, max: 1000 } // Default range when no valid prices
    }

    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    
    // Add $50 buffer on both ends as requested
    const bufferedMin = Math.max(50, Math.floor(minPrice - 50))
    const bufferedMax = Math.ceil(maxPrice + 50)
    
    // Round to nice increments
    const roundedMin = Math.floor(bufferedMin / 50) * 50
    const roundedMax = Math.ceil(bufferedMax / 50) * 50
    
    return {
      min: roundedMin,
      max: roundedMax
    }
  }

  // Initialize available airlines on mount
  useEffect(() => {
    const initializeAirlines = async () => {
      const { AIRLINES } = await import('@/lib/constants/filters')
      setAvailableAirlines(AIRLINES)
    }
    initializeAirlines()
  }, [])

  // Initialize filters from URL on mount
  useEffect(() => {
    initializeFiltersFromUrl()
  }, []) // Only run on mount

  // Track search parameters to clear invalid filters when location changes
  const [prevSearchParams, setPrevSearchParams] = useState<{
    from?: string | null
    to?: string | null
  }>({})

  // Clear filter URL parameters when search location parameters change
  useEffect(() => {
    const currentFrom = searchParams.get('from')
    const currentTo = searchParams.get('to')

    // Check if this is not the initial load and location parameters have changed
    if (prevSearchParams.from !== undefined || prevSearchParams.to !== undefined) {
      const fromChanged = prevSearchParams.from !== currentFrom
      const toChanged = prevSearchParams.to !== currentTo

      if (fromChanged || toChanged) {
        // Clear filter parameters from URL since they may no longer be valid
        const currentParams = new URLSearchParams(searchParams)
        const filterKeys = ['stops', 'airlines', 'price', 'dt', 'at', 'dur', 'em', 'ca']

        let hasFilterParams = false
        filterKeys.forEach(key => {
          if (currentParams.has(key)) {
            hasFilterParams = true
            currentParams.delete(key)
          }
        })

        // Only update URL if there were filter parameters to remove
        if (hasFilterParams) {
          const newUrl = `${pathname}?${currentParams.toString()}`
          router.replace(newUrl)
        }

        // Reset filters to defaults (airlines will remain empty, price will remain at Infinity)
        setFilters(defaultFilters)
      }
    }

    // Update tracked search parameters only when they actually change
    if (prevSearchParams.from !== currentFrom || prevSearchParams.to !== currentTo) {
      setPrevSearchParams({
        from: currentFrom,
        to: currentTo
      })
    }
  }, [searchParams, pathname, router, prevSearchParams.from, prevSearchParams.to])

  // Handle URL updates when filters change
  useEffect(() => {
    if (pendingUrlUpdate) {
      updateUrlWithFilters(pendingUrlUpdate)
      setPendingUrlUpdate(null)
    }
  }, [pendingUrlUpdate, pathname, searchParams, router, updateUrlWithFilters])

  // Update available airlines and price range when flight data changes
  useEffect(() => {
    const updateAvailableAirlines = async () => {
      if (currentFlightData.length > 0) {
        const flightAirlineCodes = extractAirlinesFromFlights(currentFlightData)
        const combinedOptions = await getCombinedAirlineOptions(flightAirlineCodes)
        setAvailableAirlines(combinedOptions)
        
        // Calculate dynamic price range
        const newPriceRange = calculatePriceRange(currentFlightData)
        setPriceRange(newPriceRange)
        
        // Only update filters if they were explicitly set from URL parameters
        // Don't auto-populate airlines or price to avoid making filters appear active
        const urlFilters = decodeFiltersFromUrl(searchParams)
        const hasUrlAirlines = urlFilters.airlines && urlFilters.airlines.length > 0
        const hasUrlPrice = urlFilters.priceRange !== undefined
        
        if (hasUrlAirlines || hasUrlPrice) {
          setFilters(prev => ({
            ...prev,
            // Only update airlines if they were explicitly set in URL
            airlines: hasUrlAirlines ? (urlFilters.airlines || []) : prev.airlines,
            // Only update price if it was explicitly set in URL
            priceRange: hasUrlPrice ? (urlFilters.priceRange || prev.priceRange) : prev.priceRange
          }))
        }
      }
    }

    if (currentFlightData.length > 0) {
      updateAvailableAirlines()
    }
  }, [currentFlightData, searchParams])

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    // Special handling for price range - it's only active if below the dynamic maximum
    if (key === 'priceRange') {
      return (value as number) < priceRange.max
    }
    
    const defaultValue = defaultFilters[key as keyof FilterState]
    if (Array.isArray(value)) {
      const defaultArray = defaultValue as unknown[]
      if (Array.isArray(defaultArray)) {
        // For arrays, compare actual content, not just length
        return value.length !== defaultArray.length || 
               !value.every(item => defaultArray.includes(item))
      }
      return value.length > 0
    }
    if (typeof value === 'object' && value !== null) {
      if ('outbound' in value && 'return' in value) {
        const defaultObj = defaultValue as { outbound: { departure: [number, number], arrival: [number, number] }, return: { departure: [number, number], arrival: [number, number] } }
        return value.outbound.departure[0] !== defaultObj.outbound.departure[0] || 
               value.outbound.departure[1] !== defaultObj.outbound.departure[1] ||
               value.outbound.arrival[0] !== defaultObj.outbound.arrival[0] || 
               value.outbound.arrival[1] !== defaultObj.outbound.arrival[1] ||
               value.return.departure[0] !== defaultObj.return.departure[0] || 
               value.return.departure[1] !== defaultObj.return.departure[1] ||
               value.return.arrival[0] !== defaultObj.return.arrival[0] || 
               value.return.arrival[1] !== defaultObj.return.arrival[1]
      }
      return JSON.stringify(value) !== JSON.stringify(defaultValue)
    }
    return value !== defaultValue
  }).length

  return (
    <FilterContext.Provider value={{ 
      filters, 
      setFilter, 
      resetFilters, 
      resetFilter, 
      activeFiltersCount,
      availableAirlines,
      updateFlightData,
      priceRange
    }}>
      {children}
    </FilterContext.Provider>
  )
}

export const useFilters = () => {
  const context = useContext(FilterContext)
  if (!context) throw new Error('useFilters must be used within FilterProvider')
  return context
} 