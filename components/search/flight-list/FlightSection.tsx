import { SelectedFlight } from "@/providers/flight-provider"
import { FlightCard } from "@/components/ui/flight-card"

interface FlightSectionProps {
    title?: string
    flights: SelectedFlight[]
    expandedFlight: number | null
    onToggleExpanded: (id: number) => void
    onFlightSelect: (flight: SelectedFlight) => void
    priceHighlightMap: Map<number, boolean>
    isLastSection?: boolean
    sectionType?: 'top' | 'other'
}

export function FlightSection({ 
    title, 
    flights, 
    expandedFlight, 
    onToggleExpanded, 
    onFlightSelect, 
    priceHighlightMap,
    isLastSection = false,
    sectionType = 'other'
}: FlightSectionProps) {
    if (flights.length === 0) return null

    return (
        <div className={title ? "" : ""}>
            {title && <h3 className="text-lg font-medium text-white mb-4">{title}</h3>}
            <div>
                {flights.map((flight, index) => {
                    const isFirst = index === 0;
                    const isLast = index === flights.length - 1;
                    const isExpanded = expandedFlight === flight.id;
                    const previousCardExpanded = index > 0 && flights[index - 1]?.id && expandedFlight === flights[index - 1]?.id;
                    
                    // Determine border and rounding classes
                    let borderClass = "border-l border-r border-gray-600";
                    let roundingClass = "";
                    
                    if (isExpanded) {
                        // Expanded cards get full border and rounding
                        borderClass = "border border-gray-600";
                        roundingClass = "my-2 rounded-lg";
                    } else {
                        // Collapsed cards
                        if (isFirst) {
                            borderClass += " border-t";
                            roundingClass = "rounded-t-lg";
                        }
                        
                        // Add top border if previous card was expanded
                        if (previousCardExpanded) {
                            borderClass += " border-t";
                        }
                        
                        // Add bottom border logic
                        if (isLast) {
                            // For top section in "top flights" view, always add bottom border with rounded corners
                            if (sectionType === 'top') {
                                borderClass += " border-b";
                                roundingClass += isFirst ? " rounded-lg" : " rounded-b-lg";
                            } 
                            // For other sections or last section, only add bottom border if it's the last section
                            else if (isLastSection) {
                                borderClass += " border-b";
                                roundingClass += isFirst ? " rounded-lg" : " rounded-b-lg";
                            }
                        } else {
                            // Add bottom border for all non-last cards
                            borderClass += " border-b";
                        }
                    }
                    
                    return (
                        <FlightCard
                            key={flight.id}
                            flight={flight}
                            isExpanded={isExpanded}
                            onToggleExpanded={() => onToggleExpanded(flight.id)}
                            onFlightAction={() => onFlightSelect(flight)}
                            actionButtonText="Select flight"
                            showPrice={true}
                            priceHighlighted={priceHighlightMap.get(flight.id) || false}
                            className={`${borderClass} ${roundingClass}`}
                            uniqueKey={`${sectionType}-flight-${flight.id}`}
                        />
                    );
                })}
            </div>
        </div>
    )
}
