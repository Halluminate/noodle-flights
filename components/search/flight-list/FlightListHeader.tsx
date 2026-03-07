import { Check, Info } from "lucide-react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SortOption } from "@/lib/types/flight-list"
import { SORT_OPTIONS } from "@/lib/constants/flight-list"
import { AirlineInfoDialog } from "../airline-info-dialog"
import { SelectedFlight } from "@/providers/flight-provider"

interface FlightListHeaderProps {
    currentHeader: string
    currentSort: SortOption
    onSortChange: (sort: SortOption) => void
    flights?: SelectedFlight[]
}

export function FlightListHeader({ currentHeader, currentSort, onSortChange, flights = [] }: FlightListHeaderProps) {
    const [sortPopoverOpen, setSortPopoverOpen] = useState(false)
    const [baggageFeesOpen, setBaggageFeesOpen] = useState(false)
    const [passengerAssistanceOpen, setPassengerAssistanceOpen] = useState(false)
    const currentSortConfig = SORT_OPTIONS.find(option => option.value === currentSort)!

    return (
        <div className="">
            <h2 className="text-xl font-semibold">{currentHeader}</h2>
            <div className="flex flex-col text-sm text-gray-400">
                <div className="flex justify-between items-center">
                    <div className="flex gap-1 items-center text-xs">
                        <span>Ranked based on price and convenience</span>
                        <Info className="w-4 h-4" />
                        <span>Prices include required taxes + fees for 1 adult. Optional charges and</span>
                        <span 
                            className="underline cursor-pointer hover:text-[#AECBFA]" 
                            onClick={() => setBaggageFeesOpen(true)}
                        >
                            bag fees
                        </span>
                        <span>may apply.</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-sm">
                        <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
                            <PopoverTrigger asChild>
                                <button className="px-3 py-2 rounded-md flex items-center gap-1 text-[#8ab4f8] hover:text-[#9ac0f9] hover:bg-[#26282D] transition-colors">
                                    <span>Sorted by {currentSortConfig.label.toLowerCase()}</span>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M8 9l4-4 4 4" />
                                        <path d="M16 15l-4 4-4-4" />
                                    </svg>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent 
                                className="w-48 p-0 bg-[#303134] border-0 shadow-lg"
                                align="end"
                                side="bottom"
                                sideOffset={8}
                            >
                                <div className="py-1">
                                    {SORT_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                onSortChange(option.value)
                                                setSortPopoverOpen(false)
                                            }}
                                            className="w-full px-4 py-4 text-left hover:bg-[#37383B] transition-colors flex items-center gap-3"
                                        >
                                            {currentSort === option.value ? (
                                                <Check className="w-6 h-6 text-white mr-4" />
                                            ) : (
                                                <div className="w-6 h-6 mr-4" />
                                            )}
                                            <span className="text-base text-white">
                                                {option.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="text-xs text-gray-400">
                    <div>
                        <span 
                            className="underline cursor-pointer hover:text-[#AECBFA]" 
                            onClick={() => setPassengerAssistanceOpen(true)}
                        >
                            Passenger assistance
                        </span>
                        <span> info.</span>
                    </div>
                </div>
            </div>
            
            {/* Baggage Fees Dialog */}
            <AirlineInfoDialog
                isOpen={baggageFeesOpen}
                onClose={() => setBaggageFeesOpen(false)}
                flights={flights}
                title="Baggage fees"
            />
            
            {/* Passenger Assistance Dialog */}
            <AirlineInfoDialog
                isOpen={passengerAssistanceOpen}
                onClose={() => setPassengerAssistanceOpen(false)}
                flights={flights}
                title="Passenger assistance"
            />
        </div>
    )
}
