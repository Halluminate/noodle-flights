"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, X, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useRef } from "react"
import React from "react"
import { BOOKING_OPTIONS } from "@/lib/constants/filters"
import { useFlight } from "@/providers/flight-provider"
import { format } from "date-fns"

type FareFeatureIcon = "check" | "cross" | "paid"

interface FareFeature {
  text: string
  icon: FareFeatureIcon
}

interface FareOption {
  id: number
  name: string
  priceUsd: string
  features: FareFeature[]
  baggage: FareFeature[]
  buttonVariant: "default" | "outline"
}

// Default fare options for fallback
const defaultFareOptions: FareOption[] = [
  {
    id: 1,
    name: "Basic Economy",
    priceUsd: "$3,180",
    features: [
      { text: "Seat selection for a fee", icon: "paid" },
      { text: "Priority boarding for a fee", icon: "paid" },
      { text: "Ticket changes for a fee", icon: "paid" },
      { text: "No upgrades", icon: "cross" },
    ],
    baggage: [
      { text: "1 free carry-on per passenger", icon: "check" },
      { text: "1st checked bag per passenger free", icon: "check" },
    ],
    buttonVariant: "default" as const,
  },
  {
    id: 2,
    name: "Economy",
    priceUsd: "$3,600",
    features: [
      { text: "Free seat selection", icon: "check" },
      { text: "Priority boarding for a fee", icon: "paid" },
      { text: "Free change, possible fare difference", icon: "check" },
      { text: "Upgrades available", icon: "paid" },
    ],
    baggage: [
      { text: "1 free carry-on per passenger", icon: "check" },
      { text: "2 free checked bags per passenger", icon: "check" },
    ],
    buttonVariant: "outline" as const,
  },
  {
    id: 3,
    name: "Economy Plus",
    priceUsd: "$5,180",
    features: [
      { text: "Free seat selection", icon: "check" },
      { text: "Priority boarding for a fee", icon: "paid" },
      { text: "Free change, possible fare difference", icon: "check" },
      { text: "Upgrades available", icon: "paid" },
    ],
    baggage: [
      { text: "1 free carry-on per passenger", icon: "check" },
      { text: "2 free checked bags per passenger", icon: "check" },
    ],
    buttonVariant: "outline" as const,
  },
  {
    id: 4,
    name: "Economy Fully Refundable",
    priceUsd: "$4,240",
    features: [
      { text: "Free seat selection", icon: "check" },
      { text: "Priority boarding for a fee", icon: "paid" },
      { text: "Free change, possible fare difference", icon: "check" },
      { text: "Upgrades available", icon: "paid" },
    ],
    baggage: [
      { text: "1 free carry-on per passenger", icon: "check" },
      { text: "2 free checked bags per passenger", icon: "check" },
    ],
    buttonVariant: "outline" as const,
  },
]

const renderFeatureIcon = (iconType: string) => {
  switch (iconType) {
    case "check":
      return <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
    case "cross":
      return <X className="w-4 h-4 text-red-400 flex-shrink-0" />
    case "paid":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" focusable="false" className="POWxEf NMm5M" aria-hidden="true" fill="white"><circle cx="10" cy="10" r="3"></circle><path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-4 0H5c0-1.1-.9-2-2-2V8c1.1 0 2-.9 2-2h10c0 1.1.9 2 2 2v4c-1.1 0-2 .9-2 2zm8-7v11c0 1.1-.9 2-2 2H4v-2h17V7h2z"></path></svg>
      )
    default:
      return null
  }
}

interface FareCarouselProps {
  headerPrice?: number | undefined
  onContinue?: () => void
}

