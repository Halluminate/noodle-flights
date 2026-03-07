"use client"

import { useState } from "react"
import { useFlight, type SelectedFlight } from "@/providers/flight-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FlightCard } from "@/components/ui/flight-card"



export function SelectedFlightsDisplay() {
    const [expandedFlight, setExpandedFlight] = useState<string | null>(null)
    const { selectedDepartingFlight, selectedReturningFlight, clearDepartingFlight, clearReturningFlight } = useFlight()



    const toggleExpanded = (flightId: number, index: number) => {
        const uniqueKey = `${index === 0 ? 'departing' : 'returning'}-${flightId}`
        setExpandedFlight(expandedFlight === uniqueKey ? null : uniqueKey)
    }

    const selectedFlights = [selectedDepartingFlight, selectedReturningFlight].filter(Boolean) as SelectedFlight[]

    if (selectedFlights.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400">
                No flights selected
            </div>
        )
    }

    return (
        <TooltipProvider delayDuration={0}>
        <div className="">
            {selectedFlights.map((flight, index) => (
                <FlightCard
                    key={`${index === 0 ? 'departing' : 'returning'}-${flight.id}`}
                    flight={flight}
                    isExpanded={expandedFlight === `${index === 0 ? 'departing' : 'returning'}-${flight.id}`}
                    onToggleExpanded={() => toggleExpanded(flight.id, index)}
                    onFlightAction={() => {
                        // Clear the specific flight based on index and navigate back to search page
                        if (index === 0) {
                            // This is the departing flight
                            clearDepartingFlight()
                        } else {
                            // This is the returning flight
                            clearReturningFlight()
                        }
                        window.history.back()
                    }}
                    actionButtonText="Change flight"
                    showPrice={false}
                    className={`${expandedFlight === `${index === 0 ? 'departing' : 'returning'}-${flight.id}` ? "my-2 rounded-lg" : index === 0 ? "rounded-t-lg" : index === selectedFlights.length - 1 ? "rounded-b-lg" : ""}`}
                    uniqueKey={`${index === 0 ? 'departing' : 'returning'}-${flight.id}`}
                    expandedHeaderText={`${index === 0 ? "Departure" : "Return"} • ${flight.date}`}
                />
            ))}
        </div>
        </TooltipProvider>
    )
} 
