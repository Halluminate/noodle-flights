"use client"

import * as React from "react"
import { GoogleToggle } from "@/components/ui/google-toggle"
import { TrendingUp, Info } from "lucide-react"
import { useFlight } from "@/providers/flight-provider"
import { format } from "date-fns"
import { GraphDialog } from "./graph-dialog"

export default function GraphHeader() {
  const [trackPrices, setTrackPrices] = React.useState(true)
  const [anyDates, setAnyDates] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"dates" | "price-graph">("price-graph")
  const { departureDate, returnDate } = useFlight()

  // Format date range for display
  const getDateRangeText = () => {
    if (departureDate && returnDate) {
      const departureFormatted = format(departureDate, "d MMM")
      const returnFormatted = format(returnDate, "d MMM")
      return `${departureFormatted}–${returnFormatted}`
    } else if (departureDate) {
      return format(departureDate, "d MMM")
    }
    return "Select dates"
  }

  const handleOpenDialog = (tab: "dates" | "price-graph") => {
    setActiveTab(tab)
    setDialogOpen(true)
  }

  return (
    <div className="py-3 flex items-center justify-between bg-[rgba(32,33,36,1)]">
      {/* Left section - Track prices */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <span className="text-white font-medium">Track prices</span>
          <Info className="w-4 h-4 text-gray-400" />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[rgba(138,180,214,1)]">{getDateRangeText()}</span>
          <GoogleToggle checked={trackPrices} onCheckedChange={setTrackPrices} />
        </div>

        <div className="border-l border-gray-400 h-8"></div>

        <div className="flex items-center gap-3">
          <span className="text-[rgba(138,180,214,1)]">Any dates</span>
          <GoogleToggle checked={anyDates} onCheckedChange={setAnyDates} />
        </div>
      </div>


      {/* Right section - Buttons */}
      <div className="flex items-center gap-3">
        <div 
          className="cursor-pointer hover:bg-[#26282D] p-2 text-white border-0 gap-2 bg-transparent flex items-center"
          onClick={() => handleOpenDialog("dates")}
        >
          <svg focusable="false" width="32" height="32" viewBox="0 0 32 32" className="QFVsoc NMm5M"><rect x="3" y="5.09" width="26" height="16" rx="2" fill="#aecbfa"></rect><path d="M7 5.09a2 2 0 112 2M14 5.09a2 2 0 112 2M21 5.09a2 2 0 112 2" fill="none" stroke="#5384eb" strokeMiterlimit="10"></path><path d="M29 11.09v11.17l-6.83 6.83H5a2 2 0 01-2-2v-16z" fill="#d2e3fc"></path><path fill="none" stroke="#5384eb" strokeMiterlimit="10" d="M5 16.09h6M21 16.09h6M13 16.09h6"></path><path fill="none" stroke="#f9ab00" strokeMiterlimit="10" d="M5 20.09h6"></path><path fill="none" stroke="#5384eb" strokeMiterlimit="10" d="M21 20.09h6M13 20.09h6M5 24.09h6M21 24.09h4.58M13 24.09h6"></path><path d="M22.17 29.09v-4.83a2 2 0 012-2H29" fill="#e8f0fe"></path><path fill="none" d="M0 0h32v32H0z"></path></svg>
          <span className="text-custom-blue-400 tex-sm">
            Date grid
          </span>
        </div>

        <div className="border-l border-gray-400 h-8"></div>

        <div 
          className="cursor-pointer hover:bg-[#26282D] p-2 text-white border-0 gap-2 bg-transparent flex items-center"
          onClick={() => handleOpenDialog("price-graph")}
        >
          <svg focusable="false" width="32" height="32" viewBox="0 0 32 32" className="QFVsoc NMm5M"><rect x="1" y="1.09" width="30" height="30" rx="15" fill="#d2e3fc"></rect><path d="M16 31.09A15 15 0 0029.66 9.91l-8.51 8.51a2 2 0 01-2.83 0L14 14.1a2 2 0 00-2.83 0l-8.61 8.63A15 15 0 0016 31.09z" fill="#aecbfa"></path><path d="M27.74 16.09h0A11.73 11.73 0 0116 27.83h0" fill="none" stroke="#8ab4f8" strokeMiterlimit="10"></path><path d="M4.26 16.09h0A11.74 11.74 0 0116 4.35h0" fill="none" stroke="#e8f0fe" strokeMiterlimit="10"></path><path d="M28.89 10.68l-7.74 7.74a2 2 0 01-2.83 0L14 14.1a2 2 0 00-2.83 0l-9.71 9.7" fill="none" stroke="#5384eb" strokeMiterlimit="10"></path><path fill="#5384eb" d="M24.82 10.72l6.12-2.12-2.12 6.12-4-4z"></path><path fill="none" d="M0 0h32v32H0z"></path><circle cx="12.58" cy="13.72" r="1.93" fill="#e8f0fe" stroke="#5384eb" strokeMiterlimit="10"></circle><circle cx="19.68" cy="19.27" r="1.93" fill="#f9ab00" stroke="#5384eb" strokeMiterlimit="10"></circle></svg>
          <span className="text-custom-blue-400 tex-sm">
            Price graph
          </span>
        </div>
      </div>

      {/* Graph Dialog */}
      <GraphDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )
}
