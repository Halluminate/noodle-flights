"use client";

import {
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StopsFilter } from "./filter-components/stops-filter";
import { AirlinesFilter } from "./filter-components/airlines-filter";
import { BagsFilter } from "./filter-components/bags-filter";
import { PriceFilter } from "./filter-components/price-filter";
import { TimesFilter } from "./filter-components/times-filter";
import { EmissionsFilter } from "./filter-components/emissions-filter";
import { ConnectingAirportsFilter } from "./filter-components/connecting-airports-filter";
import { DurationFilter } from "./filter-components/duration-filter";
import { AllFiltersPopup } from "./filter-components/all-filters";
import { useFilters } from "../../providers/flight-filters-context";
import { useRef, useState, useEffect } from "react";
import {
  STOP_OPTIONS,
  ALL_AIRLINE_ITEMS,
  DEFAULT_AIRLINE_CODES,
  DEFAULT_CONNECTING_AIRPORT_CODES,
  CONNECTING_AIRPORTS,
} from "@/lib/constants/filters";

export function FlightFilters() {
  const {
    activeFiltersCount,
    filters,
    setFilter,
    resetFilter,
    availableAirlines,
    priceRange,
  } = useFilters();
  const baseFiltersArray = [
    "Stops",
    "Airlines",
    "Bags",
    "Price",
    "Times",
    "Emissions",
    "Connecting airports",
    "Duration",
  ];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [openPopovers, setOpenPopovers] = useState<Set<string>>(new Set());
  const stableFiltersRef = useRef<string[]>(baseFiltersArray);

  const handlePopoverOpenChange = (filterName: string, isOpen: boolean) => {
    setOpenPopovers((prev) => {
      const newSet = new Set(prev);
      if (isOpen) {
        newSet.add(filterName);
      } else {
        newSet.delete(filterName);
      }
      return newSet;
    });
  };

  const isAnyPopoverOpen = openPopovers.size > 0;
  const getStopsLabel = (value: string) => {
    const stopOption = STOP_OPTIONS.find((option) => option.value === value);
    return stopOption?.label || value;
  };

  const getAirlinesLabel = () => {
    // Check if we're in default state first
    if (isAirlinesDefault()) {
      return "Airlines";
    }

    const selectedItems = filters.airlines
      .map((code) => ALL_AIRLINE_ITEMS.find((item) => item.code === code))
      .filter(
        (item): item is { code: string; name: string } => item !== undefined
      );

    if (selectedItems.length === 0) {
      return "Airlines";
    }

    if (selectedItems.length === 1) {
      return selectedItems[0]?.name || "Airlines";
    }

    const additionalCount = selectedItems.length - 1;
    return `${selectedItems[0]?.name || "Airlines"} +${additionalCount}`;
  };

  const getDurationLabel = () => {
    if (filters.duration[0] === 0 && filters.duration[1] === 24) {
      return "Duration";
    }

    // Show the maximum duration selected
    return `Under ${filters.duration[1]} hr`;
  };

  const isDurationDefault = () => {
    return filters.duration[0] === 0 && filters.duration[1] === 24;
  };

  const getEmissionsLabel = () => {
    if (filters.emissions === "any") {
      return "Emissions";
    }

    return "Less emissions";
  };

  const isEmissionsDefault = () => {
    return filters.emissions === "any";
  };

  const getTimesLabel = () => {
    return "Times";
  };

  const isTimesDefault = () => {
    return (
      filters.times.outbound.departure[0] === 0 &&
      filters.times.outbound.departure[1] === 24 &&
      filters.times.outbound.arrival[0] === 0 &&
      filters.times.outbound.arrival[1] === 24 &&
      filters.times.return.departure[0] === 0 &&
      filters.times.return.departure[1] === 24 &&
      filters.times.return.arrival[0] === 0 &&
      filters.times.return.arrival[1] === 24
    );
  };

  const getPriceLabel = () => {
    if (
      filters.priceRange === Infinity ||
      filters.priceRange >= priceRange.max
    ) {
      return "Price";
    }

    return `up to $${filters.priceRange.toLocaleString()}`;
  };

  const isPriceDefault = () => {
    // If price is Infinity (initial state), consider it default
    if (filters.priceRange === Infinity) {
      return true;
    }
    return filters.priceRange >= priceRange.max;
  };

  const getBagsLabel = () => {
    if (filters.bags.carryOn === 0) {
      return "Bags";
    }

    return `${filters.bags.carryOn} carry-on bag${filters.bags.carryOn > 1 ? "s" : ""}`;
  };

  const isBagsDefault = () => {
    return filters.bags.carryOn === 0;
  };

  const isAirlinesDefault = () => {
    // If no airlines are selected yet (initial state), consider it default
    if (filters.airlines.length === 0) {
      return true;
    }

    // Get current available airline codes (dynamic list)
    const availableAirlineCodes =
      availableAirlines.length > 0
        ? availableAirlines.map((a) => a.code)
        : DEFAULT_AIRLINE_CODES;

    // Check if all available airlines are selected (which is the default state)
    return (
      filters.airlines.length === availableAirlineCodes.length &&
      filters.airlines.every((code) => availableAirlineCodes.includes(code)) &&
      availableAirlineCodes.every((code) => filters.airlines.includes(code))
    );
  };

  const getConnectingAirportsLabel = () => {
    const hasStopoverDuration =
      filters.stopoverDuration[0] !== 1 || filters.stopoverDuration[1] !== 24;
    const isDefaultAirports =
      filters.connectingAirports.length ===
        DEFAULT_CONNECTING_AIRPORT_CODES.length &&
      filters.connectingAirports.every((code) =>
        DEFAULT_CONNECTING_AIRPORT_CODES.includes(code)
      ) &&
      DEFAULT_CONNECTING_AIRPORT_CODES.every((code) =>
        filters.connectingAirports.includes(code)
      );

    // If both airports and stopover duration are in default state
    if (isDefaultAirports && !hasStopoverDuration) {
      return "Connecting airports";
    }

    // If stopover duration is set, show that
    if (hasStopoverDuration) {
      const [min, max] = filters.stopoverDuration;
      const isMinAny = min === 1;
      const isMaxAny = max === 24;

      // If both are at "Any" position
      if (isMinAny && isMaxAny) {
        // If airports are not in default, show airport names
        if (!isDefaultAirports) {
          return getAirportsLabel();
        }
        return "Connecting airports";
      }

      const formatHours = (hours: number) => {
        if (hours === 1) return "1 hr";
        if (hours % 1 === 0) return `${hours} hrs`;
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        return `${wholeHours} hrs ${minutes} min`;
      };

      // If min is set but max is at "Any"
      if (!isMinAny && isMaxAny) {
        return `Stopover: Min ${formatHours(min)}`;
      }

      // If max is set but min is at "Any"
      if (isMinAny && !isMaxAny) {
        return `Stopover: Max ${formatHours(max)}`;
      }

      // If both min and max are set (not at "Any")
      return `Stopover: ${formatHours(min)}-${formatHours(max)}`;
    }

    // If only airports are selected (stopover duration is at "Any")
    if (!isDefaultAirports && !hasStopoverDuration) {
      return getAirportsLabel();
    }

    return "Connecting airports";
  };

  const getAirportsLabel = () => {
    const selectedAirports = filters.connectingAirports;
    if (selectedAirports.length === 0) {
      return "Connecting airports";
    }

    // Find the airport names for selected codes
    const selectedAirportItems = selectedAirports
      .map((code) =>
        CONNECTING_AIRPORTS.find((airport) => airport.code === code)
      )
      .filter(
        (item): item is { code: string; name: string } => item !== undefined
      );

    if (selectedAirportItems.length === 0) {
      return "Connecting airports";
    }

    if (selectedAirportItems.length === 1) {
      return selectedAirportItems[0]?.name || "Connecting airports";
    }

    const additionalCount = selectedAirportItems.length - 1;
    return `${selectedAirportItems[0]?.name || "Connecting airports"} +${additionalCount}`;
  };

  const isConnectingAirportsDefault = () => {
    return (
      filters.connectingAirports.length ===
        DEFAULT_CONNECTING_AIRPORT_CODES.length &&
      filters.connectingAirports.every((code) =>
        DEFAULT_CONNECTING_AIRPORT_CODES.includes(code)
      ) &&
      DEFAULT_CONNECTING_AIRPORT_CODES.every((code) =>
        filters.connectingAirports.includes(code)
      ) &&
      filters.stopoverDuration[0] === 1 &&
      filters.stopoverDuration[1] === 24
    );
  };

  const isFilterActive = (filterName: string) => {
    switch (filterName) {
      case "Stops":
        return filters.stops !== "any";
      case "Airlines":
        return !isAirlinesDefault();
      case "Bags":
        return !isBagsDefault();
      case "Price":
        return !isPriceDefault();
      case "Times":
        return !isTimesDefault();
      case "Emissions":
        return !isEmissionsDefault();
      case "Connecting airports":
        return !isConnectingAirportsDefault();
      case "Duration":
        return filters.duration[0] !== 0 || filters.duration[1] !== 24;
      default:
        return false;
    }
  };

  // Update stable order only when all popups are closed
  if (!isAnyPopoverOpen) {
    const sortedFilters = [
      ...baseFiltersArray.filter(isFilterActive),
      ...baseFiltersArray.filter((filter) => !isFilterActive(filter)),
    ];
    stableFiltersRef.current = sortedFilters;
  }

  // Always use the stable order to prevent rearranging during popup interactions
  const filtersArray = stableFiltersRef.current;

  const checkOverflow = () => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth, scrollLeft } =
        scrollContainerRef.current;
      const hasOverflow = scrollWidth > clientWidth;
      setShowNavigation(hasOverflow);
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, []);

  useEffect(() => {
    checkOverflow();
  }, [filtersArray]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: "smooth" });
      setTimeout(checkOverflow, 300);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: "smooth" });
      setTimeout(checkOverflow, 300);
    }
  };

  const renderFilterContent = (filterName: string) => {
    switch (filterName) {
      case "Stops":
        return <StopsFilter />;
      case "Airlines":
        return <AirlinesFilter />;
      case "Bags":
        return <BagsFilter />;
      case "Price":
        return <PriceFilter />;
      case "Times":
        return <TimesFilter />;
      case "Emissions":
        return <EmissionsFilter />;
      case "Connecting airports":
        return <ConnectingAirportsFilter />;
      case "Duration":
        return <DurationFilter />;
      default:
        return (
          <div className="w-[360px] bg-[#303134] text-white p-4 rounded-lg border border-[#5f6368]">
            <h3 className="text-base font-medium mb-4">{filterName}</h3>
            <p className="text-gray-400 text-sm">
              Filter options coming soon...
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* All Filters - Fixed Position */}
      <Popover
        open={openPopovers.has("AllFilters")}
        onOpenChange={(isOpen) => handlePopoverOpenChange("AllFilters", isOpen)}
      >
        <PopoverTrigger asChild>
          <button className="bg-[#202124] border-transparent text-[#8AB4F8] px-3 py-1.5 text-sm flex items-center gap-3 hover:bg-[#27282B] transition-colors flex-shrink-0 rounded-full">
            <SlidersHorizontal className="w-4 h-4" />
            All filters{activeFiltersCount > 0 && ` (${activeFiltersCount})`}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 bg-transparent border-none shadow-lg"
          align="start"
        >
          <AllFiltersPopup />
        </PopoverContent>
      </Popover>

      {/* Scrollable Filters Container */}
      <div className="flex items-center flex-1 min-w-0 relative">
        {/* Scrollable Filters */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          onScroll={checkOverflow}
        >
          {filtersArray.map((filter) => (
            <Popover
              key={filter}
              open={openPopovers.has(filter)}
              onOpenChange={(isOpen) => handlePopoverOpenChange(filter, isOpen)}
            >
              <PopoverTrigger asChild>
                {filter === "Stops" ? (
                  <button
                    className={`${
                      filters.stops !== "any"
                        ? "bg-[#3F4A5E] text-white"
                        : "bg-[#202124] border-[#5f6368] text-[#BDC1C6] hover:bg-[#27282B] border"
                    } px-2 py-1 text-sm rounded-lg flex items-center gap-2 transition-colors flex-shrink-0 whitespace-nowrap`}
                  >
                    {filters.stops !== "any"
                      ? getStopsLabel(filters.stops)
                      : filter}
                    {filters.stops !== "any" ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          resetFilter("stops");
                        }}
                        className="ml-1 hover:bg-[#4A5568] rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="18px"
                        viewBox="0 -960 960 960"
                        width="18px"
                        fill="#e3e3e3"
                      >
                        <path d="M480-360 280-560h400L480-360Z" />
                      </svg>
                    )}
                  </button>
                ) : filter === "Airlines" ? (
                  <button
                    className={`${
                      !isAirlinesDefault()
                        ? "bg-[#3F4A5E] text-white"
                        : "bg-[#202124] border-[#5f6368] text-[#BDC1C6] hover:bg-[#27282B] border"
                    } px-2 py-1 text-sm rounded-lg flex items-center gap-2 transition-colors flex-shrink-0 whitespace-nowrap`}
                  >
                    {getAirlinesLabel()}
                    {!isAirlinesDefault() ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          resetFilter("airlines");
                        }}
                        className="ml-1 hover:bg-[#4A5568] rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="18px"
                        viewBox="0 -960 960 960"
                        width="18px"
                        fill="#e3e3e3"
                      >
                        <path d="M480-360 280-560h400L480-360Z" />
                      </svg>
                    )}
                  </button>
                ) : filter === "Bags" ? (
                  <button
                    className={`${
                      !isBagsDefault()
                        ? "bg-[#3F4A5E] text-white"
                        : "bg-[#202124] border-[#5f6368] text-[#BDC1C6] hover:bg-[#27282B] border"
                    } px-2 py-1 text-sm rounded-lg flex items-center gap-2 transition-colors flex-shrink-0 whitespace-nowrap`}
                  >
                    {getBagsLabel()}
                    {!isBagsDefault() ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          resetFilter("bags");
                        }}
                        className="ml-1 hover:bg-[#4A5568] rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="18px"
                        viewBox="0 -960 960 960"
                        width="18px"
                        fill="#e3e3e3"
                      >
                        <path d="M480-360 280-560h400L480-360Z" />
                      </svg>
                    )}
                  </button>
                ) : filter === "Price" ? (
                  <button
                    className={`${
                      !isPriceDefault()
                        ? "bg-[#3F4A5E] text-white"
                        : "bg-[#202124] border-[#5f6368] text-[#BDC1C6] hover:bg-[#27282B] border"
                    } px-2 py-1 text-sm rounded-lg flex items-center gap-2 transition-colors flex-shrink-0 whitespace-nowrap`}
                  >
                    {getPriceLabel()}
                    {!isPriceDefault() ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilter("priceRange", Infinity); // Set to Infinity to show all prices
                        }}
                        className="ml-1 hover:bg-[#4A5568] rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="18px"
                        viewBox="0 -960 960 960"
                        width="18px"
                        fill="#e3e3e3"
                      >
                        <path d="M480-360 280-560h400L480-360Z" />
                      </svg>
                    )}
                  </button>
                ) : filter === "Times" ? (
                  <button
                    className={`${
                      !isTimesDefault()
                        ? "bg-[#3F4A5E] text-white"
                        : "bg-[#202124] border-[#5f6368] text-[#BDC1C6] hover:bg-[#27282B] border"
                    } px-2 py-1 text-sm rounded-lg flex items-center gap-2 transition-colors flex-shrink-0 whitespace-nowrap`}
                  >
                    {getTimesLabel()}
                    {!isTimesDefault() ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          resetFilter("times");
                        }}
                        className="ml-1 hover:bg-[#4A5568] rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="18px"
                        viewBox="0 -960 960 960"
                        width="18px"
                        fill="#e3e3e3"
                      >
                        <path d="M480-360 280-560h400L480-360Z" />
                      </svg>
                    )}
                  </button>
                ) : filter === "Emissions" ? (
                  <button
                    className={`${
                      !isEmissionsDefault()
                        ? "bg-[#3F4A5E] text-white"
                        : "bg-[#202124] border-[#5f6368] text-[#BDC1C6] hover:bg-[#27282B] border"
                    } px-2 py-1 text-sm rounded-lg flex items-center gap-2 transition-colors flex-shrink-0 whitespace-nowrap`}
                  >
                    {getEmissionsLabel()}
                    {!isEmissionsDefault() ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          resetFilter("emissions");
                        }}
                        className="ml-1 hover:bg-[#4A5568] rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="18px"
                        viewBox="0 -960 960 960"
                        width="18px"
                        fill="#e3e3e3"
                      >
                        <path d="M480-360 280-560h400L480-360Z" />
                      </svg>
                    )}
                  </button>
                ) : filter === "Duration" ? (
                  <button
                    className={`${
                      !isDurationDefault()
                        ? "bg-[#3F4A5E] text-white"
                        : "bg-[#202124] border-[#5f6368] text-[#BDC1C6] hover:bg-[#27282B] border"
                    } px-2 py-1 text-sm rounded-lg flex items-center gap-2 transition-colors flex-shrink-0 whitespace-nowrap`}
                  >
                    {getDurationLabel()}
                    {!isDurationDefault() ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          resetFilter("duration");
                        }}
                        className="ml-1 hover:bg-[#4A5568] rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="18px"
                        viewBox="0 -960 960 960"
                        width="18px"
                        fill="#e3e3e3"
                      >
                        <path d="M480-360 280-560h400L480-360Z" />
                      </svg>
                    )}
                  </button>
                ) : filter === "Connecting airports" ? (
                  <button
                    className={`${
                      !isConnectingAirportsDefault()
                        ? "bg-[#3F4A5E] text-white"
                        : "bg-[#202124] border-[#5f6368] text-[#BDC1C6] hover:bg-[#27282B] border"
                    } px-2 py-1 text-sm rounded-lg flex items-center gap-2 transition-colors flex-shrink-0 whitespace-nowrap`}
                  >
                    {getConnectingAirportsLabel()}
                    {!isConnectingAirportsDefault() ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          resetFilter("connectingAirports");
                          resetFilter("stopoverDuration");
                        }}
                        className="ml-1 hover:bg-[#4A5568] rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="18px"
                        viewBox="0 -960 960 960"
                        width="18px"
                        fill="#e3e3e3"
                      >
                        <path d="M480-360 280-560h400L480-360Z" />
                      </svg>
                    )}
                  </button>
                ) : (
                  <button className="bg-[#202124] border-[#5f6368] text-[#BDC1C6] hover:bg-[#27282B] p-2 text-sm rounded-lg flex border items-center gap-3 flex-shrink-0 whitespace-nowrap">
                    {filter}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="18px"
                      viewBox="0 -960 960 960"
                      width="18px"
                      fill="#e3e3e3"
                    >
                      <path d="M480-360 280-560h400L480-360Z" />
                    </svg>
                  </button>
                )}
              </PopoverTrigger>
              <PopoverContent
                className="p-0 bg-transparent border-none shadow-lg"
                align="start"
              >
                {renderFilterContent(filter)}
              </PopoverContent>
            </Popover>
          ))}
        </div>

        {/* Navigation Buttons - Absolutely Positioned */}
        {showNavigation && canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-[#202124] rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {showNavigation && canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-[#202124] rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
