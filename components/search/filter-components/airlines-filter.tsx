"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { PopoverClose } from "@/components/ui/popover"
import { GoogleToggle } from "@/components/ui/google-toggle"
import { X } from "lucide-react"
import { useFilters } from "../../../providers/flight-filters-context"
import { ALLIANCES, AIRLINES } from "@/lib/constants/filters"

export function AirlinesFilter() {
  const { filters, setFilter, resetFilter, availableAirlines } = useFilters()
  
  // Use dynamic airlines from context, with fallback to popular airlines
  const airlines = availableAirlines.length > 0 ? availableAirlines : AIRLINES
  const airlineOnlyCodes = airlines.map(a => a.code)
  
  // Consider "all selected" if all individual airlines are selected (alliances are optional)
  const isAllSelected = airlineOnlyCodes.every(code => filters.airlines.includes(code))

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select individual airlines, not alliances
      setFilter('airlines', airlineOnlyCodes)
    } else {
      setFilter('airlines', [])
    }
  }

  const handleAllianceToggle = (code: string) => {
    if (filters.airlines.includes(code)) {
      // If unchecking an alliance, remove it from the list
      const newAirlines = filters.airlines.filter(a => a !== code)
      setFilter('airlines', newAirlines)
    } else {
      // If the current selection is all defaults, clear defaults and only select this alliance
      if (isAllSelected) {
        setFilter('airlines', [code])
      } else {
        // Otherwise, add to the current selection
        const newAirlines = [...filters.airlines, code]
        setFilter('airlines', newAirlines)
      }
    }
  }

  const handleAirlineToggle = (code: string) => {
    if (filters.airlines.includes(code)) {
      // If unchecking an airline, remove it from the list
      const newAirlines = filters.airlines.filter(a => a !== code)
      setFilter('airlines', newAirlines)
    } else {
      // If the current selection is all defaults, clear defaults and only select this airline
      if (isAllSelected) {
        setFilter('airlines', [code])
      } else {
        // Otherwise, add to the current selection
        const newAirlines = [...filters.airlines, code]
        setFilter('airlines', newAirlines)
      }
    }
  }

  const handleClear = () => {
    resetFilter('airlines')
  }

  const handleOnlyAirline = (airlineCode: string) => {
    // Select only this airline and deselect all others
    setFilter('airlines', [airlineCode])
  }

  const handleOnlyAlliance = (allianceCode: string) => {
    // Select only this alliance and deselect all others
    setFilter('airlines', [allianceCode])
  }

  return (
    <div className="w-[360px] bg-[#303134] text-white p-6 rounded-lg border-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-medium">Airlines</h3>
        <PopoverClose asChild>
          <button className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </PopoverClose>
      </div>

      

      {/* Content */}
      <div className="space-y-6 max-h-80 overflow-y-auto pr-4 pt-2">
        {/* Select All Toggle */}
      <div className="flex items-center justify-between mb-6">
        <Label htmlFor="select-all" className="text-gray-200  font-normal">
          Select all airlines
        </Label>
        <GoogleToggle
          checked={isAllSelected}
          onCheckedChange={handleSelectAll}
        />
      </div>
        {/* Alliances Section */}
        <div>
          <h4 className="text-gray-400 text-sm font-medium mb-3">Alliances</h4>
          <div className="space-y-1 pl-4">
            {ALLIANCES.map(alliance => (
              <label 
                key={alliance.code}
                className="h-12 flex items-center gap-3 cursor-pointer -mx-2 px-2 py-1 rounded group"
              >
                <Checkbox
                  id={alliance.code}
                  checked={filters.airlines.includes(alliance.code)}
                  onCheckedChange={() => handleAllianceToggle(alliance.code)}
                  className="w-5 h-5 border-gray-400 data-[state=checked]:bg-[#AECBFA] data-[state=checked]:border-[#AECBFA] data-[state=checked]:text-[#5C697F]"
                />
                <Label 
                  htmlFor={alliance.code} 
                  className="text-gray-200 cursor-pointer text-sm font-normal"
                >
                  {alliance.name}
                </Label>
                <Button 
                  variant="ghost" 
                  className="text-[#83AAEA] text-sm hidden group-hover:block hover:bg-[#35373C] rounded-full ml-auto mr-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOnlyAlliance(alliance.code)
                  }}
                >
                  Only
                </Button>
              </label>
            ))}
          </div>
        </div>

        {/* Airlines Section */}
        <div>
          <h4 className="text-gray-400 text-sm font-medium mb-3">Airlines</h4>
          <div className="space-y-1 pl-4">
            {airlines.map(airline => (
              <label 
                key={airline.code}
                className="h-12 flex items-center gap-3 cursor-pointer -mx-2 px-2 py-1 rounded group"
              >
                <Checkbox
                  id={airline.code}
                  checked={filters.airlines.includes(airline.code)}
                  onCheckedChange={() => handleAirlineToggle(airline.code)}
                  className="w-5 h-5 border-gray-400 data-[state=checked]:bg-[#AECBFA] data-[state=checked]:border-[#AECBFA] data-[state=checked]:text-[#5C697F]"
                />
                <Label 
                  htmlFor={airline.code} 
                  className="text-gray-200 cursor-pointer text-sm font-normal"
                >
                  {airline.name}
                </Label>
                <Button 
                  variant="ghost" 
                  className="text-[#83AAEA] text-sm hidden group-hover:block hover:bg-[#35373C] rounded-full ml-auto mr-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOnlyAirline(airline.code)
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