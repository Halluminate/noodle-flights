"use client"

import { Button } from "@/components/ui/button"
import { PopoverClose } from "@/components/ui/popover"
import { X } from "lucide-react"
import { useFilters } from "../../../providers/flight-filters-context"
import { STOP_OPTIONS } from "@/lib/constants/filters"
import { FilterToggleContainer } from "@/components/ui/filter-toggle"

export function StopsFilter() {
  const { filters, setFilter, resetFilter } = useFilters()

  const handleStopChange = (value: string) => {
    setFilter('stops', value as typeof filters.stops)
  }

  const handleClear = () => {
    resetFilter('stops')
  }

  return (
    <div className="w-[360px] bg-[#303134] text-white p-4 rounded-lg border-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-medium">Stops</h3>
        <PopoverClose asChild>
          <button className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </PopoverClose>
      </div>

      {/* Radio Options */}
      <div className="space-y-4 px-5">
        {STOP_OPTIONS.map(option => (
          <label key={option.value} className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="radio"
                name="stops"
                value={option.value}
                checked={filters.stops === option.value}
                onChange={(e) => handleStopChange(e.target.value)}
                className="sr-only"
              />
              <FilterToggleContainer>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${filters.stops === option.value
                    ? 'border-[#AECBFA] bg-transparent'
                    : 'border-gray-400'
                  }`}>
                  {filters.stops === option.value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#AECBFA]"></div>
                  )}
                </div>
              </FilterToggleContainer>
            </div>
            <span className="text-white text-sm">{option.label}</span>
          </label>
        ))}
      </div>

      {/* Clear Button */}
      <div className="flex justify-end mt-6 pt-4">
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
