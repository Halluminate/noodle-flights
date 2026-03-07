"use client"

import { useFlight } from "@/providers/flight-provider"
import { SelectedFlightsDisplay } from "@/components/booking/selected-flights-display"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Share2, User, ChevronDown, Minus, Plus, ArrowLeftRight, ArrowRight, Info, Luggage, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import type { PassengerCounts } from "@/providers/flight-provider"
import BookingsUI from "@/components/booking/bookings-ui"
import { usePopoverWithTempState } from "@/hooks/use-popover-state"

export default function BookingPage() {
    const router = useRouter()
    const {
        selectedDepartingFlight,
        selectedReturningFlight,
        tripType,
        fromLocation,
        toLocation,
        passengers,
        setPassengers,
        travelClass,
        flightSegments
    } = useFlight()

    // Passenger dropdown state using custom hook
    const passengerPopover = usePopoverWithTempState(
        passengers,
        setPassengers
    )

    // Track prices toggle state
    const [trackPrices, setTrackPrices] = useState(false)

    const totalPassengersDisplay = passengerPopover.isOpen
        ? passengerPopover.tempValue.adults +
        passengerPopover.tempValue.children +
        passengerPopover.tempValue.infants +
        passengerPopover.tempValue.lapInfants
        : passengers.adults + passengers.children + passengers.infants + passengers.lapInfants

    const updatePassengerCount = (
        type: keyof PassengerCounts,
        increment: boolean
    ) => {
        passengerPopover.setTempValue((prev) => ({
            ...prev,
            [type]: increment
                ? prev[type] + 1
                : Math.max(type === "adults" ? 1 : 0, prev[type] - 1),
        }))
    }

    // Redirect to home if no flight data is available
    useEffect(() => {
        const hasNoFlightData = !selectedDepartingFlight && !selectedReturningFlight
        
        // For multi-city, check if we have flight segments with locations
        // For other trip types, check fromLocation and toLocation
        const hasNoLocations = tripType === "multi-city" 
            ? flightSegments.length === 0 || flightSegments.some(segment => !segment.from || !segment.to)
            : !fromLocation || !toLocation

        if (hasNoFlightData || hasNoLocations) {
            router.push('/')
        }
    }, [selectedDepartingFlight, selectedReturningFlight, fromLocation, toLocation, flightSegments, tripType, router])

    // Show loading while checking redirect conditions
    const hasNoFlightData = !selectedDepartingFlight && !selectedReturningFlight
    const hasNoLocations = tripType === "multi-city" 
        ? flightSegments.length === 0 || flightSegments.some(segment => !segment.from || !segment.to)
        : !fromLocation || !toLocation

    if (hasNoFlightData || hasNoLocations) {
        return (
            <div className="min-h-screen bg-[#202124] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                </div>
            </div>
        )
    }

    const totalPrice = selectedDepartingFlight && selectedReturningFlight
        ? selectedDepartingFlight.priceUsd + selectedReturningFlight.priceUsd
        : selectedDepartingFlight ? selectedDepartingFlight.priceUsd : 0

    const totalPassengers = passengers.adults + passengers.children + passengers.infants + passengers.lapInfants



    return (
        <div className="min-h-screen bg-[#202124] text-white">
            <div className="max-w-5xl mx-auto p-6">
                {/* Header section with route and price */}
                <div className="flex justify-between mb-8 items-center">
                    <div className="flex-1">
                        {tripType === "multi-city" ? (
                            <div>
                                <h1 className="text-3xl font-medium">Multi-city trip</h1>
                                
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-medium">{fromLocation}</h1>
                                <span className="text-2xl text-gray-300">
                                    {tripType === "one-way" ? (
                                        <ArrowRight className="w-5 h-5" />
                                    ) : (
                                        <ArrowLeftRight className="w-5 h-5" />
                                    )}
                                </span>
                                <h1 className="text-3xl font-medium">{toLocation}</h1>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-300">
                            <span className="capitalize">{tripType.replace('-', ' ')}</span>
                            <span>•</span>
                            <span className="capitalize">{travelClass}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                                {/* Passenger Dropdown */}
                                <Popover
                                    open={passengerPopover.isOpen}
                                    onOpenChange={passengerPopover.setIsOpen}
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="google-navbar"
                                            className={`px-0 ${passengerPopover.isOpen
                                                ? "bg-[#4D5767] hover:bg-[#4D5767] border-b-2 border-b-[#8AACE5]"
                                                : ""
                                                }`}
                                        >
                                            <User className="h-4 w-4" />
                                            {totalPassengersDisplay} Passengers
                                            <motion.div
                                                animate={{ rotate: passengerPopover.isOpen ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <ChevronDown className="size-4" />
                                            </motion.div>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        align="start"
                                        className="w-80 bg-[#303134] border-0 text-[#C2C6CA]"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-white">Adults</Label>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updatePassengerCount("adults", false)}
                                                        disabled={passengerPopover.tempValue.adults <= 1}
                                                        className="h-8 w-8 p-0 bg-[#4B4C50] border-0"
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center">
                                                        {passengerPopover.tempValue.adults}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updatePassengerCount("adults", true)}
                                                        className="h-8 w-8 p-0 bg-[#3E495E] border-0"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-white">Children</Label>
                                                    <p className="text-sm text-slate-400">Aged 2–11</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updatePassengerCount("children", false)}
                                                        disabled={passengerPopover.tempValue.children <= 0}
                                                        className="h-8 w-8 p-0 bg-[#4B4C50] border-0"
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center">
                                                        {passengerPopover.tempValue.children}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updatePassengerCount("children", true)}
                                                        className="h-8 w-8 p-0 bg-[#3E495E] border-0"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-white">Infants</Label>
                                                    <p className="text-sm text-slate-400">In seat</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updatePassengerCount("infants", false)}
                                                        disabled={passengerPopover.tempValue.infants <= 0}
                                                        className="h-8 w-8 p-0 bg-[#4B4C50] border-0"
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center">
                                                        {passengerPopover.tempValue.infants}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updatePassengerCount("infants", true)}
                                                        className="h-8 w-8 p-0 bg-[#3E495E] border-0"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-white">Infants</Label>
                                                    <p className="text-sm text-slate-400">On lap</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updatePassengerCount("lapInfants", false)}
                                                        disabled={passengerPopover.tempValue.lapInfants <= 0}
                                                        className="h-8 w-8 p-0 bg-[#4B4C50] border-0"
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center">
                                                        {passengerPopover.tempValue.lapInfants}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updatePassengerCount("lapInfants", true)}
                                                        className="h-8 w-8 p-0 bg-[#3E495E] border-0"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={passengerPopover.cancel}
                                                    className="flex-1 text-[#8AB4F8] hover:bg-transparent hover:text-[#8AB4F8]"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={passengerPopover.confirm}
                                                    className="flex-1 text-[#8AB4F8] hover:bg-transparent hover:text-[#8AB4F8]"
                                                >
                                                    Done
                                                </Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <Button variant="outline" size="sm" className="h-[22px] bg-transparent border-gray-600 hover:bg-gray-800 text-[rgba(143,203,250,1)] rounded-full py-0">
                            <Share2 className="w-3 h-3 mr-2" />
                            Share
                        </Button>
                        <div className="text-right">
                            <div className="text-4xl font-normal text-[#E8EAED]">${totalPrice.toLocaleString()}</div>
                            <div className="text-gray-400 text-sm mt-1">Lowest total price
                            </div>
                        </div>
                    </div>
                </div>

                {/* Selected flights section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-medium">Selected flights</h2>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 text-[#8AB4F8]">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm">Track prices</span>
                            </div>
                            <Info className="w-4 h-4 text-gray-400" />
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setTrackPrices(!trackPrices)}
                                    className="flex items-center cursor-pointer"
                                >
                                    <div className="relative">
                                        <div className={`w-10 h-6 rounded-full shadow-inner transition-colors ${trackPrices ? 'bg-[#8AB4F8]' : 'bg-gray-600'}`}></div>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${trackPrices ? 'translate-x-5 bg-white' : 'left-1 bg-gray-300'}`}></div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                    <SelectedFlightsDisplay />
                </div>

                {/* Baggage allowance section */}
                <div className="mb-6">
                    <div className="rounded-lg p-4 px-5 mb-2 border border-gray-600">
                        <div className="flex items-center gap-10">
                            <div className="flex items-center gap-2">
                                <Luggage className="w-5 h-5 text-white" />
                                <span className="text-white text-sm">1 free carry-on per passenger</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Luggage className="w-5 h-5 text-white" />
                                <span className="text-white text-sm">1st checked bag per passenger available for a fee</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-gray-400 text-xs">
                            Baggage conditions apply to your entire trip. Baggage fees may be higher at the airport.
                        </div>
                </div>

                {/* Booking options section */}
                <div className="mb-6">
                    <div className="mb-2">
                        <h2 className="text-lg font-medium">Booking options</h2>
                        <div className="flex items-center gap-2 text-gray-400 text-xs">
                            <span>How options are ranked</span>
                            <Info className="w-4 h-4" />
                        </div>
                    </div>

                    {/* United Bookings UI */}
                    <BookingsUI headerPrice={totalPrice} />

                    {/* Footer Note */}
                    <div className="mt-6 text-gray-400 text-sm text-right">
                        Prices include required taxes + fees for {totalPassengers} passengers. Optional charges and bag fees may apply.
                    </div>
                </div>
            </div>
        </div>
    )
}

