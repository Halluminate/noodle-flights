"use client"

import { FlightFilters } from "@/components/search/flight-filters"
import { FlightList } from "@/components/search/flight-list"
import FlightsForm from "@/components/flights-form"
import { FilterProvider } from "@/providers/flight-filters-context"

export default function FlightSearch() {
  return (
    <FilterProvider>
      <div className="min-h-screen text-white p-4 bg-[rgba(32,33,36,1)]">
        <div className="max-w-5xl mx-auto">
          <div className="mt-2">
            <FlightsForm hideSearchButton={true} />
          </div>
          <div className="my-4">
            <FlightFilters />
          </div>
          <FlightList />
        </div>
      </div>
    </FilterProvider>
  )
}
