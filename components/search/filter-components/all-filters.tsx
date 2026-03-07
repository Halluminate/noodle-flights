"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PopoverClose } from "@/components/ui/popover";
import { GoogleToggle } from "@/components/ui/google-toggle";
import { Slider } from "@/components/ui/slider";
import { X, Plus, Minus, PlaneTakeoff, PlaneLanding } from "lucide-react";
import { useFilters } from "../../../providers/flight-filters-context";
import { useState } from "react";
import { CONNECTING_AIRPORTS } from "@/lib/constants/filters";
import { FilterToggleContainer } from "@/components/ui/filter-toggle";

export function AllFiltersPopup() {
  const {
    filters,
    setFilter,
    resetFilters,
    availableAirlines,
    priceRange,
  } = useFilters();
  const [isDraggingPrice, setIsDraggingPrice] = useState(false);
  const [isDraggingDuration, setIsDraggingDuration] = useState(false);
  const [isDraggingDeparture, setIsDraggingDeparture] = useState(false);
  const [isDraggingArrival, setIsDraggingArrival] = useState(false);
  const [isDraggingStopover, setIsDraggingStopover] = useState(false);
  const [activeTimesTab, setActiveTimesTab] = useState<"outbound" | "return">(
    "outbound"
  );

  // Stops options
  const stopOptions = [
    { value: "any", label: "Any number of stops" },
    { value: "nonstop", label: "Non-stop only" },
    { value: "one-or-fewer", label: "One stop or fewer" },
    { value: "two-or-fewer", label: "Two stops or fewer" },
  ] as const;

  // Airlines data
  const alliances = [
    { code: "oneworld", name: "Oneworld" },
    { code: "skyteam", name: "SkyTeam" },
    { code: "star-alliance", name: "Star Alliance" },
  ];

  // Use dynamic airlines from context, with fallback to popular airlines
  const airlines =
    availableAirlines.length > 0
      ? availableAirlines
      : [
          { code: "AF", name: "Air France" },
          { code: "AI", name: "Air India" },
          { code: "OS", name: "Austrian" },
          { code: "LH", name: "Lufthansa" },
          { code: "BA", name: "British Airways" },
          { code: "AA", name: "American Airlines" },
          { code: "DL", name: "Delta Air Lines" },
          { code: "UA", name: "United Airlines" },
          { code: "EK", name: "Emirates" },
          { code: "QR", name: "Qatar Airways" },
          { code: "SQ", name: "Singapore Airlines" },
          { code: "CX", name: "Cathay Pacific" },
          { code: "JL", name: "Japan Airlines" },
          { code: "NH", name: "ANA" },
          { code: "KL", name: "KLM" },
          { code: "IB", name: "Iberia" },
          { code: "AZ", name: "ITA Airways" },
          { code: "TK", name: "Turkish Airlines" },
          { code: "EY", name: "Etihad Airways" },
          { code: "VS", name: "Virgin Atlantic" },
        ];

  const airlineOnlyCodes = airlines.map((a) => a.code);
  const isAllAirlinesSelected = airlineOnlyCodes.every((code) =>
    filters.airlines.includes(code)
  );
  const allConnectingAirportsEnabled =
    filters.connectingAirports?.length === CONNECTING_AIRPORTS.length;

  // Check if stopover duration is in "Any" state (full range)
  const isStopoverAny =
    filters.stopoverDuration[0] === 1 && filters.stopoverDuration[1] === 24;

  // Helper functions
  const formatTime = (hour: number): string =>
    `${hour.toString().padStart(2, "0")}:00`;
  const formatTimeRange = (range: [number, number]): string => {
    if (range[0] === 0 && range[1] === 24) return "At any time";
    return `${formatTime(range[0])} - ${formatTime(range[1])}`;
  };
  const formatPriceText = (price: number) => {
    if (price === Infinity || price >= priceRange.max) return "All prices";
    return `up to $${price.toLocaleString()}`;
  };
  const formatDurationText = (maxDuration: number) => {
    if (maxDuration >= 24) return "Any";
    return `up to ${maxDuration}h`;
  };
  const formatStopoverText = (range: [number, number]) => {
    const [min, max] = range;
    const isMinAny = min === 1;
    const isMaxAny = max === 24;

    // If both are at "Any" position
    if (isMinAny && isMaxAny) {
      return "Any";
    }

    const formatHours = (hours: number) => {
      if (hours === 1) return "1 hr";
      if (hours % 1 === 0) return `${hours} hr`;
      const wholeHours = Math.floor(hours);
      const minutes = Math.round((hours - wholeHours) * 60);
      return `${wholeHours} hr ${minutes} min`;
    };

    // If min is set but max is at "Any"
    if (!isMinAny && isMaxAny) {
      return `Min ${formatHours(min)}`;
    }

    // If max is set but min is at "Any"
    if (isMinAny && !isMaxAny) {
      return `Max ${formatHours(max)}`;
    }

    // If both min and max are set (not at "Any")
    return `${formatHours(min)}-${formatHours(max)}`;
  };

  const formatHours = (hours: number) => {
    if (hours === 1) return "1 hr";
    if (hours % 1 === 0) return `${hours} hr`;
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours} hr ${minutes} min`;
  };

  // Event handlers
  const handleStopChange = (value: string) =>
    setFilter("stops", value as typeof filters.stops);
  const handleSelectAllAirlines = (checked: boolean) => {
    setFilter("airlines", checked ? airlineOnlyCodes : []);
  };
  const handleAllianceToggle = (code: string) => {
    const newAirlines = filters.airlines.includes(code)
      ? filters.airlines.filter((a) => a !== code)
      : [...filters.airlines, code];
    setFilter("airlines", newAirlines);
  };
  const handleAirlineToggle = (code: string) => {
    const newAirlines = filters.airlines.includes(code)
      ? filters.airlines.filter((a) => a !== code)
      : [...filters.airlines, code];
    setFilter("airlines", newAirlines);
  };
  const updateBagCount = (
    bagType: keyof typeof filters.bags,
    increment: boolean
  ) => {
    if (increment) {
      const newValue = Math.min(1, filters.bags[bagType] + 1);
      setFilter("bags", { ...filters.bags, [bagType]: newValue });
    } else {
      const newValue = Math.max(0, filters.bags[bagType] - 1);
      setFilter("bags", { ...filters.bags, [bagType]: newValue });
    }
  };
  const handlePriceChange = (value: number[]) =>
    setFilter("priceRange", value[0] ?? priceRange.max);
  const handleDepartureChange = (value: number[]) => {
    setFilter("times", {
      ...filters.times,
      [activeTimesTab]: {
        ...filters.times[activeTimesTab],
        departure: [value[0], value[1]] as [number, number],
      },
    });
  };
  const handleArrivalChange = (value: number[]) => {
    setFilter("times", {
      ...filters.times,
      [activeTimesTab]: {
        ...filters.times[activeTimesTab],
        arrival: [value[0], value[1]] as [number, number],
      },
    });
  };
  const handleEmissionChange = (value: string) => setFilter("emissions", value);
  const handleDurationChange = (value: number[]) =>
    setFilter("duration", [0, value[0] ?? 24]);
  const handleStopoverChange = (value: number[]) => {
    setFilter("stopoverDuration", value as [number, number]);
  };
  const handleAllAirportsToggle = (enabled: boolean) => {
    setFilter(
      "connectingAirports",
      enabled ? CONNECTING_AIRPORTS.map((airport) => airport.code) : []
    );
  };
  const handleAirportToggle = (airportCode: string) => {
    const currentAirports = filters.connectingAirports || [];
    const isSelected = currentAirports.includes(airportCode);
    if (isSelected) {
      setFilter(
        "connectingAirports",
        currentAirports.filter((code) => code !== airportCode)
      );
    } else {
      // If the current selection is all defaults, clear defaults and only select this airport
      if (allConnectingAirportsEnabled) {
        setFilter("connectingAirports", [airportCode]);
      } else {
        // Otherwise, add to the current selection
        const newAirports = [...currentAirports, airportCode];
        setFilter("connectingAirports", newAirports);
      }
    }
  };
  const handleOnlyAirport = (airportCode: string) => {
    // Select only this airport and deselect all others
    setFilter("connectingAirports", [airportCode]);
  };
  const handleOnlyAirline = (airlineCode: string) => {
    // Select only this airline and deselect all others
    setFilter("airlines", [airlineCode]);
  };
  const handleOnlyAlliance = (allianceCode: string) => {
    // Select only this alliance and deselect all others
    setFilter("airlines", [allianceCode]);
  };
  const handleClearAll = () => {
    resetFilters();
    // After resetting to defaults, set price range to Infinity to show all current flights
    setFilter("priceRange", Infinity);
  };
  const handleSeparateTicketsChange = (value: string) =>
    setFilter("separateTickets", value as "show" | "hide");

  return (
    <div className="w-[360px] bg-[#303134] text-white rounded-lg border-0 max-h-[70vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center p-6 pb-4 border-b border-[#5f6368] flex-shrink-0 relative">
        <h3 className="text-lg font-medium">Filters</h3>
        <PopoverClose asChild>
          <button className="absolute right-6 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </PopoverClose>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
        {/* Stops Section */}
        <div>
          <h4 className="text-base font-medium mb-4">Stops</h4>
          <div className="space-y-4 px-2">
            {stopOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="relative">
                  <input
                    type="radio"
                    name="stops"
                    value={option.value}
                    checked={filters.stops === option.value}
                    onChange={(e) => handleStopChange(e.target.value)}
                    className="sr-only"
                  />
                  <FilterToggleContainer>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        filters.stops === option.value
                          ? "border-[#AECBFA] bg-transparent"
                          : "border-gray-400"
                      }`}
                    >
                      {filters.stops === option.value && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#AECBFA]"></div>
                      )}
                    </div>
                  </FilterToggleContainer>
                </div>
                <span className="text-white text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Airlines Section */}
        <div className="border-t border-[#5f6368] pt-6">
          <h4 className="text-base font-medium mb-4">Airlines</h4>

          {/* Select All Toggle */}
          <div className="flex items-center justify-between mb-6">
            <Label htmlFor="select-all" className="text-gray-200 font-normal">
              Select all airlines
            </Label>
            <GoogleToggle
              checked={isAllAirlinesSelected}
              onCheckedChange={handleSelectAllAirlines}
            />
          </div>

          <div className="space-y-6">
            {/* Alliances */}
            <div>
              <h5 className="text-gray-400 text-sm font-medium mb-3">
                Alliances
              </h5>
              <div className="space-y-1 pl-4">
                {alliances.map((alliance) => (
                  <label
                    key={alliance.code}
                    className="h-12 flex items-center gap-3 cursor-pointer -mx-2 px-2 py-1 rounded group"
                  >
                    <Checkbox
                      id={alliance.code}
                      checked={filters.airlines.includes(alliance.code)}
                      onCheckedChange={() =>
                        handleAllianceToggle(alliance.code)
                      }
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
                        e.stopPropagation();
                        handleOnlyAlliance(alliance.code);
                      }}
                    >
                      Only
                    </Button>
                  </label>
                ))}
              </div>
            </div>

            {/* Airlines */}
            <div>
              <h5 className="text-gray-400 text-sm font-medium mb-3">
                Airlines
              </h5>
              <div className="space-y-1 pl-4">
                {airlines.map((airline) => (
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
                        e.stopPropagation();
                        handleOnlyAirline(airline.code);
                      }}
                    >
                      Only
                    </Button>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bags Section */}
        <div className="border-t border-[#5f6368] pt-6">
          <h4 className="text-base font-medium mb-4">Bags</h4>
          <div className="flex items-center justify-between">
            <Label className="text-white">Carry-on bag</Label>
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
              <span className="w-8 text-center">{filters.bags.carryOn}</span>
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
          <div className="mt-4">
            <button className="text-blue-400 hover:text-blue-300 text-sm underline">
              Learn more about bag selection
            </button>
          </div>
        </div>

        {/* Price Section */}
        <div className="border-t border-[#5f6368] pt-6">
          <h4 className="text-base font-medium mb-4">Price</h4>
          <div className="mb-4">
            <p className="text-[#8ab4f8] text-xs font-normal">
              {formatPriceText(filters.priceRange)}
            </p>
          </div>
          <div className="px-2 relative">
            <Slider
              value={[
                filters.priceRange === Infinity
                  ? priceRange.max
                  : filters.priceRange,
              ]}
              onValueChange={handlePriceChange}
              onValueCommit={() => setIsDraggingPrice(false)}
              onPointerDown={() => setIsDraggingPrice(true)}
              onPointerUp={() => setIsDraggingPrice(false)}
              max={priceRange.max}
              min={priceRange.min}
              step={50}
              className="w-full [&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]>.bg-secondary]:bg-[#5f6368] [&_[data-orientation=horizontal]_.bg-primary]:bg-[#8AB4F8] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-[#8AB4F8] [&_[role=slider]]:ring-0 [&_[role=slider]]:focus-visible:ring-0 [&_[role=slider]]:focus-visible:ring-offset-0"
            />
            {isDraggingPrice && (
              <div
                className="absolute -top-9 bg-[#AECBFA] text-[#202124] px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  left: `calc(${(((filters.priceRange === Infinity ? priceRange.max : filters.priceRange) - priceRange.min) / (priceRange.max - priceRange.min)) * 100}% - ${(((filters.priceRange === Infinity ? priceRange.max : filters.priceRange) - priceRange.min) / (priceRange.max - priceRange.min)) * 20}px + 10px)`,
                  transform: "translateX(-50%)",
                }}
              >
                $
                {(filters.priceRange === Infinity
                  ? priceRange.max
                  : filters.priceRange
                ).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Times Section */}
        <div className="border-t border-[#5f6368] pt-6">
          <h4 className="text-base font-medium mb-4">Times</h4>

          {/* Tabs */}
          <div className="flex border-b border-[#5f6368] mb-6">
            <button
              onClick={() => setActiveTimesTab("outbound")}
              className={`flex-1 p-3 text-sm font-medium border-b-2 transition-colors ${
                activeTimesTab === "outbound"
                  ? "text-white border-[#4285f4]"
                  : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              Outbound
            </button>
            <button
              onClick={() => setActiveTimesTab("return")}
              className={`flex-1 p-3 text-sm font-medium border-b-2 transition-colors ${
                activeTimesTab === "return"
                  ? "text-white border-[#4285f4]"
                  : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              Return
            </button>
          </div>

          <div className="space-y-6">
            {/* Route info */}
            <p className="text-gray-400 text-sm">Paris to Mumbai</p>

            {/* Departure */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PlaneTakeoff
                  className={`w-4 h-4 text-gray-400 ${activeTimesTab === "return" ? "-scale-x-100" : ""}`}
                />
                <span className="text-xs text-gray-300">Departure</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-[#83AAEA]">
                  {formatTimeRange(filters.times[activeTimesTab].departure)}
                </span>
              </div>
              <div className="px-2 relative">
                <Slider
                  value={filters.times[activeTimesTab].departure}
                  onValueChange={handleDepartureChange}
                  onValueCommit={() => setIsDraggingDeparture(false)}
                  onPointerDown={() => setIsDraggingDeparture(true)}
                  onPointerUp={() => setIsDraggingDeparture(false)}
                  max={24}
                  min={0}
                  step={1}
                  minStepsBetweenThumbs={1}
                  className="w-full [&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]>.bg-secondary]:bg-[#5f6368] [&_[data-orientation=horizontal]_.bg-primary]:bg-[#9DC0F9] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-[#9DC0F9] [&_[role=slider]]:ring-0 [&_[role=slider]]:focus-visible:ring-0 [&_[role=slider]]:focus-visible:ring-offset-0"
                />
                {isDraggingDeparture && (
                  <>
                    <div
                      className="absolute -top-9 bg-[#AECBFA] text-[#202124] px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        left: `calc(${(filters.times[activeTimesTab].departure[0] / 24) * 100}% - ${(filters.times[activeTimesTab].departure[0] / 24) * 20}px + 10px)`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      {formatTime(filters.times[activeTimesTab].departure[0])}
                    </div>
                    <div
                      className="absolute -top-9 bg-[#AECBFA] text-[#202124] px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        left: `calc(${(filters.times[activeTimesTab].departure[1] / 24) * 100}% - ${(filters.times[activeTimesTab].departure[1] / 24) * 20}px + 10px)`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      {formatTime(filters.times[activeTimesTab].departure[1])}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Arrival */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PlaneLanding
                  className={`w-4 h-4 text-gray-400 ${activeTimesTab === "return" ? "-scale-x-100" : ""}`}
                />
                <span className="text-xs text-gray-300">Arrival</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-[#83AAEA]">
                  {formatTimeRange(filters.times[activeTimesTab].arrival)}
                </span>
              </div>
              <div className="px-2 relative">
                <Slider
                  value={filters.times[activeTimesTab].arrival}
                  onValueChange={handleArrivalChange}
                  onValueCommit={() => setIsDraggingArrival(false)}
                  onPointerDown={() => setIsDraggingArrival(true)}
                  onPointerUp={() => setIsDraggingArrival(false)}
                  max={24}
                  min={0}
                  step={1}
                  minStepsBetweenThumbs={1}
                  className="w-full [&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]>.bg-secondary]:bg-[#5f6368] [&_[data-orientation=horizontal]_.bg-primary]:bg-[#9DC0F9] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-[#9DC0F9] [&_[role=slider]]:ring-0 [&_[role=slider]]:focus-visible:ring-0 [&_[role=slider]]:focus-visible:ring-offset-0"
                />
                {isDraggingArrival && (
                  <>
                    <div
                      className="absolute -top-9 bg-[#AECBFA] text-[#202124] px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        left: `calc(${(filters.times[activeTimesTab].arrival[0] / 24) * 100}% - ${(filters.times[activeTimesTab].arrival[0] / 24) * 20}px + 10px)`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      {formatTime(filters.times[activeTimesTab].arrival[0])}
                    </div>
                    <div
                      className="absolute -top-9 bg-[#AECBFA] text-[#202124] px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        left: `calc(${(filters.times[activeTimesTab].arrival[1] / 24) * 100}% - ${(filters.times[activeTimesTab].arrival[1] / 24) * 20}px + 10px)`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      {formatTime(filters.times[activeTimesTab].arrival[1])}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Emissions Section */}
        <div className="border-t border-[#5f6368] pt-6">
          <h4 className="text-base font-medium mb-4">Emissions</h4>
          <div className="space-y-4 px-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="emissions"
                  value="any"
                  checked={filters.emissions === "any"}
                  onChange={(e) => handleEmissionChange(e.target.value)}
                  className="sr-only"
                />
                <FilterToggleContainer>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      filters.emissions === "any"
                        ? "border-[#AECBFA] bg-transparent"
                        : "border-gray-400"
                    }`}
                  >
                    {filters.emissions === "any" && (
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
                  checked={filters.emissions === "less"}
                  onChange={(e) => handleEmissionChange(e.target.value)}
                  className="sr-only"
                />
                <FilterToggleContainer>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      filters.emissions === "less"
                        ? "border-[#AECBFA] bg-transparent"
                        : "border-gray-400"
                    }`}
                  >
                    {filters.emissions === "less" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#AECBFA]"></div>
                    )}
                  </div>
                </FilterToggleContainer>
              </div>
              <span className="text-white text-sm">Less emissions only</span>
            </label>
          </div>

          <div className="mt-4">
            <a
              href="#"
              className="text-[#8ab4f8] text-sm hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              Learn more about carbon emissions
            </a>
          </div>
        </div>

        {/* Duration Section */}
        <div className="border-t border-[#5f6368] pt-6">
          <h4 className="text-base font-medium mb-4">Duration</h4>
          <div className="mb-4">
            <p className="text-[#83AAEA] text-xs">
              Flight duration · {formatDurationText(filters.duration[1])}
            </p>
          </div>
          <div className="px-2 relative">
            <Slider
              value={[filters.duration[1]]}
              onValueChange={handleDurationChange}
              onValueCommit={() => setIsDraggingDuration(false)}
              onPointerDown={() => setIsDraggingDuration(true)}
              onPointerUp={() => setIsDraggingDuration(false)}
              max={24}
              min={1}
              step={1}
              className="w-full [&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]>.bg-secondary]:bg-[#5f6368] [&_[data-orientation=horizontal]_.bg-primary]:bg-[#9DC0F9] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-[#9DC0F9] [&_[role=slider]]:ring-0 [&_[role=slider]]:focus-visible:ring-0 [&_[role=slider]]:focus-visible:ring-offset-0"
            />
            {isDraggingDuration && (
              <div
                className="absolute -top-10 bg-[#AECBFA] text-[#202124] px-3 py-1.5 rounded-full text-xs font-medium w-fit text-center whitespace-nowrap"
                style={{
                  left: `calc(${((filters.duration[1] - 1) / (24 - 1)) * 100}% - ${((filters.duration[1] - 1) / (24 - 1)) * 20}px + 10px)`,
                  transform: "translateX(-50%)",
                }}
              >
                {filters.duration[1] >= 24
                  ? "Any"
                  : `Under ${filters.duration[1]} hr`}
              </div>
            )}
          </div>
        </div>

        {/* Connecting Airports Section */}
        <div className="border-t border-[#5f6368] pt-6">
          <h4 className="text-base font-medium mb-4">Connecting airports</h4>

          {/* Stopover Duration */}
          <div className="mb-6">
            <h5 className="text-white text-base mb-2">Stopover duration</h5>
            <p className="text-[#83AAEA] text-xs mb-6">
              {formatStopoverText(filters.stopoverDuration as [number, number])}
            </p>

            <div className="px-2 relative">
              <Slider
                value={filters.stopoverDuration}
                onValueChange={handleStopoverChange}
                onValueCommit={() => setIsDraggingStopover(false)}
                onPointerDown={() => setIsDraggingStopover(true)}
                onPointerUp={() => setIsDraggingStopover(false)}
                max={24}
                min={1}
                step={1}
                minStepsBetweenThumbs={1}
                className="w-full [&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]>.bg-secondary]:bg-[#5f6368] [&_[data-orientation=horizontal]_.bg-primary]:bg-[#9DC0F9] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-[#9DC0F9] [&_[role=slider]]:ring-0 [&_[role=slider]]:focus-visible:ring-0 [&_[role=slider]]:focus-visible:ring-offset-0"
              />
              {isDraggingStopover && (
                <>
                  <div
                    className="absolute -top-10 bg-[#AECBFA] text-[#202124] px-3 py-1.5 rounded-full text-xs font-medium w-fit text-center whitespace-nowrap"
                    style={{
                      left: `calc(${((filters.stopoverDuration[0] - 1) / (24 - 1)) * 100}% - ${((filters.stopoverDuration[0] - 1) / (24 - 1)) * 20}px + 10px)`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    {isStopoverAny
                      ? "Any"
                      : formatHours(filters.stopoverDuration[0])}
                  </div>
                  <div
                    className="absolute -top-10 bg-[#AECBFA] text-[#202124] px-3 py-1.5 rounded-full text-xs font-medium w-fit text-center whitespace-nowrap"
                    style={{
                      left: `calc(${((filters.stopoverDuration[1] - 1) / (24 - 1)) * 100}% - ${((filters.stopoverDuration[1] - 1) / (24 - 1)) * 20}px + 10px)`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    {isStopoverAny
                      ? "Any"
                      : formatHours(filters.stopoverDuration[1])}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* All Connecting Airports Toggle */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-white text-sm font-medium">
              All connecting airports
            </span>
            <GoogleToggle
              checked={allConnectingAirportsEnabled}
              onCheckedChange={handleAllAirportsToggle}
            />
          </div>

          {/* Airports List */}
          <div>
            <h5 className="text-gray-400 text-sm mb-3">Airports</h5>
            <div className="space-y-1 pl-4">
              {CONNECTING_AIRPORTS.map((airport) => (
                <label
                  key={airport.code}
                  className="h-12 flex items-center gap-3 cursor-pointer -mx-2 px-2 py-1 rounded group"
                >
                  <Checkbox
                    id={airport.code}
                    checked={
                      filters.connectingAirports?.includes(airport.code) ||
                      false
                    }
                    onCheckedChange={() => handleAirportToggle(airport.code)}
                    className="w-5 h-5 border-gray-400 data-[state=checked]:bg-[#AECBFA] data-[state=checked]:border-[#AECBFA] data-[state=checked]:text-[#5C697F]"
                  />
                  <span className="text-white text-sm">
                    {airport.name} ({airport.code})
                  </span>
                  <Button
                    variant="ghost"
                    className="text-[#83AAEA] text-sm hidden group-hover:block hover:bg-[#35373C] rounded-full ml-auto mr-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOnlyAirport(airport.code);
                    }}
                  >
                    Only
                  </Button>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Separate and Self Transfer Tickets Section */}
        <div className="border-t border-[#5f6368] pt-6">
          <h4 className="text-base font-medium mb-3">
            Separate and self transfer tickets
          </h4>

          <div className="mb-4">
            <p className="text-gray-400 text-sm leading-relaxed">
              It may be cheaper to buy flights as separate or self transfer
              tickets from one or more partners. Depending on the partner,
              separate and self transfer tickets may be booked separately or
              together.{" "}
              <a
                href="#"
                className="text-[#8ab4f8] underline hover:no-underline"
                onClick={(e) => e.preventDefault()}
              >
                Learn more
              </a>
            </p>
          </div>

          <div className="space-y-4 px-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="separateTickets"
                  value="show"
                  checked={filters.separateTickets === "show"}
                  onChange={(e) => handleSeparateTicketsChange(e.target.value)}
                  className="sr-only"
                />
                <FilterToggleContainer>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      filters.separateTickets === "show"
                        ? "border-[#AECBFA] bg-transparent"
                        : "border-gray-400"
                    }`}
                  >
                    {filters.separateTickets === "show" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#AECBFA]"></div>
                    )}
                  </div>
                </FilterToggleContainer>
              </div>
              <span className="text-white text-sm">
                Show separate and self transfer tickets
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="radio"
                  name="separateTickets"
                  value="hide"
                  checked={filters.separateTickets === "hide"}
                  onChange={(e) => handleSeparateTicketsChange(e.target.value)}
                  className="sr-only"
                />
                <FilterToggleContainer>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      filters.separateTickets === "hide"
                        ? "border-[#AECBFA] bg-transparent"
                        : "border-gray-400"
                    }`}
                  >
                    {filters.separateTickets === "hide" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#AECBFA]"></div>
                    )}
                  </div>
                </FilterToggleContainer>
              </div>
              <span className="text-white text-sm">
                Hide separate and self transfer tickets
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer with Clear All Button */}
      <div className="flex justify-end p-4 border-t border-[#5f6368] flex-shrink-0">
        <Button
          variant="ghost"
          onClick={handleClearAll}
          className="text-blue-400 hover:text-blue-300 hover:bg-transparent text-sm"
        >
          Clear all
        </Button>
      </div>
    </div>
  );
}
