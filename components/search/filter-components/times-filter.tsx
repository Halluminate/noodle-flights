"use client"

import { Button } from "@/components/ui/button"
import { PopoverClose } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { X, PlaneLanding, PlaneTakeoff } from "lucide-react"
import { useFilters } from "../../../providers/flight-filters-context"
import { useFlight } from "@/providers/flight-provider"
import { useState, useEffect } from "react"
import { useAirportLookup } from "@/hooks/use-airport-lookup"

export function TimesFilter() {
  const { filters, setFilter, resetFilter } = useFilters()
  const { fromLocation, toLocation } = useFlight()
  const [activeTab, setActiveTab] = useState<'outbound' | 'return'>('outbound')
  const [isDraggingDeparture, setIsDraggingDeparture] = useState(false)
  const [isDraggingArrival, setIsDraggingArrival] = useState(false)
  const [routeText, setRouteText] = useState("Select route")

  // Use the server-side airport lookup hook
  const { lookupAirport } = useAirportLookup()

  // Update route text when locations or active tab changes
  useEffect(() => {
    const updateRouteText = async () => {
      const fromCode = await lookupAirport(fromLocation, "")
      const toCode = await lookupAirport(toLocation, "")
      
      if (!fromCode && !toCode) {
        setRouteText("Select route")
      } else if (!fromCode) {
        setRouteText(`to ${toCode}`)
      } else if (!toCode) {
        setRouteText(`${fromCode} to destination`)
      } else {
        setRouteText(activeTab === 'outbound' 
          ? `${fromCode} to ${toCode}`
          : `${toCode} to ${fromCode}`
        )
      }
    }
    
    updateRouteText()
  }, [fromLocation, toLocation, activeTab, lookupAirport])

  const formatTime = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const formatTimeRange = (range: [number, number]): string => {
    if (range[0] === 0 && range[1] === 24) {
      return "At any time"
    }
    return `${formatTime(range[0])} - ${formatTime(range[1])}`
  }

  const handleDepartureChange = (value: number[]) => {
    setFilter('times', {
      ...filters.times,
      [activeTab]: {
        ...filters.times[activeTab],
        departure: [value[0], value[1]] as [number, number]
      }
    })
  }

  const handleArrivalChange = (value: number[]) => {
    setFilter('times', {
      ...filters.times,
      [activeTab]: {
        ...filters.times[activeTab],
        arrival: [value[0], value[1]] as [number, number]
      }
    })
  }

  const handleClearDeparture = () => {
    setFilter('times', {
      ...filters.times,
      [activeTab]: {
        ...filters.times[activeTab],
        departure: [0, 24]
      }
    })
  }

  const handleClearArrival = () => {
    setFilter('times', {
      ...filters.times,
      [activeTab]: {
        ...filters.times[activeTab],
        arrival: [0, 24]
      }
    })
  }

  const handleClearAll = () => {
    resetFilter('times')
  }

  return (
    <div className="w-[360px] bg-[#303134] text-white rounded-lg border-0">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-0">
        <h3 className="text-base font-medium">Times</h3>
        <PopoverClose asChild>
          <button className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </PopoverClose>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#5f6368] mt-4 px-6">
        <button
          onClick={() => setActiveTab('outbound')}
          className={`flex-1 p-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'outbound'
              ? 'text-white border-[#4285f4]'
              : 'text-gray-400 border-transparent hover:text-white'
            }`}
        >
          Outbound
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`flex-1 p-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'return'
              ? 'text-white border-[#4285f4]'
              : 'text-gray-400 border-transparent hover:text-white'
            }`}
        >
          Return
        </button>
      </div>

      <div className="p-6 pt-6 space-y-8">
        {/* Route info */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm">{routeText}</p>
        </div>

        {/* Departure time */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PlaneTakeoff className={`w-4 h-4 text-gray-400 ${activeTab === 'return' ? '-scale-x-100' : ''}`} />
              <span className="text-xs text-gray-300">Departure</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-[#83AAEA]">
                {formatTimeRange(filters.times[activeTab].departure)}
              </span>
            </div>
            {(filters.times[activeTab].departure[0] !== 0 || filters.times[activeTab].departure[1] !== 24) && (
              <Button
                variant="ghost"
                onClick={handleClearDeparture}
                className="text-blue-400 hover:text-blue-300 hover:bg-transparent text-sm h-auto p-0"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="px-2 mt-7 relative">
            <div className="relative">
              <Slider
                value={filters.times[activeTab].departure}
                onValueChange={handleDepartureChange}
                onValueCommit={() => setIsDraggingDeparture(false)}
                onPointerDown={() => setIsDraggingDeparture(true)}
                onPointerUp={() => setIsDraggingDeparture(false)}
                max={24}
                min={0}
                step={1}
                minStepsBetweenThumbs={1}
                className="w-full [&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]>.bg-secondary]:bg-[#5f6368] [&_[data-orientation=horizontal]_.bg-primary]:bg-[#9DC0F9] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-[#9DC0F9] [&_[role=slider]]:ring-0 [&_[role=slider]]:focus-visible:ring-0 [&_[role=slider]]:focus-visible:ring-offset-0"
              />
              {/* Time tooltips above slider thumbs - only show when dragging */}
              {isDraggingDeparture && (
                <>
                  {/* Start time tooltip */}
                  <div
                    className="absolute -top-9 bg-[#AECBFA] text-[#202124] px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      left: `calc(${(filters.times[activeTab].departure[0] / 24) * 100}% - ${(filters.times[activeTab].departure[0] / 24) * 20}px + 10px)`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {formatTime(filters.times[activeTab].departure[0])}
                  </div>
                  {/* End time tooltip */}
                  <div
                    className="absolute -top-9 bg-[#AECBFA] text-[#202124] px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      left: `calc(${(filters.times[activeTab].departure[1] / 24) * 100}% - ${(filters.times[activeTab].departure[1] / 24) * 20}px + 10px)`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {formatTime(filters.times[activeTab].departure[1])}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Arrival time */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PlaneLanding className={`w-4 h-4 text-gray-400 ${activeTab === 'return' ? '-scale-x-100' : ''}`} />
              <span className="text-xs text-gray-300">Arrival</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-[#83AAEA]">
                {formatTimeRange(filters.times[activeTab].arrival)}
              </span>
            </div>
            {(filters.times[activeTab].arrival[0] !== 0 || filters.times[activeTab].arrival[1] !== 24) && (
              <Button
                variant="ghost"
                onClick={handleClearArrival}
                className="text-blue-400 hover:text-blue-300 hover:bg-transparent text-sm h-auto p-0"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="px-2 mt-7 relative">
            <div className="relative">
              <Slider
                value={filters.times[activeTab].arrival}
                onValueChange={handleArrivalChange}
                onValueCommit={() => setIsDraggingArrival(false)}
                onPointerDown={() => setIsDraggingArrival(true)}
                onPointerUp={() => setIsDraggingArrival(false)}
                max={24}
                min={0}
                step={1}
                minStepsBetweenThumbs={1}
                className="w-full [&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]>.bg-secondary]:bg-[#5f6368] [&_[data-orientation=horizontal]_.bg-primary]:bg-[#9DC0F9] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-[#9DC0F9] [&_[role=slider]]:ring-0 [&_[role=slider]]:focus-visible:ring-0 [&_[role=slider]]:focus-visible:ring-offset-0"
              />
              {/* Time tooltips above slider thumbs - only show when dragging */}
              {isDraggingArrival && (
                <>
                  {/* Start time tooltip */}
                  <div
                    className="absolute -top-9 bg-[#AECBFA] text-[#202124] px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      left: `calc(${(filters.times[activeTab].arrival[0] / 24) * 100}% - ${(filters.times[activeTab].arrival[0] / 24) * 20}px + 10px)`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {formatTime(filters.times[activeTab].arrival[0])}
                  </div>
                  {/* End time tooltip */}
                  <div
                    className="absolute -top-9 bg-[#AECBFA] text-[#202124] px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      left: `calc(${(filters.times[activeTab].arrival[1] / 24) * 100}% - ${(filters.times[activeTab].arrival[1] / 24) * 20}px + 10px)`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {formatTime(filters.times[activeTab].arrival[1])}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Clear Button */}
        <div className="flex justify-end pt-4">
          <Button
            variant="ghost"
            onClick={handleClearAll}
            className="text-blue-400 hover:text-blue-300 hover:bg-transparent text-sm"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
} 
