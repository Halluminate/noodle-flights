"use client"

import { Plane, Usb, Video } from "lucide-react"
import Image from "next/image"
import { getAirlineLogo } from "@/lib/utils"
import { formatFlightTimeTooltip } from "@/lib/formatters"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { 
    Accordion, 
    AccordionContent, 
    AccordionItem 
} from "@/components/ui/accordion"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import { type SelectedFlight } from "@/providers/flight-provider"
import { useState, useEffect } from "react"

// Helper function to get airport name by code
async function getAirportName(code: string): Promise<string> {
    try {
        const response = await fetch(`/api/airports?q=${code}&limit=1`);
        if (!response.ok) throw new Error('Failed to fetch airport');
        const data = await response.json();
        const airport = data.results?.[0];
        if (airport && airport.iata?.toLowerCase() === code.toLowerCase()) {
            return `${airport.name} (${airport.iata})`;
        }
        return code; // Fallback to just the code
    } catch {
        return code; // Fallback to just the code
    }
}

interface FlightSegment {
    departure: string
    arrival: string
    departureIso: string | undefined
    arrivalIso: string | undefined
    departureAirport: string
    arrivalAirport: string
    duration: string
    aircraft: string
    flightNumber: string
    airline: string
    airlineName?: string
}

interface FlightCardProps {
    flight: SelectedFlight
    isExpanded: boolean
    onToggleExpanded: () => void
    onFlightAction?: () => void
    actionButtonText?: string
    showPrice?: boolean
    priceHighlighted?: boolean
    className?: string
    uniqueKey: string
    expandedHeaderText?: string
}

