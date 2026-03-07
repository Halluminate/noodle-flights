"use client"

import { Button } from "@/components/ui/button"
import { PopoverClose } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { GoogleToggle } from "@/components/ui/google-toggle"
import { X } from "lucide-react"
import { useFilters } from "../../../providers/flight-filters-context"
import { useState } from "react"
import { CONNECTING_AIRPORTS } from "@/lib/constants/filters"

export function ConnectingAirportsFilter() {
  const { filters, setFilter, resetFilter } = useFilters()
  const [isDraggingStopover, setIsDraggingStopover] = useState(false)
  
  // Check if all airports are currently selected
  const allAirportsEnabled = filters.connectingAirports?.length === CONNECTING_AIRPORTS.length
  
  // Check if stopover duration is in "Any" state (full range)
  const isStopoverAny = filters.stopoverDuration[0] === 1 && filters.stopoverDuration[1] === 24
  
  const handleStopoverChange = (value: number[]) => {
    // Simply set the value - let minStepsBetweenThumbs handle the crossing prevention
    setFilter('stopoverDuration', value as [number, number])
  }

  const handleStopoverDragStart = () => {
    setIsDraggingStopover(true)
  }

  const handleStopoverDragEnd = () => {
    setIsDraggingStopover(false)
  }

  const handleAllAirportsToggle = (enabled: boolean) => {
    if (enabled) {
      // Select all airports
      setFilter('connectingAirports', CONNECTING_AIRPORTS.map(airport => airport.code))
    } else {
      // Deselect all airports
      setFilter('connectingAirports', [])
    }
  }

  const handleAirportToggle = (airportCode: string) => {
    const currentAirports = filters.connectingAirports || []
    const isSelected = currentAirports.includes(airportCode)
    
    if (isSelected) {
      const newAirports = currentAirports.filter(code => code !== airportCode)
      setFilter('connectingAirports', newAirports)
    } else {
      // If the current selection is all defaults, clear defaults and only select this airport
      if (allAirportsEnabled) {
        setFilter('connectingAirports', [airportCode])
      } else {
        // Otherwise, add to the current selection
        const newAirports = [...currentAirports, airportCode]
        setFilter('connectingAirports', newAirports)
      }
    }
  }

  const handleOnlyAirport = (airportCode: string) => {
    // Select only this airport and deselect all others
    setFilter('connectingAirports', [airportCode])
  }

  const handleClear = () => {
    resetFilter('connectingAirports')
    resetFilter('stopoverDuration')
  }

  const formatStopoverText = (range: [number, number]) => {
    const [min, max] = range
    const isMinAny = min === 1
    const isMaxAny = max === 24
    
    // If both are at "Any" position
    if (isMinAny && isMaxAny) {
      return "Any"
    }
    
    const formatHours = (hours: number) => {
      if (hours === 1) return "1 hr"
      if (hours % 1 === 0) return `${hours} hr`
      const wholeHours = Math.floor(hours)
      const minutes = Math.round((hours - wholeHours) * 60)
      return `${wholeHours} hr ${minutes} min`
    }
    
    // If min is set but max is at "Any"
    if (!isMinAny && isMaxAny) {
      return `Min ${formatHours(min)}`
    }
    
    // If max is set but min is at "Any"
    if (isMinAny && !isMaxAny) {
      return `Max ${formatHours(max)}`
    }
    
    // If both min and max are set (not at "Any")
    return `${formatHours(min)}-${formatHours(max)}`
  }

  const formatHours = (hours: number) => {
    if (hours === 1) return "1 hr"
    if (hours % 1 === 0) return `${hours} hr`
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours} hr ${minutes} min`
  }

  return (
    <div className="w-[360px] bg-[#303134] text-white rounded-lg border-0">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-0">
        <h3 className="text-base font-medium">Connecting airports</h3>
        <PopoverClose asChild>
          <button className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </PopoverClose>
      </div>

      <div className="p-6 pt-6">
        {/* Stopover Duration */}
        <div className="mb-6">
          <h4 className="text-white text-base mb-2">Stopover duration</h4>
          <div className="flex items-center justify-between mb-8">
            <p className="text-[#83AAEA] text-xs">
              {formatStopoverText(filters.stopoverDuration)}
            </p>
            {!isStopoverAny && (
              <button
                onClick={() => resetFilter('stopoverDuration')}
                className="text-[#83AAEA] hover:text-[#AECBFA] text-xs transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="px-2 relative">
            <div className="relative">
              <Slider
                value={filters.stopoverDuration}
                onValueChange={handleStopoverChange}
                onValueCommit={handleStopoverDragEnd}
                onPointerDown={handleStopoverDragStart}
                onPointerUp={handleStopoverDragEnd}
                max={24}
                min={1}
                step={1}
                minStepsBetweenThumbs={1}
                className="w-full [&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]>.bg-secondary]:bg-[#5f6368] [&_[data-orientation=horizontal]_.bg-primary]:bg-[#9DC0F9] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-[#9DC0F9] [&_[role=slider]]:ring-0 [&_[role=slider]]:focus-visible:ring-0 [&_[role=slider]]:focus-visible:ring-offset-0"
              />
              {/* Stopover duration tooltips above slider thumbs - only show when dragging */}
              {isDraggingStopover && (
                <>
                  {/* Min duration tooltip */}
                  <div
                    className="absolute -top-10 bg-[#AECBFA] text-[#202124] px-3 py-1.5 rounded-full text-xs font-medium w-fit text-center whitespace-nowrap"
                    style={{
                      left: `calc(${((filters.stopoverDuration[0] - 1) / (24 - 1)) * 100}% - ${((filters.stopoverDuration[0] - 1) / (24 - 1)) * 20}px + 10px)`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {isStopoverAny ? "Any" : formatHours(filters.stopoverDuration[0])}
                  </div>
                  {/* Max duration tooltip */}
                  <div
                    className="absolute -top-10 bg-[#AECBFA] text-[#202124] px-3 py-1.5 rounded-full text-xs font-medium w-fit text-center whitespace-nowrap"
                    style={{
                      left: `calc(${((filters.stopoverDuration[1] - 1) / (24 - 1)) * 100}% - ${((filters.stopoverDuration[1] - 1) / (24 - 1)) * 20}px + 10px)`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {isStopoverAny ? "Any" : formatHours(filters.stopoverDuration[1])}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[#5f6368] pt-6">
          {/* All Connecting Airports Toggle */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-white text-sm font-medium">All connecting airports</span>
            <GoogleToggle
              checked={allAirportsEnabled}
              onCheckedChange={handleAllAirportsToggle}
            />
          </div>

          {/* Airports Section */}
          <div className="mb-4">
            <h4 className="text-gray-400 text-sm mb-3">Airports</h4>
            
            <div className="max-h-48 overflow-y-auto overflow-x-hidden space-y-1 pl-4">
              {CONNECTING_AIRPORTS.map((airport) => (
                <label 
                  key={airport.code}
                  className="h-12 flex items-center gap-3 cursor-pointer -mx-2 px-2 py-1 rounded group"
                >
                  <Checkbox
                    id={airport.code}
                    checked={filters.connectingAirports?.includes(airport.code) || false}
                    onCheckedChange={() => handleAirportToggle(airport.code)}
                    className="w-5 h-5 border-gray-400 data-[state=checked]:bg-[#AECBFA] data-[state=checked]:border-[#AECBFA] data-[state=checked]:text-[#5C697F]"
                  />
                  <span className="text-white text-sm">
                    {airport.name} ({airport.code})
                  </span>
                  <Button 
                    variant="ghost" 
                    className="text-[#83AAEA] text-sm hidden group-hover:block hover:bg-[#35373C] rounded-full ml-auto mr-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOnlyAirport(airport.code)
                    }}
                  >
                    Only
                  </Button>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Clear Button */}
        <div className="flex justify-end pt-4 border-t border-[#5f6368]">
          <Button
            variant="ghost"
            onClick={handleClear}
            className="text-blue-400 hover:text-blue-300 hover:bg-transparent text-sm"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
} 
