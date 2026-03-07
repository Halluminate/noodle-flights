"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { PriceGraph } from "./price-graph"
import DateGrid from "./date-grid"
import { useFlight } from "@/providers/flight-provider"

interface GraphDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTab: "dates" | "price-graph"
  onTabChange: (tab: "dates" | "price-graph") => void
}

export function GraphDialog({ open, onOpenChange, activeTab, onTabChange }: GraphDialogProps) {
  const { setDepartureDateAndTriggerSearch, setReturnDateAndTriggerSearch } = useFlight()
  
  // State for managing local date changes
  const [localDepartureDate, setLocalDepartureDate] = React.useState<Date | undefined>()
  const [localReturnDate, setLocalReturnDate] = React.useState<Date | undefined>()
  const [hasLocalChanges, setHasLocalChanges] = React.useState(false)

  // Handlers for OK/Cancel buttons
  const handleOK = () => {
    // Apply local changes to global state and trigger search
    if (hasLocalChanges) {
      if (localDepartureDate) {
        setDepartureDateAndTriggerSearch(localDepartureDate)
      }
      if (localReturnDate) {
        setReturnDateAndTriggerSearch(localReturnDate)
      }
      setHasLocalChanges(false)
    }
    onOpenChange(false)
  }

  const handleCancel = () => {
    // Discard local changes
    setLocalDepartureDate(undefined)
    setLocalReturnDate(undefined)
    setHasLocalChanges(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full bg-[rgba(48,49,52,1)] text-white p-0 border-0 rounded-lg">
        {/* Header with tabs */}
        <DialogTitle className="sr-only">Flight Price Graph</DialogTitle>
        <div className="bg-[rgba(48,49,52,1)] pt-4 rounded-t-lg">
          <div className="flex items-center space-x-8 px-6">
            <button
              onClick={() => onTabChange("dates")}
              className={`text-sm font-medium transition-colors ${
                activeTab === "dates" 
                  ? "text-white" 
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Dates
            </button>
            <button
              onClick={() => onTabChange("price-graph")}
              className={`text-sm font-medium transition-colors relative ${
                activeTab === "price-graph" 
                  ? "text-white" 
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Price graph
            </button>
          </div>
          <div className="border-t border-gray-600 mt-4"></div>
        </div>

        {/* Content */}
        <div className="px-6 min-h-[440px]">
          {activeTab === "dates" && (
            <div className="text-white">
              <DateGrid />
            </div>
          )}
          
          {activeTab === "price-graph" && (
            <div className="h-full">
              <PriceGraph 
                localDepartureDate={localDepartureDate}
                setLocalDepartureDate={setLocalDepartureDate}
                localReturnDate={localReturnDate}
                setLocalReturnDate={setLocalReturnDate}
                setHasLocalChanges={setHasLocalChanges}
              />
            </div>
          )}
        </div>

        {/* Footer with OK/Cancel buttons (only for price-graph tab) */}
          <div className="py-2 px-6">
            <div className="flex items-center justify-end gap-2">
              <button 
                onClick={handleCancel}
                className="text-custom-blue-400 px-4 py-2 text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleOK}
                className="text-custom-blue-400 px-4 py-2  text-sm rounded transition-colors"
              >
                OK
              </button>
            </div>
            </div>
      </DialogContent>
    </Dialog>
  )
} 
