import { SortConfig } from '@/lib/types/flight-list'

export const SORT_OPTIONS: SortConfig[] = [
    { value: 'top-flights', label: 'Top flights', description: 'Ranked based on price and convenience' },
    { value: 'price', label: 'Price', description: 'Lowest to highest' },
    { value: 'departure-time', label: 'Departure time', description: 'Earliest to latest' },
    { value: 'arrival-time', label: 'Arrival time', description: 'Earliest to latest' },
    { value: 'duration', label: 'Duration', description: 'Shortest to longest' },
    { value: 'emissions', label: 'Emissions', description: 'Lowest to highest' },
]

export const TOP_FLIGHTS_COUNT = 3
export const INITIAL_DISPLAY_COUNT = 20