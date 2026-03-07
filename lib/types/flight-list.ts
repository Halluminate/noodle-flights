export type SortOption = 'top-flights' | 'cheapest-flights' | 'price' | 'departure-time' | 'arrival-time' | 'duration' | 'emissions'

export interface SortConfig {
    value: SortOption
    label: string
    description: string
}