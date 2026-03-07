"use client";

import React, { useEffect, useRef } from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isWithinInterval,
  isAfter,
  addDays,
  subDays,
  addYears,
} from "date-fns";
import { DateButton } from "@/components/date-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { motion } from "framer-motion";
import { generateFlights, type Cabin } from "@/lib/flightGen";
import { useAirportLookup } from "@/hooks/use-airport-lookup";
import { shouldHighlightPrice } from "@/lib/utils";
import { usePopoverState } from "@/hooks/use-popover-state";

interface CalendarPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departureDate: Date | undefined;
  returnDate: Date | undefined;
  onSelectDeparture: (date?: Date) => void;
  onSelectReturn: (date?: Date) => void;
  tripType: string;
  setTripType: React.Dispatch<React.SetStateAction<string>>;
  initialSelectingMode?: "departure" | "return";
  fromLocation?: string; // Add fromLocation prop
  toLocation?: string; // Add toLocation prop
  flightSegments?: Array<{ id: string; from: string; to: string; date?: Date }>;
  travelClass?: string; // Add travel class prop
}

export function CalendarPopup({
  open,
  onOpenChange,
  departureDate,
  returnDate,
  onSelectDeparture,
  onSelectReturn,
  tripType,
  setTripType,
  initialSelectingMode = "departure",
  fromLocation,
  toLocation,
  flightSegments,
  travelClass = "economy", // Default to economy if not provided
}: CalendarPopupProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [verticalOffsetPx, setVerticalOffsetPx] = useState(0);
  const [isPositioned, setIsPositioned] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Wrapper function to set current month and trigger price calculation if needed
  const setCurrentMonthAndCalculate = React.useCallback((month: Date, shouldTriggerCalculation = true) => {
    setCurrentMonth(month);
    if (shouldTriggerCalculation && open && fromLocation && toLocation) {
      setShouldCalculatePrices(true);
    }
  }, [open, fromLocation, toLocation]);
  const [selectingMode, setSelectingMode] = useState<"departure" | "return">(
    initialSelectingMode
  );
  const [clickedButton, setClickedButton] = useState<"departure" | "return" | null>(null);
  const tripTypePopover = usePopoverState();
  
  // Animation state for month transitions
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [animationKey, setAnimationKey] = useState(0);
  const [previousMonth, setPreviousMonth] = useState<Date | null>(null);
  
  // Price calculation state
  const [priceCache, setPriceCache] = useState<Map<string, number>>(new Map());
  const [isCalculatingPrices, setIsCalculatingPrices] = useState(false);
  const [allVisiblePrices, setAllVisiblePrices] = useState<number[]>([]);
  const [hasCalculatedOnce, setHasCalculatedOnce] = useState(false);
  const [lastRouteKey, setLastRouteKey] = useState<string>("");
  const [shouldCalculatePrices, setShouldCalculatePrices] = useState(false);
  const [lastCalculatedMonth, setLastCalculatedMonth] = useState<Date | null>(null);

  // Use the server-side airport lookup hook
  const { lookupAirport } = useAirportLookup();

  // Dynamic pricing function using actual flight generation logic
  const getDynamicPrice = React.useCallback(async (date: Date) => {
    try {
      // Extract IATA codes from locations
      const originCode = await lookupAirport(fromLocation, "SFO");
      const destCode = await lookupAirport(toLocation, "ORD");
      
      // Convert travel class to match generateFlights format
      const cabin = (travelClass || "economy").replace("-", "_").toUpperCase() as Cabin;
      
      // Use a more efficient approach: generate only one flight to get base pricing
      // This avoids the overhead of generating multiple flights when we only need the price
      const flights = generateFlights({
        origin: originCode,
        dest: destCode,
        date: format(date, "yyyy-MM-dd"),
        cabin: cabin
      });
      
      // Return the lowest price if flights exist, otherwise null
      if (flights.length > 0) {
        return Math.min(...flights.map(f => f.priceUsd));
      }
      
      return null;
    } catch {
      // Return null on error to show no price available
      return null;
    }
  }, [lookupAirport, fromLocation, toLocation, travelClass]);

  // Add effect to update selectingMode when popup opens
  useEffect(() => {
    if (open) {
      setSelectingMode(initialSelectingMode);
      setClickedButton(null); // Clear selection when popup opens
      setCurrentMonthAndCalculate(new Date(), false); // Reset to current month when opening
      setAnimationKey(0); // Reset animation state to prevent slide-in on open
      setShouldCalculatePrices(true); // Trigger initial price calculation
    }
  }, [open, initialSelectingMode, setCurrentMonthAndCalculate]);

  // Calculate prices when calendar opens, animation completes, or context changes
  useEffect(() => {
    if (!open || !fromLocation || !toLocation) {
      return;
    }

    // Determine if we should calculate prices
    const currentRouteKey = `${fromLocation}-${toLocation}-${travelClass}`;
    const routeChanged = lastRouteKey && lastRouteKey !== currentRouteKey;
    const shouldCalculate = shouldCalculatePrices || 
                           routeChanged ||
                           // Recalculate when travel class changes
                           (hasCalculatedOnce && lastRouteKey && !lastRouteKey.includes(travelClass)) ||
                           // Recalculate when visible month changes (but not during animation)
                           (lastCalculatedMonth && !isAnimating && 
                            (lastCalculatedMonth.getMonth() !== currentMonth.getMonth() || 
                             lastCalculatedMonth.getFullYear() !== currentMonth.getFullYear()));

    if (!shouldCalculate) {
      return;
    }

    const calculatePricesForVisibleDays = async () => {
      // Clear cache if route parameters changed
      const routeKey = `${fromLocation}-${toLocation}-${travelClass}`;
      
      if (lastRouteKey && lastRouteKey !== routeKey) {
        // Route changed, clear existing cache immediately
        setPriceCache(new Map());
        setHasCalculatedOnce(false);
        setLastCalculatedMonth(null); // Reset month tracking for new route
      }
      
      // Update route key
      setLastRouteKey(routeKey);
      setIsCalculatingPrices(true);
      
      try {
        const newPriceCache = new Map<string, number>();
        const prices: number[] = [];
        
        // Calculate prices for current month and next month (what's visible in calendar)
        const firstMonth = startOfMonth(currentMonth);
        const secondMonth = addMonths(firstMonth, 1);
        
        const firstMonthDays = eachDayOfInterval({ 
          start: firstMonth, 
          end: endOfMonth(firstMonth) 
        });
        const secondMonthDays = eachDayOfInterval({ 
          start: secondMonth, 
          end: endOfMonth(secondMonth) 
        });
        
        const allDays = [...firstMonthDays, ...secondMonthDays];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize time to avoid comparison issues
        const maxDate = addYears(today, 1);
        
        // Process in smaller batches to avoid blocking the main thread
        const batchSize = 10;
        const uncachedDays = allDays.filter(day => {
          // Include today and future dates, exclude past dates
          if (isBefore(day, today) || isAfter(day, maxDate)) {
            return false;
          }
          const dateKey = format(day, "yyyy-MM-dd");
          const existingPrice = priceCache.get(dateKey);
          // Only use cached price if route hasn't changed
          if (existingPrice !== undefined && lastRouteKey === routeKey) {
            newPriceCache.set(dateKey, existingPrice);
            prices.push(existingPrice);
            return false;
          }
          return true;
        });

        // Process uncached days in batches
        for (let i = 0; i < uncachedDays.length; i += batchSize) {
          const batch = uncachedDays.slice(i, i + batchSize);
          
          // Process batch
          for (const day of batch) {
            const dateKey = format(day, "yyyy-MM-dd");
            const price = await getDynamicPrice(day);
            
            if (price !== null) {
              newPriceCache.set(dateKey, price);
              prices.push(price);
            }
          }
          
          // Yield control back to the browser every batch
          if (i + batchSize < uncachedDays.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        setPriceCache(newPriceCache);
        setAllVisiblePrices(prices);
        setHasCalculatedOnce(true);
        setLastCalculatedMonth(currentMonth); // Track which month we calculated for
      } catch {
        // Failed to calculate prices
      } finally {
        setIsCalculatingPrices(false);
        setShouldCalculatePrices(false); // Reset the flag
      }
    };

    // Start price calculation immediately
    calculatePricesForVisibleDays();
  }, [open, fromLocation, toLocation, travelClass, shouldCalculatePrices, lastRouteKey, hasCalculatedOnce, currentMonth, isAnimating, lastCalculatedMonth, priceCache, getDynamicPrice]);

  // Reset calculation state when popup closes (but keep cache)
  useEffect(() => {
    if (!open) {
      setIsCalculatingPrices(false);
      setShouldCalculatePrices(false);
      setLastCalculatedMonth(null); // Reset month tracking
      // Don't clear cache - keep it for future use
      // Don't reset hasCalculatedOnce - we want to remember we've calculated before
    }
  }, [open]);

  // Close when clicking outside the popup
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      // If the trip type dropdown is open, don't close the calendar
      if (tripTypePopover.isOpen) return;
      const target = e.target as Element | null;
      if (!containerRef.current || !target) return;

      // If click is inside the calendar container, ignore
      if (containerRef.current.contains(target)) return;

      // If click is inside any portaled content we explicitly allow (e.g. trip-type dropdown), ignore
      if (target.closest('[data-keep-calendar-open="true"]')) return;
      const path = e.composedPath();
      if (path.some((el) => {
          return el instanceof Element && el.closest && el.closest('[data-keep-calendar-open="true"]');
        })) {
        return;
      }

      onOpenChange(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      // If the trip type dropdown is open, let it handle Escape first
      if (tripTypePopover.isOpen) return;
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onOpenChange, tripTypePopover.isOpen]);

  // Keep the popup within viewport vertically on open, and re-evaluate on size changes only
  useEffect(() => {
    if (!open) return;

    const GAP_PX = 8; // small gap from the viewport bottom

    const computeOffset = () => {
      const el = containerRef.current as HTMLDivElement | null;
      if (!el) return;
      // Temporarily remove transform so measurement isn't affected by previous offset
      const prevTransform = el.style.transform;
      el.style.transform = "none";
      const rect = el.getBoundingClientRect();
      const overflow = rect.bottom - window.innerHeight + GAP_PX;
      el.style.transform = prevTransform;
      setVerticalOffsetPx(overflow > 0 ? -overflow : 0);
      // Reveal after first measurement so the first painted frame is in the final spot
      setIsPositioned(true);
    };

    // Hide until we measure and set the offset
    setIsPositioned(false);
    const raf = requestAnimationFrame(computeOffset);

    // Observe size changes of the popup content (e.g., price calculations) and recompute
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => computeOffset());
      if (containerRef.current) ro.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [open]);

  // Update month view when popup opens or dates change
  useEffect(() => {
    if (!open) return;

    // If there's a departure date and we're in departure mode, or there's no return date
    if (
      (departureDate && selectingMode === "departure") ||
      (departureDate && !returnDate)
    ) {
      // Check if the departure date is in the current view (current month or next month)
      const departureMonth = departureDate.getMonth();
      const currentViewMonth = currentMonth.getMonth();
      const nextViewMonth = addMonths(currentMonth, 1).getMonth();

      // Only update the view if the departure date is not visible
      if (
        departureMonth !== currentViewMonth &&
        departureMonth !== nextViewMonth
      ) {
        setCurrentMonthAndCalculate(startOfMonth(departureDate));
      }
    }
    // If there's a return date and we're in return mode
    else if (returnDate && selectingMode === "return") {
      // Check if the return date is in the current view
      const returnMonth = returnDate.getMonth();
      const currentViewMonth = currentMonth.getMonth();
      const nextViewMonth = addMonths(currentMonth, 1).getMonth();

      // Only update the view if the return date is not visible
      if (returnMonth !== currentViewMonth && returnMonth !== nextViewMonth) {
        setCurrentMonthAndCalculate(startOfMonth(returnDate));
      }
    }
  }, [open, departureDate, returnDate, selectingMode, currentMonth, setCurrentMonthAndCalculate]);

  const nextMonth = addMonths(currentMonth, 1);
  const today = React.useMemo(() => {
    const currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0); // Normalize time to avoid comparison issues
    return currentDay;
  }, []);
  const currentMonthStart = React.useMemo(() => startOfMonth(today), [today]);
  const maxDate = React.useMemo(() => addYears(today, 1), [today]); // Add maximum date 1 year from today

  const navigateMonth = (direction: "prev" | "next") => {
    if (isAnimating) return; // Prevent multiple clicks during animation
    
    // Batch state updates to reduce re-renders
    const newMonth = direction === "prev" ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1);
    
    // Prevent going to months before current month or after max date
    if (
      (direction === "prev" && isBefore(newMonth, currentMonthStart)) ||
      (direction === "next" && isAfter(endOfMonth(newMonth), maxDate))
    ) {
      return;
    }
    
    // Use React's batch update to minimize re-renders
    React.startTransition(() => {
      setSlideDirection(direction === "prev" ? "right" : "left");
      setIsAnimating(true);
      setAnimationKey(prev => prev + 1);
      setPreviousMonth(currentMonth);
      setCurrentMonthAndCalculate(newMonth, false); // Don't trigger calculation here, animation will handle it
    });
    
    // Reset animation state after animation completes
    setTimeout(() => {
      setIsAnimating(false);
      setPreviousMonth(null);
      setShouldCalculatePrices(true); // Trigger price calculation AFTER animation
    }, 250); // Match the animation duration
  };

  const navigateDepartureDay = (direction: "prev" | "next") => {
    if (departureDate) {
      const newDate =
        direction === "prev"
          ? subDays(departureDate, 1)
          : addDays(departureDate, 1);

      // Don't allow navigating to days before today
      if (
        direction === "prev" &&
        isBefore(newDate, today) &&
        !isSameDay(newDate, today)
      ) {
        return;
      }

      // Don't allow selecting departure date after return date, unless they're the same
      if (
        returnDate &&
        isAfter(newDate, returnDate) &&
        !isSameDay(departureDate, returnDate)
      ) {
        return;
      }

      onSelectDeparture(newDate);

      // Only move both dates together for forward navigation when they're the same
      if (
        direction === "next" &&
        returnDate &&
        isSameDay(departureDate, returnDate)
      ) {
        onSelectReturn(newDate);
      }
    }
  };

  const navigateReturnDay = (direction: "prev" | "next") => {
    if (returnDate) {
      const newDate =
        direction === "prev" ? subDays(returnDate, 1) : addDays(returnDate, 1);

      // Don't allow selecting return date before departure date, unless they're the same
      if (
        departureDate &&
        isBefore(newDate, departureDate) &&
        !isSameDay(departureDate, returnDate)
      ) {
        return;
      }

      onSelectReturn(newDate);

      // For return date navigation, never move both dates together - only change the return date
    }
  };

  const handleDateClick = React.useCallback((date: Date) => {
    // Don't allow selecting dates more than 1 year in the future
    if (isAfter(date, maxDate)) {
      return;
    }

    if (selectingMode === "departure") {
      // Don't allow selecting past dates for departure
      if (isBefore(date, today) && !isSameDay(date, today)) {
        return;
      }

      // If selecting departure date after return date, update both
      if (returnDate && isAfter(date, returnDate)) {
        onSelectDeparture(date);
        onSelectReturn(date);
        if (tripType === "round-trip") {
          setSelectingMode("return");
        }
        return;
      }

      onSelectDeparture(date);
      if (tripType === "round-trip") {
        setSelectingMode("return");
      }
    } else {
      // Don't allow selecting return date before departure date
      if (departureDate && isBefore(date, departureDate)) {
        onSelectDeparture(date);
        // Keep focus on return selection
        return;
      }
      onSelectReturn(date);
      // // After selecting return date, switch back to departure mode
      if (tripType === "round-trip") {
        setSelectingMode("departure");
      }
    }

    // Check if the selected date is in the current view (current month or next month)
    const selectedMonth = date.getMonth();
    const currentViewMonth = currentMonth.getMonth();
    const nextViewMonth = addMonths(currentMonth, 1).getMonth();

    // Only update the view if the selected date is not visible
    if (selectedMonth !== currentViewMonth && selectedMonth !== nextViewMonth) {
              setCurrentMonthAndCalculate(startOfMonth(date));
    }
  }, [
    currentMonth,
    departureDate,
    maxDate,
    onSelectDeparture,
    onSelectReturn,
    returnDate,
    selectingMode,
    setCurrentMonthAndCalculate,
    today,
    tripType,
  ]);

  const isInRange = React.useCallback((date: Date) => {
    if (!departureDate || !returnDate) return false;
    return isWithinInterval(date, { start: departureDate, end: returnDate });
  }, [departureDate, returnDate]);

  // Main pricing function that uses cache first, then shows loading state
  const getPrice = React.useCallback((date: Date): number | null => {
    const dateKey = format(date, "yyyy-MM-dd");
    const cachedValue = priceCache.get(dateKey);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // If we haven't calculated once yet, or we're currently calculating, show loading state
    if (!hasCalculatedOnce || isCalculatingPrices) {
      return null;
    }
    
    // If no cached price and we've finished calculating, no flights available for this route/date
    return null;
  }, [priceCache, hasCalculatedOnce, isCalculatingPrices]);

  // Add function to check if all required fields are filled
  const shouldShowPrices = React.useCallback(
    () => Boolean(fromLocation && toLocation),
    [fromLocation, toLocation]
  );

  const renderMonth = React.useCallback((month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const firstDayOfWeek = monthStart.getDay();
    const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

    // Function to find segment destination for a given date
    const findSegmentDestination = (date: Date) => {
      if (!flightSegments || tripType !== "multi-city") return null;
      const segment = flightSegments.find(
        (s) => s.date && isSameDay(s.date, date)
      );
      return segment?.to || null;
    };

    return (
      <div className="flex-1 h-[380px]">
        <div className="text-center text-xl font-medium text-white mb-6">
          {format(month, "MMMM") +
            (month.getFullYear() !== new Date().getFullYear()
              ? " " + month.getFullYear()
              : "")}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-sm text-gray-400 py-2 font-medium"
            >
              {day[0]}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="h-[44px]" />
          ))}

          {days.map((day) => {
            const isDeparture = departureDate && isSameDay(day, departureDate);
            const isReturn = returnDate && isSameDay(day, returnDate);
            const isPast =
              isBefore(day, new Date()) && !isSameDay(day, new Date());
            const isFuture = isAfter(day, maxDate);
            const isTodayOrFuture = !isPast;
            const inRange = isInRange(day);
            const hasFullRange = Boolean(departureDate && returnDate);
            const destination = findSegmentDestination(day);
            const isSegmentDate = destination !== null;

            let buttonClass =
              "relative z-10 flex flex-col items-center justify-center h-[44px] w-[44px] p-0 m-0 text-sm font-medium transition-none border-2 border-transparent rounded-full ";

            if (isPast || isFuture) {
              buttonClass +=
                "text-[#9BA0A6] cursor-not-allowed hover:bg-transparent";
            } else if (
              isDeparture &&
              (selectingMode === "departure" || !returnDate)
            ) {
              buttonClass +=
                "bg-[#8AB4F8] text-custom-gray-700 hover:bg-[#8AB4F8]";
            } else if (isReturn && selectingMode === "return") {
              buttonClass +=
                "bg-[#8AB4F8] text-custom-gray-700 hover:bg-[#8AB4F8]";
            } else if (
              isDeparture &&
              selectingMode === "return" &&
              returnDate
            ) {
              buttonClass +=
                "bg-transparent text-white border-2 border-[#8AB4F8] hover:border-[#8AB4F8]";
            } else if (isReturn && selectingMode === "departure") {
              buttonClass +=
                "bg-transparent text-white border-2 border-[#8AB4F8] hover:border-[#8AB4F8]";
            } else if (inRange) {
              // Middle of a selected range: keep the button transparent; background is rendered by the row-wide underlay
              buttonClass += "text-white border-0 bg-transparent";
            } else if (isSegmentDate) {
              buttonClass +=
                "text-white border-2 border-[#8AB4F8] hover:border-[#8AB4F8]";
            } else {
              buttonClass +=
                "text-[#9BA0A6] hover:text-white hover:border-[#8AB4F8]";
            }

            // Show price if all required fields are filled and not in multi-city mode
            const showPrice =
              shouldShowPrices() &&
              !isPast &&
              !isFuture &&
              tripType !== "multi-city";
            const price = showPrice ? getPrice(day) : null;
            const isLoadingPrice = showPrice && price === null && (isCalculatingPrices || !hasCalculatedOnce);
            const isPriceHighlighted = price !== null && shouldHighlightPrice(price, allVisiblePrices);

            // Underlay for the entire in-range span and for endpoints, so adjacent days touch within a row
            const isSameStartEndDay =
              Boolean(departureDate && returnDate) &&
              (departureDate && returnDate
                ? isSameDay(departureDate, returnDate)
                : false);
            const showRangeBackground =
              !isSameStartEndDay && (inRange || (hasFullRange && (isDeparture || isReturn)));

            const isEndpointRing =
              (isDeparture && selectingMode === "return" && !!returnDate) ||
              (isReturn && selectingMode === "departure");

            return (
              <div key={day.toISOString()} className="relative h-[44px] w-full">
                {showRangeBackground && (
                  <div
                    className={`bg-[#394457] absolute inset-0 pointer-events-none ${
                      hasFullRange && isDeparture && !isReturn
                        ? "left-1/2 right-0 inset-y-0"
                        : hasFullRange && isReturn && !isDeparture
                        ? "left-0 right-1/2 inset-y-0"
                        : "inset-0"
                    }`}
                  />
                )}

                {isEndpointRing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <div className="h-[44px] w-[44px] rounded-full bg-[#36373A]" />
                  </div>
                )}

                <Button
                  variant="ghost"
                  className={buttonClass}
                  onClick={() => !isPast && !isFuture && handleDateClick(day)}
                  disabled={isPast || isFuture}
                >
                  <div className="flex flex-col items-center w-full max-w-full px-1 relative z-10">
                    <span
                      className={`${
                        isDeparture || isReturn || isSegmentDate
                          ? "text-inherit"
                          : isPast
                          ? "text-[#9AA0A6]"
                          : isTodayOrFuture
                          ? "text-[#DADCE0]"
                          : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <span
                      className={`text-[10px] transition-all duration-300 h-4 flex items-center ${
                        showPrice
                          ? isLoadingPrice
                            ? "blur-[2px] text-[#9BA0A6] animate-pulse"
                            : ((isDeparture && (selectingMode === "departure" || !returnDate)) || (isReturn && selectingMode === "return"))
                            ? "text-[#202124] font-medium"
                            : isPriceHighlighted
                            ? "text-[#81C995] font-medium"
                            : "text-[#DADCE0]"
                          : "text-transparent"
                      }`}
                    >
                      {showPrice && price !== null ? `$${price}` : ""}
                    </span>
                    {destination && (
                      <span className="text-xs text-inherit w-full text-center overflow-hidden">
                        {destination}
                      </span>
                    )}
                  </div>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [
    departureDate, 
    returnDate, 
    selectingMode, 
    tripType, 
    flightSegments, 
    shouldShowPrices, 
    getPrice, 
    isCalculatingPrices, 
    allVisiblePrices, 
    handleDateClick, 
    hasCalculatedOnce,
    isInRange, 
    maxDate
  ]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="absolute -top-5 -right-5 z-50 max-w-3xl w-[768px] bg-[#36373A] text-white p-0 rounded-md shadow-[0_0_20px_rgba(0,0,0,0.3)] mr-4"
      style={{
        transform: verticalOffsetPx ? `translateY(${verticalOffsetPx}px)` : undefined,
        visibility: isPositioned ? "visible" : "hidden",
        pointerEvents: isPositioned ? "auto" : "none",
      }}
    >
      <div className="p-4">
        {/* Header matching the image exactly */}
        <div
          className={`flex items-center ${
            tripType === "multi-city" ? "justify-end" : "justify-between"
          } bg-[#36373A] p-4 -m-4 rounded-md`}
        >
            {/* Only show trip type dropdown if not in multi-city mode */}
            {tripType !== "multi-city" && (
              <Popover
                open={tripTypePopover.isOpen}
                onOpenChange={tripTypePopover.setIsOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="google-navbar"
                    className={`bg-[#36373A] hover:text-[#C2C6CA] ${
                      tripTypePopover.isOpen
                        ? "bg-[#4D5767] hover:bg-[#4D5767] border-b-2 border-b-[#8AACE5]"
                        : ""
                    }`}
                  >
                    {tripType === "round-trip" ? "Round trip" : "One-way"}
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
                  className="w-40 bg-[#303134] border-0 text-[#C2C6CA] py-1 px-0 rounded-none"
                  data-keep-calendar-open="true"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      className={`w-full rounded-none justify-start font-normal hover:bg-[#3E3E41] ${
                        tripType === "round-trip" ? "bg-[#43526A]" : ""
                      }`}
                      onClick={() => {
                        setTripType("round-trip");
                        tripTypePopover.close();
                      }}
                    >
                      <span className="w-4 mr-2 flex-shrink-0">
                        {tripType === "round-trip" && (
                          <Check className="h-4 w-4" />
                        )}
                      </span>
                      Round trip
                    </Button>
                    <Button
                      variant="ghost"
                      className={`w-full rounded-none justify-start font-normal hover:bg-[#3E3E41] ${
                        tripType === "one-way" ? "bg-[#43526A]" : ""
                      }`}
                      onClick={() => {
                        setTripType("one-way");
                        onSelectReturn(); // Clear return date when switching to one-way
                        tripTypePopover.close();
                        setSelectingMode("departure"); // Reset selection mode to departure
                      }}
                    >
                      <span className="w-4 mr-2 flex-shrink-0">
                        {tripType === "one-way" && (
                          <Check className="h-4 w-4" />
                        )}
                      </span>
                      One-way
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className={`rounded-full w-20 h-8 ${
                  !departureDate && !returnDate
                    ? "text-[#9BA0A6] cursor-not-allowed hover:bg-transparent"
                    : "text-blue-400 hover:text-blue-300 hover:bg-[#414248]"
                }`}
                onClick={() => {
                  onSelectDeparture();
                  onSelectReturn();
                  setSelectingMode("departure");
                }}
                disabled={!departureDate && !returnDate}
              >
                Reset
              </Button>

              {/* Center date buttons */}
              <div className="group flex items-center gap-0 rounded-md w-[400px]">
                {/* Departure Date Button */}
                <div className={tripType === "round-trip" ? "w-1/2" : "w-full"}>
                  <DateButton
                    date={departureDate}
                    label="Departure"
                    isActive={selectingMode === "departure"}
                    showCalendarIcon={true}
                    isStandalone={tripType === "one-way"}
                    onLeftChevronClick={() => {
                      navigateDepartureDay("prev")
                      setSelectingMode("departure");
                    }}
                    onRightChevronClick={() => {
                      navigateDepartureDay("next")
                      setSelectingMode("departure");
                    }}
                    onClick={() => {
                       setSelectingMode("departure");
                       setClickedButton(null);
                     }}
                    tripType="departure"
                    returnDate={returnDate}
                    departureDate={departureDate}
                    isEditable={true}
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
                      //  setSelectingMode("departure");
                     }}
                     isExternallySelected={clickedButton === "departure"}
                    onDateChange={(date) => {
                      if (isBefore(date, today) && !isSameDay(date, today)) {
                        return;
                      }
                      if (returnDate && isAfter(date, returnDate)) {
                        onSelectDeparture(date);
                        onSelectReturn(date);
                        if (tripType === "round-trip") {
                          setSelectingMode("return");
                        }
                        return;
                      }
                      onSelectDeparture(date);
                      // Only move both dates together for forward navigation when they're the same
                      if (
                        returnDate &&
                        departureDate &&
                        isSameDay(departureDate, returnDate) &&
                        isAfter(date, departureDate)
                      ) {
                        onSelectReturn(date);
                      }
                      if (tripType === "round-trip") {
                        setSelectingMode("return");
                      }
                    }}
                  />
                </div>

                {tripType === "round-trip" && (
                  <>
                    <div className="group-hover:hidden border-l border-[#5f6368] h-6"></div>

                    {/* Return Date Button */}
                    <div className="w-1/2">
                      <DateButton
                        date={returnDate}
                        label="Return"
                        isActive={selectingMode === "return"}
                        onLeftChevronClick={() => {
                          navigateReturnDay("prev")
                          setSelectingMode("return");
                        }}
                        onRightChevronClick={() => {
                          navigateReturnDay("next")
                          setSelectingMode("return");
                        }}
                        onClick={() => {
                           setSelectingMode("return");
                           setClickedButton(null);
                         }}
                        tripType="return"
                        returnDate={returnDate}
                        departureDate={departureDate}
                        isEditable={true}
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
                        onDateChange={(date) => {
                          if (departureDate && isBefore(date, departureDate)) {
                            onSelectDeparture(date);
                            return;
                          }
                          onSelectReturn(date);
                          // For return date changes, never move both dates together - only change the return date
                          if (tripType === "round-trip") {
                            setSelectingMode("departure");
                          }
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* horizontal line */}
          <div className="border-t border-[#5f6368] my-4 -m-4"></div>

          {/* Two month calendar */}
          <div className="mb-8 relative">
            {/* Navigation buttons - positioned above the motion div */}
            {currentMonth.getMonth() !== today.getMonth() && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth("prev")}
                className="bg-[#3C3D40] text-[#8AB4F8] hover:text-white absolute rounded-full top-1/2 -translate-y-1/2 -left-10 shadow-lg [&_svg]:!size-8 z-20"
              >
                <ChevronLeft />
              </Button>
            )}
            
            {!isAfter(endOfMonth(nextMonth), maxDate) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth("next")}
                className="bg-[#3C3D40] text-[#8AB4F8] hover:text-white absolute rounded-full top-1/2 -translate-y-1/2 -right-10 shadow-lg [&_svg]:!size-8 z-20"
              >
                <ChevronRight />
              </Button>
            )}

            {/* Calendar content with animation */}
            <div className="overflow-hidden relative">
              {isAnimating && previousMonth && (
                <motion.div
                  key={`previous-${animationKey}`}
                  initial={{ x: 0 }}
                  animate={{ x: slideDirection === "left" ? -400 : 400 }}
                  transition={{ 
                    duration: 0.25, 
                    ease: [0.4, 0.0, 0.2, 1], // Custom easing for smoother animation
                    type: "tween"
                  }}
                  className="flex gap-12 absolute inset-0"
                  style={{ willChange: "transform" }} // Optimize for GPU acceleration
                >
                  {renderMonth(previousMonth)}
                  {renderMonth(addMonths(previousMonth, 1))}
                </motion.div>
              )}
              
              <motion.div
                key={`current-${animationKey}`}
                initial={animationKey > 0 ? { x: slideDirection === "left" ? 400 : -400 } : false}
                animate={{ x: 0 }}
                transition={animationKey > 0 ? { 
                  duration: 0.25, 
                  ease: [0.4, 0.0, 0.2, 1], // Custom easing for smoother animation
                  type: "tween"
                } : { duration: 0 }}
                className="flex gap-12"
                style={{ willChange: "transform" }} // Optimize for GPU acceleration
              >
                {renderMonth(currentMonth)}
                {renderMonth(nextMonth)}
              </motion.div>
            </div>
          </div>

          {/* horizontal line */}
          <div className="border-t border-[#5f6368] mb-4 -m-4"></div>

          {/* Done button */}
          <div className="flex justify-end">
            <Button
              className="bg-[#8AB4F8] hover:bg-[#9EC1F9] text-[#394457] h-8 px-6 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>
    </div>
  );
}
