"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useFlight, type SelectedFlight } from "@/providers/flight-provider";
import { useFilters } from "../../providers/flight-filters-context";
import { FlightTabs } from "./flight-tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { shouldHighlightPrice } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PriceBanner } from "./price-banner";

// Import custom hooks
import { useFlightData } from "@/hooks/use-flight-data";
import { useFlightSorting } from "@/hooks/use-flight-sorting";
import { useFlightFiltering } from "@/hooks/use-flight-filtering";

// Import utilities
import { transformFlightForDisplay } from "@/lib/transformers/flight-transformer";
import {
  INITIAL_DISPLAY_COUNT,
} from "@/lib/constants/flight-list";
import { Flight } from "@/lib/flightGen";
import { LayoverFlight } from "@/lib/layoverGen";
import { calculateFlightScore } from "@/lib/utils";
import { SortOption } from "@/lib/types/flight-list";
import { formatPrice } from "@/lib/formatters";

// Import components
import { EmptyFlightState } from "./flight-list/EmptyFlightState";
import { FlightListHeader } from "./flight-list/FlightListHeader";
import { FlightBreadcrumb } from "./flight-list/FlightBreadcrumb";
import { FlightSection } from "./flight-list/FlightSection";
import { ViewMoreButton } from "./flight-list/ViewMoreButton";

type DisplayFlight = ReturnType<typeof transformFlightForDisplay> & {
  _rawFlight: Flight | LayoverFlight;
};

