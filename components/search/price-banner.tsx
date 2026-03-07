"use client"

import * as React from "react"
import { TrendingUp, Info, Sparkles, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoogleToggle } from "@/components/ui/google-toggle"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem 
} from "@/components/ui/accordion"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { useFlight } from "@/providers/flight-provider"
import { usePriceHistory } from "@/hooks/use-price-history"
import { format } from "date-fns"
import { GraphDialog } from "./graph-dialog"

export function PriceBanner() {
  const [trackPrices, setTrackPrices] = React.useState(false)
  const [anyDates, setAnyDates] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"dates" | "price-graph">("price-graph")
  const [accordionValue, setAccordionValue] = React.useState<string>("")
  const { departureDate, returnDate, fromLocation, toLocation } = useFlight()
  const priceHistory = usePriceHistory()

  // Format date range for display
  const getDateRangeText = () => {
    if (departureDate && returnDate) {
      const departureFormatted = format(departureDate, "MMM d")
      const returnFormatted = format(returnDate, "d")
      return `${departureFormatted} – ${returnFormatted}`
    } else if (departureDate) {
      return format(departureDate, "MMM d")
    }
    return "Select dates"
  }

  const handleOpenDialog = (tab: "dates" | "price-graph") => {
    setActiveTab(tab)
    setDialogOpen(true)
  }

  // Helper functions for dynamic content
  const getBookingAdviceText = () => {
    if (!fromLocation || !toLocation || !priceHistory.currentPrice) {
      return "The cheapest time to book is usually 1–3 months before takeoff"
    }
    return `The cheapest time to book is usually ${priceHistory.bestBookingPeriod}`
  }

  const getPriceStatusColor = () => {
    switch (priceHistory.priceStatus) {
      case "low": return "bg-green-500"
      case "high": return "bg-red-500"
      default: return "bg-yellow-500"
    }
  }

  const getPriceStatusText = () => {
    switch (priceHistory.priceStatus) {
      case "low": return "low"
      case "high": return "high"
      default: return "typical"
    }
  }

  return (
    <div className="mt-4">
      {/* Price history accordion */}
      <Accordion 
        type="single" 
        collapsible
        value={accordionValue}
        onValueChange={setAccordionValue}
        className={`bg-transparent overflow-hidden border border-[#669df6]/50 ${accordionValue === "price-history" ? "rounded-lg" : "rounded-lg"}`}
      >
        <AccordionItem 
          value="price-history"
          className="border-none"
        >
          <AccordionPrimitive.Header className={`flex bg-[#303643] ${accordionValue === "price-history" ? "rounded-t-lg" : "rounded-lg"}`}>
            {/* Main content area - NOT a button */}
            <div className="flex items-center justify-between p-4 flex-1">
              <div className="flex items-center gap-6">
                <Sparkles className="w-8 h-8 text-blue-400 fill-blue-400" />
                <span className="text-white text-md">
                  {getBookingAdviceText()}
                </span>
              
              {/* vertical line */}
              <div className="border-l border-gray-400 h-8"></div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getPriceStatusColor()}`}></div>
                  <span className="text-white text-md">Prices are currently <strong>{getPriceStatusText()}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2 transition-colors duration-200">
                <span className="text-blue-400 text-sm font-bold">View price history</span>
              </div>
            </div>

            {/* Accordion trigger - ONLY this triggers accordion */}
            <AccordionPrimitive.Trigger className="w-10 h-10 flex items-center justify-center hover:bg-gray-700/50 rounded-full transition-colors duration-200 mr-5 my-auto flex-shrink-0">
              <ChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-200 text-blue-400 ${accordionValue === "price-history" ? 'rotate-180' : ''}`} />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>

          <AccordionContent className="bg-[#303643] pb-0 rounded-b-lg">
            <div className="p-6">
              <div className="text-white space-y-4">
                {/* First section: Booking timing advice */}
                <div className="w-2/3">
                  <div>
                    <span className="text-white text-sm">
                      The lowest prices for similar trips to {toLocation || "your destination"} are usually found <strong>{priceHistory.bestBookingPeriod}.</strong> 
                      {priceHistory.historicalLow && priceHistory.currentPrice && (
                        <> Prices during this time are <strong>${(priceHistory.currentPrice - priceHistory.historicalLow).toLocaleString()} cheaper</strong> on average.</>
                      )} 
                      <Info className="w-4 h-4 text-gray-400 inline ml-1" />
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-600"></div>

                {/* Second section: Current price status */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">Prices are currently <strong>{getPriceStatusText()}</strong> for your search</h3>
                    {priceHistory.currentPrice && (
                      <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                        ${priceHistory.currentPrice.toLocaleString()} is {getPriceStatusText()}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-base">
                        The least expensive flights for similar trips to {toLocation || "your destination"} usually cost between{" "}
                        {priceHistory.historicalLow && priceHistory.historicalHigh ? (
                          <strong>${priceHistory.historicalLow.toLocaleString()}–${priceHistory.historicalHigh.toLocaleString()}.</strong>
                        ) : (
                          <strong>$135–230.</strong>
                        )}
                      </span>
                      <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                    
                    {/* Price range bar */}
                    {priceHistory.historicalLow && priceHistory.historicalHigh && priceHistory.currentPrice && (
                      <div className="space-y-2 pt-3">
                        <div className="relative h-2 bg-gray-700 rounded-full">
                          {/* Green section (cheapest) */}
                          <div className="absolute left-0 top-0 h-full w-[30%] bg-green-500 rounded-l-full"></div>
                          {/* Yellow section (moderate) */}
                          <div className="absolute left-[30%] top-0 h-full w-[40%] bg-yellow-500"></div>
                          {/* Red section (expensive) */}
                          <div className="absolute right-0 top-0 h-full w-[30%] bg-red-500 rounded-r-full"></div>
                          {/* Current price indicator */}
                          <div 
                            className="absolute top-0 h-full w-1 bg-white" 
                            style={{ 
                              left: `${Math.min(100, Math.max(0, ((priceHistory.currentPrice - priceHistory.historicalLow) / (priceHistory.historicalHigh - priceHistory.historicalLow)) * 100))}%` 
                            }}
                          >
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border-2 border-blue-400"></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-300">
                          <span>${priceHistory.historicalLow.toLocaleString()}</span>
                          <span>${priceHistory.historicalHigh.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-600"></div>

                {/* Third section: Price history chart */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Price history for this search</h3>
                  
                  {/* Dynamic price chart representation */}
                  {priceHistory.priceHistory.length > 0 ? (
                    <div className="space-y-3">
                      <div className="relative h-32 bg-gray-800/50 rounded border border-gray-600">
                        {/* Chart grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between p-2">
                          <div className="border-t border-gray-600/50"></div>
                          <div className="border-t border-gray-600/50"></div>
                          <div className="border-t border-gray-600/50"></div>
                          <div className="border-t border-gray-600/50"></div>
                        </div>
                        
                        {/* Y-axis labels */}
                        {priceHistory.historicalLow && priceHistory.historicalHigh && (
                          <div className="absolute left-2 top-0 h-full flex flex-col justify-between text-xs text-gray-400 py-2">
                            <span>${priceHistory.historicalHigh}</span>
                            <span>${Math.round((priceHistory.historicalHigh + priceHistory.historicalLow * 3) / 4)}</span>
                            <span>${Math.round((priceHistory.historicalHigh + priceHistory.historicalLow) / 2)}</span>
                            <span>${Math.round((priceHistory.historicalHigh * 3 + priceHistory.historicalLow) / 4)}</span>
                            <span>${priceHistory.historicalLow}</span>
                          </div>
                        )}
                        
                        {/* Dynamic price line */}
                        {priceHistory.historicalLow && priceHistory.historicalHigh && (
                          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            <polyline
                              points={priceHistory.priceHistory
                                .slice(0, 10) // Show last 10 data points to fit in chart
                                .map((point, index) => {
                                  const x = 60 + (index * (600 - 60) / 9); // Distribute across chart width
                                  const priceRange = priceHistory.historicalHigh! - priceHistory.historicalLow!;
                                  const normalizedPrice = (point.price - priceHistory.historicalLow!) / priceRange;
                                  const y = 100 - (normalizedPrice * 80); // Invert Y and scale to chart height
                                  return `${x},${y}`;
                                })
                                .join(' ')}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                        )}
                      </div>
                      
                      {/* X-axis labels */}
                      <div className="flex justify-between text-xs text-gray-400 px-2">
                        <span>60 days ago</span>
                        <span>45 days ago</span>
                        <span>30 days ago</span>
                        <span>15 days ago</span>
                        <span>Today</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <span>Price history will appear here when search parameters are selected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Track prices and controls */}
      <div className="flex items-center justify-between mt-4">
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
          <Button
            size="sm"
            className="bg-transparent text-blue-400 border-blue-400 hover:bg-blue-400/10 flex items-center gap-2 text-sm"
            onClick={() => handleOpenDialog("dates")}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Date grid
          </Button>
          <div className="border-l border-gray-400 h-8"></div>
          <Button
            size="sm"
            className="bg-transparent text-blue-400 border-blue-400 hover:bg-blue-400/10 flex items-center gap-2"
            onClick={() => handleOpenDialog("price-graph")}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 9l4-4 4 4 2-2" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Price graph
          </Button>
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