"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { PopoverClose } from "@/components/ui/popover"
import { X, Plus, Minus } from "lucide-react"
import { useFilters } from "../../../providers/flight-filters-context"

export function BagsFilter() {
  const { filters, setFilter, resetFilter } = useFilters()
  
  const updateBagCount = (
    bagType: keyof typeof filters.bags,
    increment: boolean
  ) => {
    if (increment) {
      // Max limit of 1 for carry-on bag
      const newValue = Math.min(1, filters.bags[bagType] + 1)
      setFilter('bags', {
        ...filters.bags,
        [bagType]: newValue
      })
    } else {
      // Min limit of 0
      const newValue = Math.max(0, filters.bags[bagType] - 1)
      setFilter('bags', {
        ...filters.bags,
        [bagType]: newValue
      })
    }
  }

  const handleClear = () => {
    resetFilter('bags')
  }

  return (
    <div className="w-[360px] bg-[#303134] text-white p-6 rounded-lg border-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-medium">Bags</h3>
        <PopoverClose asChild>
          <button className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </PopoverClose>
      </div>

      {/* Bag Options */}
      <div className="space-y-3">
        {/* Carry-on bag */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-white">Carry-on bag</Label>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateBagCount("carryOn", false)}
              disabled={filters.bags.carryOn <= 0}
              className="h-8 w-8 p-0 bg-[#4B4C50] border-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center">
              {filters.bags.carryOn}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateBagCount("carryOn", true)}
              disabled={filters.bags.carryOn >= 1}
              className="h-8 w-8 p-0 bg-[#3E495E] border-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Checked bag */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-white">Checked bag</Label>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateBagCount("checked", false)}
              disabled={filters.bags.checked <= 0}
              className="h-8 w-8 p-0 bg-[#4B4C50] border-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center">
              {filters.bags.checked}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateBagCount("checked", true)}
              disabled={filters.bags.checked >= 1}
              className="h-8 w-8 p-0 bg-[#3E495E] border-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Learn more link */}
      <div className="mt-6">
        <button className="text-blue-400 hover:text-blue-300 text-sm underline">
          Learn more about bag selection
        </button>
      </div>

      {/* Clear Button */}
      <div className="flex justify-end mt-3">
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