export function FlightList() {
  // Custom hooks
  const { flightData, isLoading } = useFlightData();
  const { currentSort, setCurrentSort, sortFlights } = useFlightSorting();
  const { filterFlights, filterFlightsWithoutPrice, calculateBagCost } =
    useFlightFiltering();
  const { passengers } = useFlight();

  // Local UI state
  const [activeTab, setActiveTab] = useState<"best" | "cheapest">("best");
  const [expandedFlight, setExpandedFlight] = useState<number | null>(null);
  const [displayedFlightsCount, setDisplayedFlightsCount] = useState(
    INITIAL_DISPLAY_COUNT
  );
  const [isViewMoreLoading, setIsViewMoreLoading] = useState(false);

  // Context hooks
  const {
    fromLocation,
    toLocation,
    selectedDepartingFlight,
    selectedReturningFlight,
    selectDepartingFlight,
    selectReturningFlight,
    clearSelectedFlights,
    clearDepartingFlight,
    tripType,
    flightSegments,
    departureDate,
    returnDate,
  } = useFlight();
  const { resetFilters } = useFilters();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine current view state
  // Check URL parameter first, then fall back to logic based on selected flights
  const selectingParam = searchParams.get("selecting");
  const isSelectingReturn =
    selectingParam === "return" ||
    (selectedDepartingFlight &&
      (tripType === "round-trip" || tripType === "multi-city") &&
      !selectedReturningFlight);

  // Monitor critical search parameters for changes while selecting return flights
  const prevSearchParamsRef = React.useRef({
    fromLocation,
    toLocation,
    departureDate: departureDate?.toISOString(),
    returnDate: returnDate?.toISOString(),
  });

  React.useEffect(() => {
    const prevParams = prevSearchParamsRef.current;
    const currentParams = {
      fromLocation,
      toLocation,
      departureDate: departureDate?.toISOString(),
      returnDate: returnDate?.toISOString(),
    };

    // If we're selecting return flights and critical parameters changed
    if (isSelectingReturn && selectedDepartingFlight) {
      const departureCityChanged =
        prevParams.fromLocation !== currentParams.fromLocation;
      const destinationCityChanged =
        prevParams.toLocation !== currentParams.toLocation;
      const departureDateChanged =
        prevParams.departureDate !== currentParams.departureDate;

      // If departure city, destination city, or departure date changed, reset to departure selection
      if (
        departureCityChanged ||
        destinationCityChanged ||
        departureDateChanged
      ) {
        // Clear selected flights and remove selecting parameter
        clearSelectedFlights();
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("selecting");
        router.replace(`/search?${newParams.toString()}`);
      }
      // If only return date changed, stay on return selection but data will refresh
      // (this happens automatically via the searchTrigger)
    }

    // Update ref for next comparison
    prevSearchParamsRef.current = currentParams;
  }, [
    fromLocation,
    toLocation,
    departureDate,
    returnDate,
    isSelectingReturn,
    selectedDepartingFlight,
    clearSelectedFlights,
    router,
    searchParams,
  ]);

  // Process flight data - now using real API data
  const bestFlights = useMemo(() => {
    // Use returning flights when selecting return flight, otherwise departing flights
    const currentFlights = isSelectingReturn
      ? flightData.returningFlights
      : flightData.departingFlights;
    // For now, treat all flights as "best" flights (we can implement scoring later)
    return currentFlights || [];
  }, [
    flightData.departingFlights,
    flightData.returningFlights,
    isSelectingReturn,
  ]);

  const cheapestFlights = useMemo(() => {
    // Use returning flights when selecting return flight, otherwise departing flights
    const currentFlights = isSelectingReturn
      ? flightData.returningFlights
      : flightData.departingFlights;
    // Return all flights for cheapest tab - sorting will be handled by the sorting algorithm
    return currentFlights || [];
  }, [
    flightData.departingFlights,
    flightData.returningFlights,
    isSelectingReturn,
  ]);

  const showTabs = !selectedDepartingFlight; // Only show tabs when no departing flight is selected
  const isTopFlightsSort = currentSort === "top-flights";
  const currentHeader = isTopFlightsSort
    ? isSelectingReturn
      ? tripType === "multi-city"
        ? "Top second flights"
        : "Top returning flights"
      : tripType === "one-way"
        ? "Top flights"
        : "Top departing flights"
    : isSelectingReturn
      ? tripType === "multi-city"
        ? "Second flights"
        : "Returning flights"
      : tripType === "one-way"
        ? "Flights"
        : "Departing flights";

  // Reset list state when switching between departing and returning
  useEffect(() => {
    setExpandedFlight(null);
    // Reset to best tab when switching to return flights
    if (isSelectingReturn) {
      setActiveTab("best");
    }
    // Don't reset sort - let user keep their preferred sorting
    // Reset displayed flights count
    setDisplayedFlightsCount(INITIAL_DISPLAY_COUNT);
  }, [isSelectingReturn]);

  // Reset displayed flights count when tab, sort, or filters change
  useEffect(() => {
    setDisplayedFlightsCount(INITIAL_DISPLAY_COUNT);
    setExpandedFlight(null);
  }, [activeTab, currentSort]);

  // Show return flights if departing flight is selected
  const allFlights = activeTab === "best" ? bestFlights : cheapestFlights;
  // First apply non-price filters
  const nonPriceFilteredFlights = filterFlightsWithoutPrice(
    allFlights,
    isSelectingReturn
  );

  // Use cheapest-flights algorithm as default for cheapest tab, top-flights as default for best tab
  // But allow "Sorted by" dropdown to override the default
  const effectiveSort: SortOption = (() => {
    // If user has selected a specific sort (not the default), use that
    if (currentSort !== "top-flights") {
      return currentSort;
    }
    // Otherwise use tab-specific default algorithm
    return activeTab === "cheapest" ? "cheapest-flights" : "top-flights";
  })();
  const sortedFlights = sortFlights(nonPriceFilteredFlights, effectiveSort);

  const flights = sortedFlights.slice(0, displayedFlightsCount); // Show up to displayedFlightsCount flights

  // Transform raw flights to display format
  const flightDate = isSelectingReturn
    ? tripType === "multi-city"
      ? flightSegments[1]?.date
        ? format(flightSegments[1].date, "EEE, MMM d")
        : "Flight 2"
      : returnDate
        ? format(returnDate, "EEE, MMM d")
        : "Return"
    : departureDate
      ? format(departureDate, "EEE, MMM d")
      : "Departure";

  // Calculate totals once
  const seatsNeeded =
    passengers.adults + passengers.children + passengers.infants;
  const bagCost = calculateBagCost();

  const displayFlights: DisplayFlight[] = flights.map((flight, index) => ({
    ...transformFlightForDisplay(
      flight,
      "",
      "",
      flightDate,
      index,
      seatsNeeded,
      bagCost
    ),
    _rawFlight: flight,
  }));

  // Compute a constant addition to show round-trip totals where applicable
  const roundTripAddition = React.useMemo(() => {
    if (tripType !== "round-trip") return 0;
    if (!isSelectingReturn) {
      // Departure page: add cheapest eligible return flight
      const returns = filterFlights(flightData.returningFlights || [], true);
      if (!returns || returns.length === 0) return 0;
      const prices = returns.map((r) => r.priceUsd * seatsNeeded + bagCost);
      const minReturn = Math.min(...prices);
      return Number.isFinite(minReturn) ? minReturn : 0;
    }
    // Return page: add selected departing flight total
    return selectedDepartingFlight?.priceUsd ?? 0;
  }, [
    tripType,
    isSelectingReturn,
    flightData.returningFlights,
    filterFlights,
    seatsNeeded,
    bagCost,
    selectedDepartingFlight?.priceUsd,
  ]);

  // Adjust flight display prices if we have an addition
  const adjustedDisplayFlights = React.useMemo(() => {
    if (!roundTripAddition || roundTripAddition <= 0) return displayFlights;
    return displayFlights.map((df) => ({
      ...df,
      priceUsd: df.priceUsd + roundTripAddition,
      price: formatPrice(df.priceUsd + roundTripAddition),
      priceLabel: "round trip",
    }));
  }, [displayFlights, roundTripAddition]);

  // Apply price filtering after round-trip pricing is calculated
  const { filters } = useFilters();
  const priceFilteredFlights = React.useMemo(() => {
    if (filters.priceRange === Infinity) return adjustedDisplayFlights;

    return adjustedDisplayFlights.filter((flight) => {
      const totalPassengers =
        passengers.adults + passengers.children + passengers.infants;
      const bagCost = calculateBagCost();
      const displayPrice = flight.priceUsd + bagCost * totalPassengers;
      return displayPrice <= filters.priceRange;
    });
  }, [
    adjustedDisplayFlights,
    passengers,
    calculateBagCost,
    filters.priceRange,
  ]);

  // Calculate which prices should be highlighted (green for lowest/near-lowest)
  const allPrices = priceFilteredFlights.map((flight) => flight.priceUsd);
  const priceHighlightMap = new Map<number, boolean>();
  priceFilteredFlights.forEach((flight) => {
    priceHighlightMap.set(
      flight.id,
      shouldHighlightPrice(flight.priceUsd, allPrices)
    );
  });

  const handleFlightSelection = (flight: SelectedFlight) => {
    // Always select the pure single-leg flight (without any round-trip addition)
    const pureSelected =
      displayFlights.find((df) => df.id === flight.id) || flight;
    const selectingParam = searchParams.get("selecting");

    // Check if we're explicitly selecting a return flight via URL parameter
    if (selectingParam === "return" && selectedDepartingFlight) {
      // We're selecting/changing the return flight
      selectReturningFlight(pureSelected);
      // Navigate to booking page with search params preserved
      const currentParams = new URLSearchParams(searchParams.toString());
      // Remove the selecting parameter since we're done selecting
      currentParams.delete("selecting");
      router.push(`/booking?${currentParams.toString()}`);
    } else if (!selectedDepartingFlight) {
      // Select departing flight
      selectDepartingFlight(pureSelected);

      // For one-way trips, navigate to booking immediately
      if (tripType === "one-way") {
        const currentParams = new URLSearchParams(searchParams.toString());
        router.push(`/booking?${currentParams.toString()}`);
      } else {
        // For round-trip/multi-city, stay on search page but update URL to show we're selecting return
        const currentParams = new URLSearchParams(searchParams.toString());
        currentParams.set("selecting", "return");
        router.push(`/search?${currentParams.toString()}`);
      }
    } else if (
      (tripType === "round-trip" || tripType === "multi-city") &&
      !selectedReturningFlight
    ) {
      // Select returning flight (or second flight for multi-city)
      selectReturningFlight(pureSelected);
      // Navigate to booking page with search params preserved
      const currentParams = new URLSearchParams(searchParams.toString());
      router.push(`/booking?${currentParams.toString()}`);
    } else {
      // If we have selected flights and user clicks select again,
      // it means they want to change their selection
      if (selectedDepartingFlight && selectedReturningFlight) {
        // Clear both flights and select the new departing flight
        clearSelectedFlights();
        selectDepartingFlight(pureSelected);
        if (tripType === "one-way") {
          const currentParams = new URLSearchParams(searchParams.toString());
          router.push(`/booking?${currentParams.toString()}`);
        }
      } else if (selectedDepartingFlight) {
        // Clear departing flight and select new one
        clearSelectedFlights();
        selectDepartingFlight(pureSelected);
        if (tripType === "one-way") {
          const currentParams = new URLSearchParams(searchParams.toString());
          router.push(`/booking?${currentParams.toString()}`);
        }
      }
    }
  };

  const handleChangeDepartingFlight = () => {
    clearDepartingFlight();
    // Remove the selecting parameter from URL when changing departing flight
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete("selecting");
    router.push(`/search?${currentParams.toString()}`);
  };

  const handleViewMoreFlights = async () => {
    setIsViewMoreLoading(true);

    // Update flight count immediately
    if (displayedFlightsCount >= sortedFlights.length) {
      // Currently showing all, collapse back to initial count
      setDisplayedFlightsCount(INITIAL_DISPLAY_COUNT);
    } else {
      // Show all remaining flights
      setDisplayedFlightsCount(sortedFlights.length);
    }
    setIsViewMoreLoading(false);
  };

  // Split flights into top and other sections based on sort option
  let topFlights = priceFilteredFlights.slice(0, 0);
  let otherFlights = priceFilteredFlights;

  if (isTopFlightsSort && priceFilteredFlights.length > 0) {
    // Get the raw flight data from the first display flight
    const firstFlight = priceFilteredFlights[0]?._rawFlight;
    if (firstFlight) {
      // Get the best score
      const bestScore = calculateFlightScore(firstFlight);

      // Include flights within 10% of the best score, up to 4 flights
      const scoreMargin = 0.1; // 10% margin
      const maxTopFlights = 4;

      // Filter display flights based on their raw flight scores
      const topFlightIndices: number[] = [];
      priceFilteredFlights.forEach((displayFlight, index) => {
        if (index >= maxTopFlights) return;
        const rawFlight = displayFlight._rawFlight;
        if (rawFlight) {
          const score = calculateFlightScore(rawFlight);
          if (score <= bestScore * (1 + scoreMargin)) {
            topFlightIndices.push(index);
          }
        }
      });

      // Split flights based on indices
      topFlights = priceFilteredFlights.slice(0, topFlightIndices.length);
      otherFlights = priceFilteredFlights.slice(topFlightIndices.length);
    }
  }

  // If no flights match filters and not loading, return empty state component
  if (priceFilteredFlights.length === 0 && !isLoading) {
    return <EmptyFlightState onResetFilters={resetFilters} />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <>
        {showTabs && (
          <div className="my-4">
            <FlightTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              cheapestPrice={(() => {
                // Compute cheapest shown in tabs: include round-trip if applicable
                const baseMin =
                  priceFilteredFlights.length > 0
                    ? Math.min(
                        ...priceFilteredFlights.map(
                          (f) =>
                            f.priceUsd *
                              (passengers.adults +
                                passengers.children +
                                passengers.infants) +
                            calculateBagCost()
                        )
                      )
                    : 0;
                const addition =
                  tripType === "round-trip" && !isSelectingReturn
                    ? (function () {
                        const rets = filterFlights(
                          flightData.returningFlights || [],
                          true
                        );
                        if (!rets || rets.length === 0) return 0;
                        const prices = rets.map(
                          (r) =>
                            r.priceUsd *
                              (passengers.adults +
                                passengers.children +
                                passengers.infants) +
                            calculateBagCost()
                        );
                        const minRet = Math.min(...prices);
                        return Number.isFinite(minRet) ? minRet : 0;
                      })()
                    : 0;
                return baseMin + addition;
              })()}
            />
          </div>
        )}

        {/* Breadcrumb showing selected departing flight */}
        {selectedDepartingFlight &&
          (tripType === "round-trip" || tripType === "multi-city") &&
          isSelectingReturn && (
            <FlightBreadcrumb
              selectedDepartingFlight={selectedDepartingFlight}
              tripType={tripType}
              flightSegments={flightSegments}
              fromLocation={fromLocation}
              onChangeDepartingFlight={handleChangeDepartingFlight}
            />
          )}

        <div>
          <div className="mb-2">
            <FlightListHeader
              currentHeader={currentHeader}
              currentSort={currentSort}
              onSortChange={setCurrentSort}
              flights={priceFilteredFlights}
            />
          </div>

          {/* Flight sections container - no spacing between sections */}
          <div>
            {isTopFlightsSort ? (
              // Layout for "Top flights" sort option
              <>
                {/* Top 3 Flights Section */}
                {topFlights.length > 0 && (
                  <FlightSection
                    flights={topFlights}
                    expandedFlight={expandedFlight}
                    onToggleExpanded={(id) =>
                      setExpandedFlight(expandedFlight === id ? null : id)
                    }
                    onFlightSelect={handleFlightSelection}
                    priceHighlightMap={priceHighlightMap}
                    sectionType="top"
                    isLastSection={false} // Never the last section in top flights view
                  />
                )}

                {/* Price banner with "The cheapest time to book" and "Track prices" */}
                {priceFilteredFlights.length > 0 && (
                  <div className="my-4">
                    <PriceBanner />
                  </div>
                )}

                {/* Other Flights Section */}
                {otherFlights.length > 0 && (
                  <FlightSection
                    title={
                      isSelectingReturn
                        ? tripType === "multi-city"
                          ? "Other second flights"
                          : "Other returning flights"
                        : tripType === "one-way"
                          ? "Other flights"
                          : "Other departing flights"
                    }
                    flights={otherFlights}
                    expandedFlight={expandedFlight}
                    onToggleExpanded={(id) =>
                      setExpandedFlight(expandedFlight === id ? null : id)
                    }
                    onFlightSelect={handleFlightSelection}
                    priceHighlightMap={priceHighlightMap}
                    isLastSection={
                      sortedFlights.length <= INITIAL_DISPLAY_COUNT
                    }
                    sectionType="other"
                  />
                )}
              </>
            ) : (
              // Layout for all other sort options - just show all flights
              <FlightSection
                flights={otherFlights}
                expandedFlight={expandedFlight}
                onToggleExpanded={(id) =>
                  setExpandedFlight(expandedFlight === id ? null : id)
                }
                onFlightSelect={handleFlightSelection}
                priceHighlightMap={priceHighlightMap}
                sectionType="other"
                isLastSection={sortedFlights.length <= INITIAL_DISPLAY_COUNT}
              />
            )}

            {/* View More/Fewer Flights Button - directly attached to last section */}
            {sortedFlights.length > INITIAL_DISPLAY_COUNT && (
              <ViewMoreButton
                isLoading={isViewMoreLoading}
                isExpanded={displayedFlightsCount >= sortedFlights.length}
                onClick={handleViewMoreFlights}
              />
            )}
          </div>
        </div>
      </>
    </TooltipProvider>
  );
}
