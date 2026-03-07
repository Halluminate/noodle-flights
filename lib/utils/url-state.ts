/**
 * URL State Management Utilities
 * 
 * Provides functionality to encode/decode flight search state to/from URL parameters
 * Similar to Google Flights' approach but using readable query parameters instead of protobuf
 */

import { format, parse, isValid } from 'date-fns'

export interface FlightSearchParams {
  tripType: string
  from: string
  to: string
  departureDate?: Date
  returnDate?: Date
  passengers: {
    adults: number
    children: number
    infants: number
    lapInfants: number
  }
  travelClass: string
  segments?: Array<{
    id: string
    from: string
    to: string
    date?: Date
  }>
}

export interface FilterParams {
  stops?: 'any' | 'nonstop' | 'one-or-fewer' | 'two-or-fewer'
  airlines?: string[]
  priceRange?: number
  departureTime?: [number, number]
  arrivalTime?: [number, number]
  duration?: [number, number]
  emissions?: string
  connectingAirports?: string[]
}

type FlightSearchSegment = NonNullable<FlightSearchParams["segments"]>[number]

/**
 * Encodes flight search parameters into URL search params
 */
export function encodeFlightSearchToUrl(params: FlightSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams()

  // Basic search parameters - only add if different from defaults
  if (params.tripType !== 'round-trip') {
    searchParams.set('tt', params.tripType) // trip type
  }
  if (params.from && params.from !== 'San Francisco') {
    searchParams.set('f', encodeLocationString(params.from))
  }
  if (params.to) searchParams.set('t', encodeLocationString(params.to))
  
  // Dates
  if (params.departureDate) {
    searchParams.set('dd', format(params.departureDate, 'yyyy-MM-dd'))
  }
  if (params.returnDate) {
    searchParams.set('rd', format(params.returnDate, 'yyyy-MM-dd'))
  }

  // Passengers (only include if different from default: 1 adult, 0 others)
  const { adults, children, infants, lapInfants } = params.passengers
  if (adults !== 1) searchParams.set('pa', adults.toString())
  if (children > 0) searchParams.set('pc', children.toString())
  if (infants > 0) searchParams.set('pi', infants.toString())
  if (lapInfants > 0) searchParams.set('pl', lapInfants.toString())

  // Travel class (only if not economy)
  if (params.travelClass !== 'economy') {
    searchParams.set('cl', encodeTravelClass(params.travelClass))
  }

  // Multi-city segments
  if (params.segments && params.segments.length > 0) {
    const validSegments = params.segments.filter(s => s.from && s.to)
    if (validSegments.length > 0) {
      const segmentStrings = validSegments.map(segment => {
        const parts = [
          encodeLocationString(segment.from),
          encodeLocationString(segment.to)
        ]
        if (segment.date) {
          parts.push(format(segment.date, 'yyyy-MM-dd'))
        }
        return parts.join(':')
      })
      searchParams.set('segs', segmentStrings.join('|'))
    }
  }

  return searchParams
}

/**
 * Decodes URL search params back into flight search parameters
 */
export function decodeFlightSearchFromUrl(searchParams: URLSearchParams): Partial<FlightSearchParams> {
  const params: Partial<FlightSearchParams> = {}

  // Basic search parameters
  const tripType = searchParams.get('tt')
  if (tripType) params.tripType = tripType

  const from = searchParams.get('f')
  if (from) params.from = decodeLocationString(from)

  const to = searchParams.get('t')
  if (to) params.to = decodeLocationString(to)

  // Dates
  const departureDate = searchParams.get('dd')
  if (departureDate) {
    const parsedDate = parse(departureDate, 'yyyy-MM-dd', new Date())
    if (isValid(parsedDate)) {
      params.departureDate = parsedDate
    }
  }

  const returnDate = searchParams.get('rd')
  if (returnDate) {
    const parsedDate = parse(returnDate, 'yyyy-MM-dd', new Date())
    if (isValid(parsedDate)) {
      params.returnDate = parsedDate
    }
  }

  // Passengers
  const adults = parseInt(searchParams.get('pa') || '1')
  const children = parseInt(searchParams.get('pc') || '0')
  const infants = parseInt(searchParams.get('pi') || '0')
  const lapInfants = parseInt(searchParams.get('pl') || '0')
  
  params.passengers = { adults, children, infants, lapInfants }

  // Travel class
  const travelClass = searchParams.get('cl')
  if (travelClass) {
    params.travelClass = decodeTravelClass(travelClass)
  } else {
    params.travelClass = 'economy'
  }

  // Multi-city segments
  const segments = searchParams.get('segs')
  if (segments) {
    const segmentStrings = segments.split('|')
    params.segments = segmentStrings.map((segmentStr, index) => {
      const parts = segmentStr.split(':')
      const segment: FlightSearchSegment = {
        id: (index + 1).toString(),
        from: parts[0] ? decodeLocationString(parts[0]) : '',
        to: parts[1] ? decodeLocationString(parts[1]) : ''
      }
      
      if (parts[2]) {
        const parsedDate = parse(parts[2], 'yyyy-MM-dd', new Date())
        if (isValid(parsedDate)) {
          segment.date = parsedDate
        }
      }
      
      return segment
    })
  }

  return params
}

