"use client"

import { Button } from "@/components/ui/button"
import { PopoverClose } from "@/components/ui/popover"
import { X } from "lucide-react"
import { useFilters } from "../../../providers/flight-filters-context"
import { FilterToggleContainer } from "@/components/ui/filter-toggle"

export function EmissionsFilter() {
  const { filters, setFilter, resetFilter } = useFilters()
  
  const handleEmissionChange = (value: string) => {
    setFilter('emissions', value)
  }

  const handleClear = () => {
    resetFilter('emissions')
  }

  return (
    <div className="w-[360px] bg-[#303134] text-white p-6 rounded-lg border-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-medium">Emissions</h3>
        <PopoverClose asChild>
          <button className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </PopoverClose>
      </div>

      {/* Radio Options */}
      <div className="space-y-4 mb-6 px-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="radio"
              name="emissions"
              value="any"
              checked={filters.emissions === 'any'}
              onChange={(e) => handleEmissionChange(e.target.value)}
              className="sr-only"
            />
            <FilterToggleContainer>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                filters.emissions === 'any' 
                  ? 'border-[#AECBFA] bg-transparent' 
                  : 'border-gray-400'
              }`}>
                {filters.emissions === 'any' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#AECBFA]"></div>
                )}
              </div>
            </FilterToggleContainer>
          </div>
          <span className="text-white text-sm">Any emissions</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="radio"
              name="emissions"
              value="less"
              checked={filters.emissions === 'less'}
              onChange={(e) => handleEmissionChange(e.target.value)}
              className="sr-only"
            />
            <FilterToggleContainer>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                filters.emissions === 'less' 
                  ? 'border-[#AECBFA] bg-transparent' 
                  : 'border-gray-400'
              }`}>
                {filters.emissions === 'less' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#AECBFA]"></div>
                )}
              </div>
            </FilterToggleContainer>
          </div>
          <span className="text-white text-sm">Less emissions only</span>
        </label>
      </div>

      {/* Learn More Link */}
      <div className="mb-6">
        <a 
          href="#" 
          className="text-[#8ab4f8] text-sm hover:underline"
          onClick={(e) => e.preventDefault()}
        >
          Learn more about carbon emissions
        </a>
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