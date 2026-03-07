import { ChevronRight } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import Image from "next/image"
import { getAirlineLogo } from "@/lib/utils"
import { FlightSegment, SelectedFlight } from "@/providers/flight-provider"

interface FlightBreadcrumbProps {
    selectedDepartingFlight: SelectedFlight
    tripType: string
    flightSegments: FlightSegment[]
    fromLocation: string
    onChangeDepartingFlight: () => void
}

export function FlightBreadcrumb({ 
    selectedDepartingFlight, 
    tripType, 
    flightSegments, 
    fromLocation, 
    onChangeDepartingFlight 
}: FlightBreadcrumbProps) {
    const [isRouteHovered, setIsRouteHovered] = useState(false)

    return (
        <div className="my-8">
            <div className="flex items-center gap-3 relative group">
                <Image
                    src={getAirlineLogo(selectedDepartingFlight.airlineCode, selectedDepartingFlight.segments)}
                    alt={selectedDepartingFlight.airline}
                    width={24}
                    height={24}
                    className="rounded"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/airline_logos/multi.png'
                    }}
                />
                <div 
                    className="relative"
                    onMouseEnter={() => setIsRouteHovered(true)}
                    onMouseLeave={() => setIsRouteHovered(false)}
                >
                    <AnimatePresence mode="wait">
                        {isRouteHovered ? (
                            <motion.button
                                key="change-button"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                onClick={onChangeDepartingFlight}
                                className="text-[#8ab4f8] hover:text-[#9ac0f9] cursor-pointer"
                            >
                                Change
                            </motion.button>
                        ) : (
                            <motion.span
                                key="route-text"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.2 }}
                                className="text-[#8ab4f8] cursor-pointer"
                            >
                                {selectedDepartingFlight.route}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
                <span className="text-white"><ChevronRight className="w-4 h-4"/></span>
                <span className="text-white">
                    {tripType === "multi-city" 
                        ? `Choose second flight to ${flightSegments[1]?.to || "destination"}`
                        : `Choose return to ${fromLocation}`
                    }
                </span>
                
                {/* Flight Details Popup */}
                <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                    <div className="bg-[#303134] border border-gray-600 rounded-lg p-3 shadow-lg">
                        <div className="text-white text-sm space-y-3">
                            <div className="font-medium">
                                {tripType === "multi-city" 
                                    ? flightSegments[0]?.date ? format(flightSegments[0].date, "EEE, MMM d") : "Flight 1"
                                    : selectedDepartingFlight.date
                                }
                            </div>
                            <div className="text-gray-300">
                                {selectedDepartingFlight.departure}–{selectedDepartingFlight.arrival}
                            </div>
                            <div className="text-gray-400 text-xs">
                                {selectedDepartingFlight.stops} · {selectedDepartingFlight.duration} · {selectedDepartingFlight.airline}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