/**
 * Encodes filter parameters into URL search params
 */
export function encodeFiltersToUrl(filters: FilterParams): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (filters.stops && filters.stops !== 'any') {
    searchParams.set('stops', filters.stops)
  }

  if (filters.airlines && filters.airlines.length > 0) {
    searchParams.set('airlines', filters.airlines.join(','))
  }

  if (filters.priceRange && filters.priceRange !== 1000) {
    searchParams.set('price', filters.priceRange.toString())
  }

  if (filters.departureTime && (filters.departureTime[0] !== 0 || filters.departureTime[1] !== 24)) {
    searchParams.set('dt', `${filters.departureTime[0]}-${filters.departureTime[1]}`)
  }

  if (filters.arrivalTime && (filters.arrivalTime[0] !== 0 || filters.arrivalTime[1] !== 24)) {
    searchParams.set('at', `${filters.arrivalTime[0]}-${filters.arrivalTime[1]}`)
  }

  if (filters.duration && (filters.duration[0] !== 0 || filters.duration[1] !== 24)) {
    searchParams.set('dur', `${filters.duration[0]}-${filters.duration[1]}`)
  }

  if (filters.emissions && filters.emissions !== 'any') {
    searchParams.set('em', filters.emissions)
  }

  if (filters.connectingAirports && filters.connectingAirports.length > 0) {
    searchParams.set('ca', filters.connectingAirports.join(','))
  }

  return searchParams
}

/**
 * Decodes filter parameters from URL search params
 */
export function decodeFiltersFromUrl(searchParams: URLSearchParams): Partial<FilterParams> {
  const filters: Partial<FilterParams> = {}

  const stops = searchParams.get('stops') as FilterParams['stops']
  if (stops) filters.stops = stops

  const airlines = searchParams.get('airlines')
  if (airlines) filters.airlines = airlines.split(',')

  const price = searchParams.get('price')
  if (price) filters.priceRange = parseInt(price)

  const departureTime = searchParams.get('dt')
  if (departureTime) {
    const [start, end] = departureTime.split('-').map(Number)
    filters.departureTime = [start, end]
  }

  const arrivalTime = searchParams.get('at')
  if (arrivalTime) {
    const [start, end] = arrivalTime.split('-').map(Number)
    filters.arrivalTime = [start, end]
  }

  const duration = searchParams.get('dur')
  if (duration) {
    const [start, end] = duration.split('-').map(Number)
    filters.duration = [start, end]
  }

  const emissions = searchParams.get('em')
  if (emissions) filters.emissions = emissions

  const connectingAirports = searchParams.get('ca')
  if (connectingAirports) filters.connectingAirports = connectingAirports.split(',')

  return filters
}

/**
 * Creates a shareable URL for the current search state
 */
export function createShareableUrl(
  baseUrl: string,
  searchParams: FlightSearchParams,
  filters?: FilterParams
): string {
  const url = new URL(baseUrl)
  
  // Add search parameters
  const searchUrlParams = encodeFlightSearchToUrl(searchParams)
  searchUrlParams.forEach((value, key) => {
    url.searchParams.set(key, value)
  })

  // Add filter parameters if provided
  if (filters) {
    const filterUrlParams = encodeFiltersToUrl(filters)
    filterUrlParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
  }

  return url.toString()
}

// Helper functions for encoding/decoding specific values

/**
 * Encodes location string to be URL-safe
 * Handles multi-location strings with " • " separator
 */
function encodeLocationString(location: string): string {
  return encodeURIComponent(location.replace(' • ', '~'))
}

/**
 * Decodes location string from URL
 */
function decodeLocationString(encoded: string): string {
  return decodeURIComponent(encoded).replace('~', ' • ')
}

/**
 * Encodes travel class to shorter form for URL
 */
function encodeTravelClass(travelClass: string): string {
  const classMap: { [key: string]: string } = {
    'economy': 'e',
    'premium-economy': 'pe',
    'business': 'b',
    'first': 'f'
  }
  return classMap[travelClass] || travelClass
}

/**
 * Decodes travel class from URL
 */
function decodeTravelClass(encoded: string): string {
  const classMap: { [key: string]: string } = {
    'e': 'economy',
    'pe': 'premium-economy',
    'b': 'business',
    'f': 'first'
  }
  return classMap[encoded] || encoded
}

/**
 * Generates a compact URL-safe search identifier
 * This could be used for even more compact URLs if needed
 */
export function generateSearchId(params: FlightSearchParams): string {
  const key = JSON.stringify({
    tt: params.tripType,
    f: params.from,
    t: params.to,
    dd: params.departureDate?.toISOString().slice(0, 10),
    rd: params.returnDate?.toISOString().slice(0, 10),
    p: params.passengers,
    cl: params.travelClass,
    segs: params.segments?.map(s => ({ f: s.from, t: s.to, d: s.date?.toISOString().slice(0, 10) }))
  })
  
  // Create a hash of the search parameters for compact representation
  return btoa(key).replace(/[+/=]/g, match => {
    return { '+': '-', '/': '_', '=': '' }[match] || match
  }).slice(0, 16)
}
