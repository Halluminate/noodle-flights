"use client"

import { Button } from "@/components/ui/button"
import { PopoverClose } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { X } from "lucide-react"
import { useFilters } from "../../../providers/flight-filters-context"
import { useState, useEffect } from "react"

export function DurationFilter() {
  const { filters, setFilter, resetFilter } = useFilters()
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState(filters.duration[1])
  const currentDurationMax = filters.duration[1]
  
  const handleDurationChange = (value: number[]) => {
    // Only update local drag value during drag, not the actual filter
    setDragValue(value[0])
  }

  const handleDurationCommit = (value: number[]) => {
    // Update the actual filter only when dragging stops
    setFilter('duration', [0, value[0]])
    setIsDragging(false)
  }

  const handleClear = () => {
    resetFilter('duration')
    setDragValue(24) // Reset drag value to default
  }

  // Update drag value when filters change externally
  useEffect(() => {
    if (!isDragging) {
      setDragValue(currentDurationMax)
    }
  }, [currentDurationMax, isDragging])

  const formatDurationText = (maxDuration: number) => {
    if (maxDuration >= 24) {
      return "Any"
    }
    return `up to ${maxDuration}h`
  }

  const formatTooltipText = (duration: number) => {
    if (duration >= 24) {
      return "Any"
    }
    return `Under ${duration} hr`
  }

  return (
    <div className="w-[360px] bg-[#303134] text-white p-6 rounded-lg border-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-medium">Duration</h3>
        <PopoverClose asChild>
          <button className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </PopoverClose>
      </div>

      {/* Duration Text */}
      <div className="mb-6">
        <p className="text-[#83AAEA] text-xs">
          Flight duration · {formatDurationText(filters.duration[1])}
        </p>
      </div>

      {/* Duration Slider */}
      <div className="px-2 mb-6 relative">
        <div className="relative">
          <Slider
            value={[isDragging ? dragValue : filters.duration[1]]}
            onValueChange={handleDurationChange}
            onValueCommit={handleDurationCommit}
            onPointerDown={() => setIsDragging(true)}
            max={24}
            min={1}
            step={1}
            className="w-full [&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]>.bg-secondary]:bg-[#5f6368] [&_[data-orientation=horizontal]_.bg-primary]:bg-[#9DC0F9] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-[#9DC0F9] [&_[role=slider]]:ring-0 [&_[role=slider]]:focus-visible:ring-0 [&_[role=slider]]:focus-visible:ring-offset-0"
          />
          {/* Duration tooltip above slider thumb - only show when dragging */}
          {isDragging && (
                          <div 
                className="absolute -top-10 bg-[#AECBFA] text-[#202124] px-3 py-1.5 rounded-full text-xs font-medium w-fit text-center whitespace-nowrap"
                style={{
                  left: `calc(${((dragValue - 1) / (24 - 1)) * 100}% - ${((dragValue - 1) / (24 - 1)) * 20}px + 10px)`,
                  transform: 'translateX(-50%)'
                }}
              >
              {formatTooltipText(dragValue)}
            </div>
          )}
        </div>
      </div>

      {/* Clear Button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={handleClear}
          className="text-blue-400 hover:text-blue-300 hover:bg-transparent text-sm"
        >
          Clear
        </Button>
      </div>
    </div>
  )
} 
