"use client"

import { Info } from "lucide-react"

interface FlightTabsProps {
  activeTab: "best" | "cheapest"
  onTabChange: (tab: "best" | "cheapest") => void
  cheapestPrice: number
}

export function FlightTabs({ activeTab, onTabChange, cheapestPrice }: FlightTabsProps) {
  return (
    <div className="flex">
      <div
        className={`flex-1 border border-[#5f6368] rounded-l-lg cursor-pointer overflow-hidden ${
          activeTab === "best" ? "bg-[#394457]" : "bg-[#202124]"
        }`}
        onClick={() => onTabChange("best")}
      >
        <div className={`p-3 text-center rounded-l-lg ${activeTab === "best" ? "border-b-[3px] border border-t-[1px] border-[#8AB4F8]" : ""}`}>
          <div className="flex items-center justify-center gap-2">
            <span className={`text-base font-medium ${activeTab === "best" ? "text-white" : "text-gray-300"}`}>Best</span>
            <Info className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      <div
        className={`flex-1 border border-[#5f6368] rounded-r-lg border-l-0 cursor-pointer overflow-hidden ${
          activeTab === "cheapest" ? "bg-[#394457]" : "bg-[#202124]"
        }`}
        onClick={() => onTabChange("cheapest")}
      >
        <div className={`p-3 text-center rounded-r-lg ${activeTab === "cheapest" ? "border-b-[3px] border border-t-[1px] border-[#8AB4F8]" : ""}`}>
          <div className="flex items-center justify-center gap-2">
            <span className={`text-base font-medium ${activeTab === "cheapest" ? "text-white" : "text-gray-300"}`}>
              Cheapest
            </span>
            <span className="text-sm text-gray-400">from</span>
            <span className="font-medium text-[#81C995]">${cheapestPrice.toLocaleString()}</span>
            <Info className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  )
}
