import { useState } from "react"
import { Flight } from "@/lib/flightGen"
import { LayoverFlight, isLayoverFlight } from "@/lib/layoverGen"
import { SortOption } from "@/lib/types/flight-list"
import { calculateFlightScore, calculateCheapestFlightScore } from "@/lib/utils"

export function useFlightSorting() {
    const [currentSort, setCurrentSort] = useState<SortOption>('top-flights')

    const sortFlights = (flights: (Flight | LayoverFlight)[], sortBy: SortOption) => {
        const sorted = [...flights]
        
        switch (sortBy) {
            case 'top-flights':
                // Calculate scores for all flights
                const flightsWithScores = sorted.map(flight => ({
                    flight,
                    score: calculateFlightScore(flight)
                }))
                
                // Sort by score
                flightsWithScores.sort((a, b) => {
                    if (a.score !== b.score) return a.score - b.score
                    // Tiebreaker: prefer direct flights
                    const aIsLayover = isLayoverFlight(a.flight)
                    const bIsLayover = isLayoverFlight(b.flight)
                    if (aIsLayover !== bIsLayover) return aIsLayover ? 1 : -1
                    // Final tiebreaker
                    return a.flight.flightNumber.localeCompare(b.flight.flightNumber)
                })
                
                return flightsWithScores.map(item => item.flight)
            
            case 'cheapest-flights':
                // Calculate cheapest scores for all flights (price-weighted algorithm)
                const cheapestFlightsWithScores = sorted.map(flight => ({
                    flight,
                    score: calculateCheapestFlightScore(flight)
                }))
                
                // Sort by cheapest score
                cheapestFlightsWithScores.sort((a, b) => {
                    if (a.score !== b.score) return a.score - b.score
                    // Tiebreaker: prefer direct flights
                    const aIsLayover = isLayoverFlight(a.flight)
                    const bIsLayover = isLayoverFlight(b.flight)
                    if (aIsLayover !== bIsLayover) return aIsLayover ? 1 : -1
                    // Final tiebreaker
                    return a.flight.flightNumber.localeCompare(b.flight.flightNumber)
                })
                
                return cheapestFlightsWithScores.map(item => item.flight)
            
            case 'price':
                return sorted.sort((a, b) => a.priceUsd - b.priceUsd)
            
            case 'departure-time':
                return sorted.sort((a, b) => new Date(a.depart).getTime() - new Date(b.depart).getTime())
            
            case 'arrival-time':
                return sorted.sort((a, b) => new Date(a.arrive).getTime() - new Date(b.arrive).getTime())
            
            case 'duration':
                return sorted.sort((a, b) => {
                    const aDuration = isLayoverFlight(a) ? a.totalDurationMin : a.durationMin;
                    const bDuration = isLayoverFlight(b) ? b.totalDurationMin : b.durationMin;
                    return aDuration - bDuration;
                })
            
            case 'emissions':
                return sorted.sort((a, b) => a.emissions - b.emissions)
            
            default:
                return sorted
        }
    }

    return {
        currentSort,
        setCurrentSort,
        sortFlights
    }
}