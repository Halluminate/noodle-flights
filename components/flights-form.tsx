"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeftRight,
  ChevronDown,
  Minus,
  Plus,
  Search,
  User,
  Check,
} from "lucide-react";
import {
  format,
  subDays,
  addDays,
  isBefore,
  isAfter,
  isSameDay,
} from "date-fns";
import { CalendarPopup } from "@/components/calendar-popup";
import { LocationInput } from "./location-input";
import { DateButton } from "@/components/date-button";
import { motion } from "framer-motion";
import { useFlight, type PassengerCounts } from "@/providers/flight-provider";
import {
  usePopoverState,
  usePopoverWithTempState,
} from "@/hooks/use-popover-state";

interface FlightsFormProps {
  hideSearchButton?: boolean;
}

const FlightsForm = ({ hideSearchButton = false }: FlightsFormProps) => {
  const pathname = usePathname();
  const {
    tripType,
    setTripType,
    fromLocation,
    setFromLocation,
    toLocation,
    setToLocation,
    departureDate,
    returnDate,
    setReturnDate,
    passengers,
    setPassengers,
    travelClass,
    setTravelClass,
    flightSegments,
    totalPassengers,
    today,
    maxDate,
    updateFlightSegment,
    addFlightSegment,
    removeFlightSegment,
    swapLocations,
    swapSegmentLocations,
    hasMultipleLocations,
    isSwapDisabled,
    setFromLocationAndTriggerSearch,
    setToLocationAndTriggerSearch,
    setDepartureDateAndTriggerSearch,
    setReturnDateAndTriggerSearch,
    setPassengersAndTriggerSearch,
    setTravelClassAndTriggerSearch,
    navigateToSearchWithState,
  } = useFlight();

  // Popover state management using custom hooks
  const tripTypePopover = usePopoverState();
  const travelClassPopover = usePopoverState();
  const passengerPopover = usePopoverWithTempState(
    passengers,
    pathname === "/search"
      ? (newPassengers: PassengerCounts) => {
          setPassengersAndTriggerSearch(newPassengers);
        }
      : setPassengers,
    false, // initialOpen
    true // autoSaveOnClose - automatically save changes when popover is closed
  );

  const [selectingDepartureDate, setSelectingDepartureDate] = useState(true);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [clickedButton, setClickedButton] = useState<
    "departure" | "return" | null
  >(null);

  const [isRotated, setIsRotated] = useState(false);

  // Add hover state management for location inputs
  const [isFromLocationHovered, setIsFromLocationHovered] = useState(false);
  const [isToLocationHovered, setIsToLocationHovered] = useState(false);

  // Add click state management for location inputs
  const [isFromLocationClicked, setIsFromLocationClicked] = useState(false);
  const [isToLocationClicked, setIsToLocationClicked] = useState(false);

  // Local input state for search page to avoid updating global state on every keystroke
  const [fromLocal, setFromLocal] = useState(fromLocation);
  const [toLocal, setToLocal] = useState(toLocation);
  useEffect(() => {
    if (pathname !== "/search") return;
    setFromLocal(fromLocation);
  }, [fromLocation, pathname]);
  useEffect(() => {
    if (pathname !== "/search") return;
    setToLocal(toLocation);
  }, [toLocation, pathname]);

  const totalPassengersDisplay = passengerPopover.isOpen
    ? passengerPopover.tempValue.adults +
      passengerPopover.tempValue.children +
      passengerPopover.tempValue.infants +
      passengerPopover.tempValue.lapInfants
    : totalPassengers;

  const getTotalPassengers = (counts: PassengerCounts) => {
    return counts.adults + counts.children + counts.infants + counts.lapInfants;
  };

  const updatePassengerCount = (
    type: keyof PassengerCounts,
    increment: boolean
  ) => {
    passengerPopover.setTempValue((prev) => {
      // If incrementing, check if we would exceed 9 total passengers
      if (increment && getTotalPassengers(prev) >= 9) {
        return prev;
      }
      return {
        ...prev,
        [type]: increment
          ? prev[type] + 1
          : Math.max(type === "adults" ? 1 : 0, prev[type] - 1),
      };
    });
  };

  const handleSwapLocations = () => {
    if (isSwapDisabled) return;
    setIsRotated(!isRotated);
    swapLocations();
  };

  // Helper functions for click states
  const handleFromLocationClick = () => {
    setIsFromLocationClicked(true);
    setTimeout(() => setIsFromLocationClicked(false), 200);
  };

  const handleToLocationClick = () => {
    setIsToLocationClicked(true);
    setTimeout(() => setIsToLocationClicked(false), 200);
  };

  // Helper function to generate swap button border classes
  const getSwapButtonBorderClasses = () => {
    if (isFromLocationClicked) {
      return "border-l-2 border-l-[#669DF6] border-r-2 border-r-[#5f6368]";
    }
    if (isToLocationClicked) {
      return "border-r-2 border-r-[#669DF6] border-l-2 border-l-[#5f6368]";
    }
    if (isFromLocationHovered) {
      return "border-l-2 border-l-[#9AA0A6] border-r-2 border-r-[#5f6368]";
    }
    if (isToLocationHovered) {
      return "border-r-2 border-r-[#9AA0A6] border-l-2 border-l-[#5f6368]";
    }
    return "border-[#5f6368] border-x-2";
  };

  const handleDepartureSelect = (date?: Date) => {
    setDepartureDateAndTriggerSearch(date);
  };

  const handleReturnSelect = (date?: Date) => {
    setReturnDateAndTriggerSearch(date);
  };

  // Determine if we should show "Search" instead of "Explore"
  const shouldShowSearch = () => {
    if (tripType === "multi-city") {
      // For multi-city, all segments should have both locations filled and be single airports
      return flightSegments.every(
        (segment) =>
          segment.from &&
          segment.to &&
          !hasMultipleLocations(segment.from) &&
          !hasMultipleLocations(segment.to)
      );
    } else {
      // For round-trip and one-way, both locations should be filled and be single airports
      return (
        fromLocation &&
        toLocation &&
        !hasMultipleLocations(fromLocation) &&
        !hasMultipleLocations(toLocation)
      );
    }
  };

  // Check if dates are missing
  const areDatesMissing = () => {
    if (tripType === "multi-city") {
      return flightSegments.some((segment) => !segment.date);
    } else if (tripType === "round-trip") {
      return !departureDate || !returnDate;
    } else {
      return !departureDate;
    }
  };

  const handleSearchClick = () => {
    // Check if dates are missing and we have valid locations
    if (shouldShowSearch() && areDatesMissing()) {
      if (tripType === "multi-city") {
        // For multi-city, open calendar for the first segment without a date
        const firstSegmentWithoutDate = flightSegments.find(
          (segment) => !segment.date
        );
        if (firstSegmentWithoutDate) {
          setActiveSegmentId(firstSegmentWithoutDate.id);
          setShowCalendarPopup(true);
        }
      } else {
        // For regular trips, open calendar for departure (or return if departure exists)
        if (!departureDate) {
          setSelectingDepartureDate(true);
        } else if (tripType === "round-trip" && !returnDate) {
          setSelectingDepartureDate(false);
        }
        setShowCalendarPopup(true);
      }
      return; // Don't navigate to results
    }

    // If all is good or we're in explore mode, navigate to search with state
    navigateToSearchWithState();
  };

  const tripTypeOptions = [
    { value: "round-trip", label: "Round trip" },
    { value: "one-way", label: "One-way" },
  ];

  const travelClassOptions = [
    { value: "economy", label: "Economy" },
    { value: "premium-economy", label: "Premium economy" },
    { value: "business", label: "Business" },
    { value: "first", label: "First" },
  ];

  return (
    <>
      {/* Header Controls */}
      <div className="flex items-center gap-2 mb-2">
        {/* Trip Type Selector */}
        <Popover
          open={tripTypePopover.isOpen}
          onOpenChange={tripTypePopover.setIsOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="google-navbar"
              className={`font-normal ${
                tripTypePopover.isOpen
                  ? "bg-[#4D5767] hover:bg-[#4D5767] border-b-2 border-b-[#8AACE5]"
                  : ""
              }`}
            >
              <ArrowLeftRight className="h-4 w-4" />
              {
                tripTypeOptions.find((option) => option.value === tripType)
                  ?.label
              }
              <motion.div
                animate={{ rotate: tripTypePopover.isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                <ChevronDown className="size-4" />
              </motion.div>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-40 bg-[#343438] border-0 text-[#C2C6CA] py-1 px-0 rounded-none"
          >
            <div className="space-y-1">
              {tripTypeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  className={`w-full rounded-none justify-start font-normal hover:bg-[#3C3D40] ${
                    tripType === option.value
                      ? "bg-[#394457] hover:bg-[#3C485F]"
                      : ""
                  }`}
                  onClick={() => {
                    setTripType(option.value);
                    // If switching to round-trip and no return date is set, set a default return date
                    // but only on the search page, not on the main page
                    if (
                      option.value === "round-trip" &&
                      !returnDate &&
                      departureDate &&
                      pathname === "/search"
                    ) {
                      // Set return date to 4 days after departure date by default
                      const defaultReturnDate = addDays(departureDate, 4);
                      // Ensure the return date doesn't exceed the max date
                      const finalReturnDate = isAfter(
                        defaultReturnDate,
                        maxDate
                      )
                        ? maxDate
                        : defaultReturnDate;
                      setReturnDate(finalReturnDate);
                    }
                    tripTypePopover.close();
                  }}
                >
                  <span className="w-4 mr-2 flex-shrink-0">
                    {tripType === option.value && <Check className="h-4 w-4" />}
                  </span>
                  {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Passenger Selector */}
        <Popover
          open={passengerPopover.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              passengerPopover.close(); // Use close() to trigger auto-save
            } else {
              passengerPopover.open();
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="google-navbar"
              className={`font-normal ${
                passengerPopover.isOpen
                  ? "bg-[#4D5767] hover:bg-[#4D5767] border-b-2 border-b-[#8AACE5]"
                  : ""
              }`}
            >
              <User className="h-4 w-4" />
              {totalPassengersDisplay}
              <motion.div
                animate={{ rotate: passengerPopover.isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="size-4" />
              </motion.div>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-80 bg-[#303134] border-0 text-[#A2A8AF]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[#A2A8AF]">Adults</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePassengerCount("adults", false)}
                    disabled={passengerPopover.tempValue.adults <= 1}
                    className="h-8 w-8 p-0 bg-[#4B4C50] border-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-[#A2A8AF]">
                    {passengerPopover.tempValue.adults}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePassengerCount("adults", true)}
                    disabled={
                      getTotalPassengers(passengerPopover.tempValue) >= 9
                    }
                    className="h-8 w-8 p-0 bg-[#3E495E] border-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[#A2A8AF]">Children</Label>
                  <p className="text-sm text-slate-400">Aged 2–11</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePassengerCount("children", false)}
                    disabled={passengerPopover.tempValue.children <= 0}
                    className="h-8 w-8 p-0 bg-[#4B4C50] border-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-[#A2A8AF]">
                    {passengerPopover.tempValue.children}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePassengerCount("children", true)}
                    disabled={
                      getTotalPassengers(passengerPopover.tempValue) >= 9
                    }
                    className="h-8 w-8 p-0 bg-[#3E495E] border-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[#A2A8AF]">Infants</Label>
                  <p className="text-sm text-slate-400">In seat</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePassengerCount("infants", false)}
                    disabled={passengerPopover.tempValue.infants <= 0}
                    className="h-8 w-8 p-0 bg-[#4B4C50] border-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-[#A2A8AF]">
                    {passengerPopover.tempValue.infants}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePassengerCount("infants", true)}
                    disabled={
                      getTotalPassengers(passengerPopover.tempValue) >= 9
                    }
                    className="h-8 w-8 p-0 bg-[#3E495E] border-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[#A2A8AF]">Infants</Label>
                  <p className="text-sm text-slate-400">On lap</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePassengerCount("lapInfants", false)}
                    disabled={passengerPopover.tempValue.lapInfants <= 0}
                    className="h-8 w-8 p-0 bg-[#4B4C50] border-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-[#A2A8AF]">
                    {passengerPopover.tempValue.lapInfants}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePassengerCount("lapInfants", true)}
                    disabled={
                      getTotalPassengers(passengerPopover.tempValue) >= 9
                    }
                    className="h-8 w-8 p-0 bg-[#3E495E] border-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={passengerPopover.cancel}
                  className="flex-1 text-[#8AB4F8] hover:bg-transparent hover:text-[#8AB4F8]"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={passengerPopover.confirm}
                  className="flex-1 text-[#8AB4F8] hover:bg-transparent hover:text-[#8AB4F8]"
                >
                  Done
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Class Selector */}
        <Popover
          open={travelClassPopover.isOpen}
          onOpenChange={travelClassPopover.setIsOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="google-navbar"
              className={`w-30 font-normal ${
                travelClassPopover.isOpen
                  ? "bg-[#4D5767] hover:bg-[#4D5767] border-b-2 border-b-[#8AACE5]"
                  : ""
              }`}
            >
              {
                travelClassOptions.find(
                  (option) => option.value === travelClass
                )?.label
              }
              <motion.div
                animate={{ rotate: travelClassPopover.isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                <ChevronDown className="size-4" />
              </motion.div>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-52 bg-[#343438] border-0 text-[#C2C6CA] py-1 px-0 rounded-none"
          >
            <div className="space-y-1">
              {travelClassOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  className={`rounded-none w-full justify-start font-normal hover:bg-[#3C3D40] ${
                    travelClass === option.value
                      ? "bg-[#394457] hover:bg-[#3C485F]"
                      : ""
                  }`}
                  onClick={() => {
                    if (pathname === "/search") {
                      setTravelClassAndTriggerSearch(option.value);
                    } else {
                      setTravelClass(option.value);
                    }
                    travelClassPopover.close();
                  }}
                >
                  <span className="w-4 mr-2 flex-shrink-0">
                    {travelClass === option.value && (
                      <Check className="h-4 w-4" />
                    )}
                  </span>
                  {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Search Form */}
      {tripType === "multi-city" ? (
        <div className="space-y-4">
          {flightSegments.map((segment, index) => (
            <div key={segment.id} className="flex gap-4 h-full">
              {/* Location Inputs */}
              <div className="relative flex-1 flex-grow">
                <div className="flex gap-4 h-full">
                  <LocationInput
                    value={segment.from}
                    onChange={(value) =>
                      updateFlightSegment(segment.id, "from", value)
                    }
                    placeholder="Where from?"
                  />

                  <LocationInput
                    value={segment.to}
                    onChange={(value) =>
                      updateFlightSegment(segment.id, "to", value)
                    }
                    placeholder="Where to?"
                    isDestination={true}
                  />
                </div>

                {/* Swap Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => swapSegmentLocations(segment.id)}
                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 p-2 rounded-full border-y-0 hover:text-[#C2C6CA] cursor-default ${pathname === "/search" ? "bg-[#202124] hover:bg-[#202124]" : "bg-[#36373A] hover:bg-[#36373A]"}`}
                >
                  <div
                    className={`absolute h-full w-4 ${pathname === "/search" ? "bg-[#202124] hover:bg-[#202124]" : "bg-[#36373A] hover:bg-[#36373A]"}`}
                  ></div>
                  <ArrowLeftRight className="h-4 w-4 z-10 text-[#5f6368]" />
                </Button>
              </div>

              {/* Date Input */}
              <div className="relative min-w-[200px] w-[200px] border border-[#5f6368] rounded-md overflow-hidden">
                <DateButton
                  date={segment.date}
                  label={
                    segment.date
                      ? format(segment.date, "EEE d MMM")
                      : `Flight ${index + 1}`
                  }
                  showCalendarIcon={true}
                  tripType="departure"
                  onLeftChevronClick={() => {
                    if (segment.date) {
                      updateFlightSegment(
                        segment.id,
                        "date",
                        subDays(segment.date, 1)
                      );
                    }
                  }}
                  onRightChevronClick={() => {
                    if (segment.date) {
                      updateFlightSegment(
                        segment.id,
                        "date",
                        addDays(segment.date, 1)
                      );
                    }
                  }}
                  onClick={() => {
                    setShowCalendarPopup(true);
                    setActiveSegmentId(segment.id);
                  }}
                  className="w-full bg-transparent rounded-none border-none hover:text-[#C2C6CA]"
                  isEditable={true}
                  returnDate={returnDate}
                  departureDate={segment.date}
                  canNavigateBack={
                    segment.date
                      ? !isBefore(subDays(segment.date, 1), today)
                      : true
                  }
                  canNavigateForward={
                    segment.date
                      ? !isAfter(addDays(segment.date, 1), maxDate)
                      : true
                  }
                />
                {activeSegmentId === segment.id && (
                  <CalendarPopup
                    open={showCalendarPopup}
                    onOpenChange={(open) => {
                      setShowCalendarPopup(open);
                      if (!open) setActiveSegmentId(null);
                    }}
                    departureDate={
                      flightSegments.find((s) => s.id === activeSegmentId)?.date
                    }
                    returnDate={returnDate}
                    onSelectDeparture={(date) => {
                      if (activeSegmentId && date) {
                        updateFlightSegment(activeSegmentId, "date", date);
                      }
                    }}
                    onSelectReturn={() => {}}
                    tripType="multi-city"
                    setTripType={() => {}}
                    initialSelectingMode="departure"
                    fromLocation={
                      flightSegments.find((s) => s.id === activeSegmentId)
                        ?.from || ""
                    }
                    toLocation={
                      flightSegments.find((s) => s.id === activeSegmentId)
                        ?.to || ""
                    }
                    flightSegments={flightSegments}
                    travelClass={travelClass}
                  />
                )}
              </div>

              {/* Remove Button */}
              {flightSegments.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFlightSegment(segment.id)}
                  className="text-[#C2C6CA] hover:text-red-400 hover:bg-transparent p-2 my-auto"
                >
                  ✕
                </Button>
              )}
            </div>
          ))}

          {/* Add Flight Button */}
          <div className="flex justify-start">
            <Button
              variant="outline"
              onClick={addFlightSegment}
              className="bg-[#A6C5F8] text-[#36373A] hover:bg-[#7BA3E7] border-0 rounded-full px-6"
            >
              Add flight
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 mb-2">
          {/* Location Inputs */}
          <div className="relative flex-1 flex-grow">
            <div className="flex gap-4 h-full">
              <LocationInput
                value={pathname === "/search" ? fromLocal : fromLocation}
                onChange={
                  pathname === "/search" ? setFromLocal : setFromLocation
                }
                onCommit={(value) => {
                  if (pathname === "/search") {
                    setFromLocal(value);
                    setFromLocationAndTriggerSearch(value);
                  } else {
                    setFromLocationAndTriggerSearch(value);
                  }
                }}
                placeholder="Where from?"
                onHoverChange={setIsFromLocationHovered}
                isHovered={isFromLocationHovered}
                onClick={handleFromLocationClick}
                isClicked={isFromLocationClicked}
              />

              <LocationInput
                value={pathname === "/search" ? toLocal : toLocation}
                onChange={pathname === "/search" ? setToLocal : setToLocation}
                onCommit={(value) => {
                  if (pathname === "/search") {
                    setToLocal(value);
                    setToLocationAndTriggerSearch(value);
                  } else {
                    setToLocationAndTriggerSearch(value);
                  }
                }}
                placeholder="Where to?"
                isDestination={true}
                onHoverChange={setIsToLocationHovered}
                isHovered={isToLocationHovered}
                onClick={handleToLocationClick}
                isClicked={isToLocationClicked}
              />
            </div>
            {/* Swap Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwapLocations}
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 !w-[40px] !h-[38px] p-0 rounded-full border-0.5 transition-colors duration-200 cursor-default ${getSwapButtonBorderClasses()} ${pathname === "/search" ? "bg-[#202124] hover:bg-[#202124]" : "bg-[#36373A] hover:bg-[#36373A]"}`}
            >
              <div
                className={`absolute h-[38px] w-[15.5px] ${pathname === "/search" ? "bg-[#202124] hover:bg-[#202124]" : "bg-[#36373A] hover:bg-[#36373A]"}`}
              ></div>
              <motion.div
                animate={{ rotate: isRotated ? 180 : 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                }}
                className="w-full h-full flex items-center justify-center relative z-10"
              >
                <svg
                  fill="currentColor"
                  focusable="false"
                  className="text-[#5f6368] !w-6 !h-6"
                  width={24}
                  height={24}
                >
                  <path d="M17 4l-1.41 1.41L18.17 8H11v2h7.17l-2.58 2.59L17 14l5-5-5-5zM7 20l1.41-1.41L5.83 16H13v-2H5.83l2.58-2.59L7 10l-5 5 5 5z"></path>
                </svg>
              </motion.div>
            </Button>
          </div>

          {/* Date Inputs */}
          <div className="relative group w-[400px] flex items-center gap-0 rounded-md h-full">
            {/* Departure Date Button */}
            <div className={tripType === "round-trip" ? "w-1/2" : "w-full"}>
              <DateButton
                tripType="departure"
                date={departureDate}
                label="Departure"
                showCalendarIcon={true}
                isStandalone={tripType === "one-way"}
                onLeftChevronClick={() => {
                  if (departureDate) {
                    const newDate = subDays(departureDate, 1);
                    handleDepartureSelect(newDate);
                    // For backward navigation, only change departure date (don't move return)
                  }
                }}
                onRightChevronClick={() => {
                  if (departureDate) {
                    const newDate = addDays(departureDate, 1);
                    handleDepartureSelect(newDate);
                    // If departure and return dates are the same, move both together
                    if (returnDate && isSameDay(departureDate, returnDate)) {
                      handleReturnSelect(newDate);
                    }
                  }
                }}
                onClick={() => {
                  setSelectingDepartureDate(true);
                  setShowCalendarPopup(true);
                }}
                returnDate={returnDate}
                departureDate={departureDate}
                canNavigateBack={
                  departureDate
                    ? !isBefore(subDays(departureDate, 1), today)
                    : true
                }
                canNavigateForward={
                  departureDate
                    ? (!returnDate ||
                        isSameDay(departureDate, returnDate) ||
                        !isAfter(addDays(departureDate, 1), returnDate)) &&
                      !isAfter(addDays(departureDate, 1), maxDate)
                    : true
                }
                onSelectionChange={(isSelected) => {
                  setClickedButton(isSelected || null);
                }}
                isExternallySelected={clickedButton === "departure"}
              />
            </div>

            {tripType === "round-trip" && (
              <>
                <div className="border-l border-[#5f6368] h-6 group-hover:hidden -mx-[1px]"></div>

                {/* Return Date Button */}
                <div className="w-1/2">
                  <DateButton
                    tripType="return"
                    date={returnDate}
                    label="Return"
                    onLeftChevronClick={() => {
                      if (returnDate) {
                        const newDate = subDays(returnDate, 1);
                        // Don't allow selecting return date before departure date
                        if (departureDate && isBefore(newDate, departureDate)) {
                          return;
                        }
                        handleReturnSelect(newDate);
                        // For backward navigation, only change return date (don't move departure)
                      }
                    }}
                    onRightChevronClick={() => {
                      if (returnDate) {
                        handleReturnSelect(addDays(returnDate, 1));
                      }
                    }}
                    onClick={() => {
                      setSelectingDepartureDate(false);
                      setShowCalendarPopup(true);
                    }}
                    returnDate={returnDate}
                    departureDate={departureDate}
                    canNavigateBack={
                      returnDate && departureDate
                        ? !isBefore(subDays(returnDate, 1), departureDate)
                        : true
                    }
                    canNavigateForward={
                      returnDate
                        ? !isAfter(addDays(returnDate, 1), maxDate)
                        : true
                    }
                    onSelectionChange={(isSelected) => {
                      setClickedButton(isSelected || null);
                    }}
                    isExternallySelected={clickedButton === "return"}
                  />
                </div>
              </>
            )}
            {/* Inline calendar popover anchored to date inputs */}
            <CalendarPopup
              open={showCalendarPopup}
              onOpenChange={setShowCalendarPopup}
              departureDate={departureDate}
              returnDate={returnDate}
              onSelectDeparture={handleDepartureSelect}
              onSelectReturn={handleReturnSelect}
              tripType={tripType}
              setTripType={setTripType}
              initialSelectingMode={
                selectingDepartureDate ? "departure" : "return"
              }
              fromLocation={fromLocation}
              toLocation={toLocation}
              travelClass={travelClass}
            />
          </div>

          {/* Calendar Popup moved inline above; removed global modal instance */}
        </div>
      )}

      {/* Per-segment calendar is rendered inline next to the segment's date input */}

      {!hideSearchButton && (
        <Button
          onClick={handleSearchClick}
          className="absolute hover:bg-[#A6C5F8] text-black bg-[#7BA3E7] border-0 rounded-full px-6 flex items-center gap-2 -bottom-5 right-1/2 transform translate-x-1/2"
        >
          <Search className="h-4 w-4" />
          <span>{shouldShowSearch() ? "Search" : "Explore"}</span>
        </Button>
      )}
    </>
  );
};

export default FlightsForm;