const FareCarousel = ({ headerPrice, onContinue }: FareCarouselProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Helper function to extract USD price from price string
  const extractUsdPrice = (priceUsd: string): number => {
    const digitsOnly = priceUsd.replace(/[^0-9]/g, '')
    return digitsOnly ? parseInt(digitsOnly, 10) : 0
  }

  // Generate dynamic fare options based on header price
  let dynamicFareOptions: FareOption[]
  if (typeof headerPrice === 'number') {
    const hp = headerPrice
    dynamicFareOptions = [
      {
        id: 1,
        name: "Basic Economy",
        priceUsd: `$${hp.toLocaleString()}`,
        features: [
          { text: "Seat selection for a fee", icon: "paid" },
          { text: "Priority boarding for a fee", icon: "paid" },
          { text: "Ticket changes for a fee", icon: "paid" },
          { text: "No upgrades", icon: "cross" },
        ],
        baggage: [
          { text: "1 free carry-on per passenger", icon: "check" },
          { text: "1st checked bag per passenger free", icon: "check" },
        ],
        buttonVariant: "default" as const,
      },
      {
        id: 2,
        name: "Economy",
        priceUsd: `$${Math.round(hp * 1.15).toLocaleString()}`,
        features: [
          { text: "Free seat selection", icon: "check" },
          { text: "Priority boarding for a fee", icon: "paid" },
          { text: "Free change, possible fare difference", icon: "check" },
          { text: "Upgrades available", icon: "paid" },
        ],
        baggage: [
          { text: "1 free carry-on per passenger", icon: "check" },
          { text: "2 free checked bags per passenger", icon: "check" },
        ],
        buttonVariant: "outline" as const,
      },
      {
        id: 3,
        name: "Economy Plus",
        priceUsd: `$${Math.round(hp * 1.6).toLocaleString()}`,
        features: [
          { text: "Free seat selection", icon: "check" },
          { text: "Priority boarding for a fee", icon: "paid" },
          { text: "Free change, possible fare difference", icon: "check" },
          { text: "Upgrades available", icon: "paid" },
        ],
        baggage: [
          { text: "1 free carry-on per passenger", icon: "check" },
          { text: "2 free checked bags per passenger", icon: "check" },
        ],
        buttonVariant: "outline" as const,
      },
      {
        id: 4,
        name: "Economy Fully Refundable",
        priceUsd: `$${Math.round(hp * 1.35).toLocaleString()}`,
        features: [
          { text: "Free seat selection", icon: "check" },
          { text: "Priority boarding for a fee", icon: "paid" },
          { text: "Free change, possible fare difference", icon: "check" },
          { text: "Upgrades available", icon: "paid" },
        ],
        baggage: [
          { text: "1 free carry-on per passenger", icon: "check" },
          { text: "2 free checked bags per passenger", icon: "check" },
        ],
        buttonVariant: "outline" as const,
      },
    ]
  } else {
    dynamicFareOptions = defaultFareOptions
  }

  // Find the fare that matches the header price
  const matchingFare = typeof headerPrice === 'number' ? dynamicFareOptions.find((fare) =>
    extractUsdPrice(fare.priceUsd) === headerPrice
  ) : null

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  // Check scroll buttons on mount and scroll events
  React.useEffect(() => {
    checkScrollButtons()
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScrollButtons)
      return () => scrollContainer.removeEventListener('scroll', checkScrollButtons)
    }
  }, [])

  return (
    <div className="bg-[#202124] py-2 pr-6 relative pl-20">
      <Button
        variant="outline"
        size="icon"
        className={`absolute left-13 top-1/2 -translate-y-1/2 z-10 bg-[#2A2B2E] border-none rounded-full h-10 w-10 p-2 ${!canScrollLeft ? 'hidden cursor-not-allowed' : ''
          }`}
        onClick={() => scroll("left")}
        disabled={!canScrollLeft}
      >
        <ChevronLeft className="h-8 w-8" />
      </Button>
      <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar px-2">
        {dynamicFareOptions.map((fare) => (
          <Card key={fare.id} className="bg-transparent border-gray-600 flex-shrink-0 w-[300px]">
            <CardContent className="p-6 flex flex-col h-full">
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-base text-white">{fare.name}</h3>
                <div className={`text-sm font-semibold ${matchingFare && matchingFare.id === fare.id ? 'text-[#81C995]' : 'text-[#E8EAED]'
                  }`}>
                  {fare.priceUsd}
                </div>
              </div>
              <div className="space-y-3 mb-2 border-b border-gray-700 pb-4">
                {fare.features.map((feature, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    {renderFeatureIcon(feature.icon)}
                    <span className="text-sm text-gray-300">{feature.text}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3 mt-4 flex-grow">
                {fare.baggage.map((feature, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    {renderFeatureIcon(feature.icon)}
                    <span className="text-sm text-gray-300">{feature.text}</span>
                  </div>
                ))}
              </div>
              <Button
                variant={fare.buttonVariant}
                className={`w-full mt-6 rounded-full h-[28px] ${fare.buttonVariant === "default"
                  ? "bg-[#8AB4F8] text-[#202124]"
                  : "bg-transparent border-gray-600 text-[#8AB4F8] hover:bg-[#26282D]"
                  }`}
                onClick={onContinue}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-[#2A2B2E] border-none rounded-full h-10 w-10 p-2 ${!canScrollRight ? 'hidden cursor-not-allowed' : ''
          }`}
        onClick={() => scroll("right")}
        disabled={!canScrollRight}
      >
        <ChevronRight className="h-8 w-8" />
      </Button>
      <div className="mt-4 text-xs text-gray-400">
        Fare and baggage conditions apply to your entire trip. Baggage fees may be higher at the airport.{" "}
        <span className="text-[#8AB4F8] underline cursor-pointer">United bag policy</span>
      </div>
    </div>
  )
}

interface UnitedBookingsUIProps {
  headerPrice?: number
}

export default function UnitedBookingsUI({ headerPrice }: UnitedBookingsUIProps) {
  const [expandedOptionId, setExpandedOptionId] = useState<number | null>(null)
  const { 
    tripType, 
    fromLocation, 
    toLocation, 
    departureDate, 
    returnDate, 
    passengers, 
    travelClass,
    flightSegments 
  } = useFlight()

  const handleToggle = (optionId: number) => {
    setExpandedOptionId((prevId) => (prevId === optionId ? null : optionId))
  }

  const handleContinue = (bookingOption: typeof BOOKING_OPTIONS[0]) => {
    // Build URL with flight data parameters
    const url = new URL(bookingOption.url)
    
    // Add trip type
    if (tripType) url.searchParams.set('tripType', tripType)
    
    // For multi-city trips, only add segments and don't use main from/to
    if (tripType === 'multi-city' && flightSegments.length > 0) {
      const segments = flightSegments
        .filter(segment => segment.from && segment.to && segment.date) // Only include segments with all required data
        .map(segment => ({
          from: segment.from,
          to: segment.to,
          date: segment.date ? format(segment.date, 'yyyy-MM-dd') : ''
        }))
      
      if (segments.length > 0) {
        url.searchParams.set('segments', JSON.stringify(segments))
        const firstSeg = segments[0]!
        const lastSeg = segments[segments.length - 1]!
        url.searchParams.set('from', firstSeg.from)
        url.searchParams.set('to', lastSeg.to)
        url.searchParams.set('departureDate', firstSeg.date)
      }
    } else {
      // For non-multi-city trips, use the regular from/to locations
      if (fromLocation) url.searchParams.set('from', fromLocation)
      if (toLocation) url.searchParams.set('to', toLocation)
      if (departureDate) url.searchParams.set('departureDate', format(departureDate, 'yyyy-MM-dd'))
      if (returnDate) url.searchParams.set('returnDate', format(returnDate, 'yyyy-MM-dd'))
    }
    
    if (travelClass) url.searchParams.set('class', travelClass)
    
    // Add passenger information
    url.searchParams.set('adults', passengers.adults.toString())
    url.searchParams.set('children', passengers.children.toString())
    url.searchParams.set('infants', passengers.infants.toString())
    url.searchParams.set('lapInfants', passengers.lapInfants.toString())
    
    // Open in new tab
    window.open(url.toString(), '_blank')
  }

  // Helper function to extract USD price from price string
  const extractUsdPrice = (priceUsd: string): number => {
    const digitsOnly = priceUsd.replace(/[^0-9]/g, '')
    return digitsOnly ? parseInt(digitsOnly, 10) : 0
  }

  // Generate dynamic booking options based on header price
  const dynamicBookingOptions = typeof headerPrice === 'number' ? BOOKING_OPTIONS.map((option, index) => ({
    ...option,
    priceUsd: index === 0 ? `$${headerPrice.toLocaleString()}` : `$${Math.round(headerPrice * (0.9 + index * 0.1)).toLocaleString()}`,
    hasViewOptions: option.hasCarousel
  })) : BOOKING_OPTIONS.map(option => ({
    ...option,
    priceUsd: `$${Math.round(1000 + Math.random() * 2000).toLocaleString()}`,
    hasViewOptions: option.hasCarousel
  }))

  // Find the option that matches the header price
  const matchingOption = typeof headerPrice === 'number' ? dynamicBookingOptions.find(option =>
    option.priceUsd && extractUsdPrice(option.priceUsd) === headerPrice
  ) : null

  return (
    <div className="space-y-0">
      {dynamicBookingOptions.map((option, index) => (
        <div
          key={option.id}
          className={`border border-gray-600 ${index === 0 ? "rounded-t-lg" : ""} ${index === dynamicBookingOptions.length - 1 ? "rounded-b-lg" : ""
            } ${index > 0 && !dynamicBookingOptions[index - 1]?.hasViewOptions ? "border-t-0" : "mt-[-1px]"}
          ${expandedOptionId === option.id ? "rounded-b-none" : ""}`}
        >
                     <div className="p-4 flex items-center justify-between bg-transparent">
             <div className="flex items-center gap-4">
               <div>
                 <span className="text-white font-medium">{option.name}</span>
               </div>
             </div>

            <div className="flex items-center gap-4">
              {expandedOptionId !== option.id && (
                <div className="text-right flex items-center gap-4">
                  {
                    option.hasViewOptions && (
                    <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">Local price subject to regulations
                    </p>
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>
                  )
                  }
                  <div className={`text-lg font-medium ${matchingOption != null && matchingOption.id === option.id ? 'text-[#81C995]' : 'text-[#E8EAED]'
                    }`}>
                    {option.priceUsd}
                  </div>
                </div>
              )}
              {option.hasViewOptions ? (
                <Button
                  variant="outline"
                  className="bg-transparent border-gray-600 text-[#8AB4F8] hover:bg-[#26282D] w-[150px] rounded-full h-[28px]"
                  onClick={() => handleToggle(option.id)}
                >
                  {expandedOptionId === option.id ? "Hide options" : "View options"}
                  {expandedOptionId === option.id ? (
                    <ChevronUp className="w-4 h-4 ml-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-2" />
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="bg-transparent border-gray-600 text-[#8AB4F8] hover:bg-[#26282D] w-[150px] rounded-full h-[28px]"
                  onClick={() => handleContinue(option)}
                >
                  Continue
                </Button>
              )}
            </div>
          </div>
          {expandedOptionId === option.id && option.hasCarousel && (
            <FareCarousel 
              onContinue={() => handleContinue(option)}
              {...(headerPrice !== undefined ? { headerPrice } : {})}
            />
          )}
        </div>
      ))}
    </div>
  )
} 