export function FlightCard({
    flight,
    isExpanded,
    onToggleExpanded,
    onFlightAction,
    actionButtonText = "Select flight",
    showPrice = true,
    priceHighlighted = false,
    className = "",
    uniqueKey,
    expandedHeaderText
}: FlightCardProps) {
    
    const [airportNames, setAirportNames] = useState<Record<string, string>>({});
    
    // Helper function to generate segments for flights without explicit segment data
    const getFlightSegments = (flight: SelectedFlight): FlightSegment[] => {
        // If flight has explicit segments, use them and ensure ISO fields are properly handled
        if (flight.segments) {
            return flight.segments.map(segment => ({
                ...segment,
                departureIso: segment.departureIso || undefined,
                arrivalIso: segment.arrivalIso || undefined
            }))
        }

        // Generate basic structure from main flight data
        return [{
            departure: flight.departure,
            arrival: flight.arrival,
            departureIso: flight.departureIso || undefined,
            arrivalIso: flight.arrivalIso || undefined,
            departureAirport: flight.departureAirport,
            arrivalAirport: flight.arrivalAirport,
            duration: flight.duration,
            aircraft: flight.aircraft,
            flightNumber: flight.flightNumber,
            airline: flight.airlineCode,
            airlineName: flight.airline
        }]
    }
    
    // Fetch airport names when component mounts or flight changes
    useEffect(() => {
        const fetchAirportNames = async () => {
            const segments = getFlightSegments(flight);
            const codes = new Set<string>();
            
            segments.forEach(segment => {
                codes.add(segment.departureAirport);
                codes.add(segment.arrivalAirport);
            });
            
            const namePromises = Array.from(codes).map(async code => {
                const name = await getAirportName(code);
                return [code, name] as const;
            });
            
            const results = await Promise.all(namePromises);
            const nameMap = Object.fromEntries(results);
            setAirportNames(nameMap);
        };
        
        if (isExpanded) {
            fetchAirportNames();
        }
    }, [isExpanded, flight]);

    return (
        <Accordion 
            type="single" 
            collapsible
            value={isExpanded ? uniqueKey : ""}
            onValueChange={(value) => {
                // Only call toggle if the value is changing
                if ((value === uniqueKey) !== isExpanded) {
                    onToggleExpanded()
                }
            }}
            className={`bg-transparent overflow-hidden ${className}`}
        >
            <AccordionItem 
                value={uniqueKey}
                className="border-none"
            >
                <AccordionPrimitive.Header className="flex">
                    {/* Main content area - NOT a button */}
                    <div className="flex items-center justify-between p-4 flex-1">
                        <div 
                            className={`flex items-center gap-4 flex-1 min-w-0 ${onFlightAction ? 'cursor-pointer' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation()
                                if (onFlightAction) {
                                    onFlightAction()
                                }
                            }}
                        >
                            {/* Left: Logo + Title/Flight Info */}
                            <Image
                                src={getAirlineLogo(flight.airlineCode, flight.segments)}
                                alt={flight.airline}
                                width={40}
                                height={40}
                                className="rounded flex-shrink-0 ml-2 mr-4"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = '/airline_logos/multi.png';
                                }}
                            />
                            <div className="min-w-0 flex-1">
                                {isExpanded ? (
                                    <div className="text-lg font-medium">{expandedHeaderText || `Departure • ${flight.date}`}</div>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="text-base font-medium">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className={onFlightAction ? "cursor-pointer" : "cursor-default"}>{flight.departure}</span>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-gray-800 text-white border-none px-5 py-3 text-sm font-normal shadow-lg">
                                                    <p suppressHydrationWarning>{flight.departureIso && formatFlightTimeTooltip(flight.departureIso, flight.departureAirport)}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            {' – '}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className={onFlightAction ? "cursor-pointer" : "cursor-default"}>{flight.arrival}</span>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-gray-800 text-white border-none px-5 py-3 text-sm font-normal shadow-lg">
                                                    <p suppressHydrationWarning>{flight.arrivalIso && formatFlightTimeTooltip(flight.arrivalIso, flight.arrivalAirport)}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div className="text-xs text-gray-400">{flight.airline}</div>
                                    </div>
                                )}
                            </div>

                                                    {/* Center: Flight Details - shown differently when collapsed vs expanded */}
                        <div className="flex gap-4">
                            {!isExpanded ? (
                                <>
                                    {/* Duration and Route */}
                                    <div className="text-start min-w-[100px]">
                                        <div className="font-medium">{flight.duration}</div>
                                        <div className="text-xs text-gray-400">{flight.route}</div>
                                    </div>

                                    {/* Stops */}
                                    <div className="text-start min-w-[100px]">
                                        <div className="font-medium">{flight.stops}</div>
                                        <div className="text-xs text-gray-400">{flight.stopDetails}</div>
                                    </div>

                                    {/* Emissions */}
                                    <div className="text-start min-w-[120px]">
                                        <div className="font-medium">{flight.emissions}</div>
                                        <div className="text-xs text-gray-400">
                                            {flight.emissionChange.includes('-') && flight.emissionChange.includes('%') ? (
                                                <span className="text-xs text-[#81C995] bg-[#3A4F42] p-1 rounded-sm">{flight.emissionChange}</span>
                                            ) : (
                                                <span>{flight.emissionChange}</span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Emissions (when expanded) */}
                                    <div className="text-start min-w-[120px]">
                                        <div className="font-medium">{flight.emissions}</div>
                                        <div className="text-xs text-gray-400">
                                            {flight.emissionChange.includes('-') && flight.emissionChange.includes('%') ? (
                                                <span className="text-xs text-[#81C995] bg-[#3A4F42] p-1 rounded-sm">{flight.emissionChange}</span>
                                            ) : (
                                                <span>{flight.emissionChange}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Select Flight Button (when expanded) */}
                                    {onFlightAction && (
                                        <div className="flex items-center">
                                            <Button 
                                                variant="google-blue-outline"
                                                size="rounded-full-sm"
                                                className="font-normal"
                                                onClick={onFlightAction}
                                            >
                                                {actionButtonText}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        </div>

                        {/* Right: Price (always visible) */}
                        <div 
                            className={`flex items-center gap-4 flex-shrink-0 ${onFlightAction ? 'cursor-pointer' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation()
                                if (onFlightAction) {
                                    onFlightAction()
                                }
                            }}
                        >
                            {showPrice && (
                                <div className="text-right min-w-[100px]">
                                    <div className={`font-medium text-lg ${priceHighlighted ? 'text-[#81C995]' : 'text-[#E8EAED]'}`}>{flight.price}</div>
                                    <div className="text-xs text-gray-400">{flight.priceLabel}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Separate chevron button - ONLY this triggers accordion */}
                    <AccordionPrimitive.Trigger className="w-10 h-10 flex items-center justify-center hover:bg-gray-700/50 rounded-full transition-colors duration-200 mr-5 my-auto flex-shrink-0">
                        <ChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-200 text-white ${isExpanded ? 'rotate-180' : ''}`} />
                    </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>

                <AccordionContent className="border-t border-gray-600 pb-0">
                    {/* Flight Details - Dynamic Segment Rendering */}
                    <div className="py-6">
                        <div className="w-full">
                            {getFlightSegments(flight).map((segment, segmentIndex) => (
                                <div key={segmentIndex}>
                                    {/* Flight Segment Group */}
                                    <div className="flex gap-8 px-6">
                                        {/* Airline Logo Column - Only show for flights with layovers */}
                                        {getFlightSegments(flight).length > 1 && (
                                            <div className="w-10 flex items-center pb-8">
                                                <Image
                                                    src={getAirlineLogo(segment.airline)}
                                                    alt={segment.airlineName || segment.airline}
                                                    width={32}
                                                    height={32}
                                                    className="rounded"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).src = '/airline_logos/multi.png';
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Flight Segment Details */}
                                        <div className="flex-1 text-lg">
                                            {/* Departure */}
                                            <div className="flex items-center gap-4">
                                                <div className="w-3 h-3 border-2 border-gray-600 rounded-full bg-transparent flex-shrink-0"></div>
                                                <div className="font-medium">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span>{segment.departure}</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-gray-800 text-white border-none px-5 py-3 text-sm font-normal shadow-lg">
                                                            <p suppressHydrationWarning>{segment.departureIso && formatFlightTimeTooltip(segment.departureIso, segment.departureAirport)}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    {' • '}{airportNames[segment.departureAirport] || segment.departureAirport}
                                                </div>
                                            </div>

                                            {/* Dotted line with travel time */}
                                            <div className="flex items-center gap-4 my-1">
                                                <div className="w-3 flex justify-center">
                                                    <div className="w-1 h-8 border-l-4 border-dotted border-gray-600"></div>
                                                </div>
                                                <div className="text-sm text-gray-400">
                                                    Travel time: {segment.duration}
                                                </div>
                                            </div>

                                            {/* Arrival */}
                                            <div className="flex items-center gap-4">
                                                <div className="w-3 h-3 border-2 border-gray-600 rounded-full bg-transparent flex-shrink-0"></div>
                                                <div className="font-medium">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span>{segment.arrival}</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-gray-800 text-white border-none px-5 py-3 text-sm font-normal shadow-lg">
                                                            <p suppressHydrationWarning>{segment.arrivalIso && formatFlightTimeTooltip(segment.arrivalIso, segment.arrivalAirport)}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    {' • '}{airportNames[segment.arrivalAirport] || segment.arrivalAirport}
                                                </div>
                                            </div>

                                            {/* Flight Details for this segment */}
                                            <div className="text-xs text-gray-400 mt-6 ml-6">
                                                {segment.airlineName || segment.airline} • {flight.class.replace(/\b\w/g, l => l.toUpperCase())} • {segment.aircraft} • {segment.flightNumber}
                                            </div>
                                        </div>

                                        {/* Flight Amenities */}
                                        <div className="w-64 space-y-3 text-sm">
                                            <div className="flex items-center gap-3">
                                                <Plane className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-300">Above-average legroom</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Usb className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-300">In-seat USB outlet</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Video className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-300">Stream media to your device</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Layover Section - Only show if not the last segment */}
                                    {segmentIndex < getFlightSegments(flight).length - 1 && (
                                        <div className="my-6 ml-12 border-t border-b border-gray-600 py-4">
                                            {flight.stopDetails ? (
                                                    <>
                                                        {flight.stopDetails.replace(/\s+([A-Z]{3})$/, '')} layover • {airportNames[segment.arrivalAirport] || segment.arrivalAirport}
                                                    </>
                                                ) : (
                                                    `layover • ${airportNames[segment.arrivalAirport] || segment.arrivalAirport}`
                                                )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}
