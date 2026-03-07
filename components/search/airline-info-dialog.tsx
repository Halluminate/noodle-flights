"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog"
import { getAirlineLogo } from "@/lib/utils"
import { SelectedFlight } from "@/providers/flight-provider"

interface AirlineInfoDialogProps {
    isOpen: boolean
    onClose: () => void
    flights: SelectedFlight[]
    title?: string
}

interface AirlineInfo {
    code: string
    name: string
    logo: string
}

export function AirlineInfoDialog({ isOpen, onClose, flights, title = "Baggage fees" }: AirlineInfoDialogProps) {
    const [airlines, setAirlines] = useState<AirlineInfo[]>([])

    // Extract unique airlines from flights data
    useEffect(() => {
        if (flights && flights.length > 0) {
            const uniqueAirlines = new Map<string, AirlineInfo>()
            
            flights.forEach(flight => {
                const airlineCode = flight.airlineCode
                if (!uniqueAirlines.has(airlineCode)) {
                    uniqueAirlines.set(airlineCode, {
                        code: airlineCode,
                        name: flight.airline,
                        logo: getAirlineLogo(airlineCode, flight.segments)
                    })
                }
            })
            
            // Convert to array and sort by airline name
            const airlinesArray = Array.from(uniqueAirlines.values())
                .sort((a, b) => a.name.localeCompare(b.name))
            
            setAirlines(airlinesArray)
        }
    }, [flights])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogOverlay className="bg-black/80" />
            <DialogContent className="bg-[#303134] border-0 text-white max-w-sm">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle className="text-lg font-medium text-white">
                        {title}
                    </DialogTitle>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </DialogHeader>
                
                <div className="space-y-4 max-h-[95vh] overflow-y-auto">
                    {airlines.map((airline) => (
                        <div
                            key={airline.code}
                            className="flex items-center gap-8 rounded-lg"
                        >
                            <div className="flex items-center gap-8">
                                <Image
                                    src={airline.logo}
                                    alt={airline.name}
                                    width={32}
                                    height={32}
                                    className="rounded"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = '/airline_logos/multi.png'
                                    }}
                                />
                                <span className="text-white font-medium">
                                    {airline.name}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
} 
