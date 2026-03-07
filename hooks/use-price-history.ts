import { useMemo } from "react";
import { useFlight } from "@/providers/flight-provider";
import { useFlightData } from "@/hooks/use-flight-data";
import { generateFlightPriceData, FlightPriceData } from "@/lib/utils";
import { format, subDays, subWeeks, subMonths } from "date-fns";

interface PriceHistoryData {
  priceHistory: FlightPriceData[];
  currentPrice: number | null;
  historicalLow: number | null;
  historicalHigh: number | null;
  typicalPrice: number | null;
  isCurrentPriceHigh: boolean;
  isCurrentPriceLow: boolean;
  bestBookingPeriod: string;
  priceStatus: "low" | "typical" | "high";
  priceChangeFromLastWeek: number | null;
  priceChangeFromLastMonth: number | null;
}

/**
 * Hook to get dynamic price history data for the current search route
 * This replaces hardcoded values in the price banner with real data
 */
export function usePriceHistory(): PriceHistoryData {
  const { fromLocation, toLocation, departureDate, travelClass } = useFlight();
  const { flightData, isLoading } = useFlightData();

  const data = useMemo(() => {
    // If we don't have the required search parameters, return empty state
    if (!fromLocation || !toLocation || !departureDate) {
      return {
        priceHistory: [],
        currentPrice: null,
        historicalLow: null,
        historicalHigh: null,
        typicalPrice: null,
        isCurrentPriceHigh: false,
        isCurrentPriceLow: false,
        bestBookingPeriod: "1–3 months before takeoff",
        priceStatus: "typical" as const,
        priceChangeFromLastWeek: null,
        priceChangeFromLastMonth: null,
      };
    }

    // Generate historical price data for the past 60 days
    const historyStartDate = subDays(departureDate, 60);
    const historicalData = generateFlightPriceData(historyStartDate, travelClass, 60);

    // Get current price from live flight data if available
    const currentPrice = getCurrentPrice(flightData);

    // Calculate statistics from historical data
    const prices = historicalData.map(d => d.price);
    const historicalLow = Math.min(...prices);
    const historicalHigh = Math.max(...prices);
    const typicalPrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);

    // Determine price status
    const priceThresholds = {
      low: historicalLow + (typicalPrice - historicalLow) * 0.3,
      high: typicalPrice + (historicalHigh - typicalPrice) * 0.7,
    };

    const effectiveCurrentPrice = currentPrice || typicalPrice;
    const isCurrentPriceLow = effectiveCurrentPrice <= priceThresholds.low;
    const isCurrentPriceHigh = effectiveCurrentPrice >= priceThresholds.high;
    
    let priceStatus: "low" | "typical" | "high" = "typical";
    if (isCurrentPriceLow) priceStatus = "low";
    else if (isCurrentPriceHigh) priceStatus = "high";

    // Calculate price changes from previous periods
    const oneWeekAgo = subWeeks(new Date(), 1);
    const oneMonthAgo = subMonths(new Date(), 1);
    
    const oneWeekAgoPrice = findPriceForDate(historicalData, oneWeekAgo);
    const oneMonthAgoPrice = findPriceForDate(historicalData, oneMonthAgo);

    const priceChangeFromLastWeek = oneWeekAgoPrice && currentPrice 
      ? ((currentPrice - oneWeekAgoPrice) / oneWeekAgoPrice) * 100 
      : null;
    
    const priceChangeFromLastMonth = oneMonthAgoPrice && currentPrice 
      ? ((currentPrice - oneMonthAgoPrice) / oneMonthAgoPrice) * 100 
      : null;

    // Determine best booking period based on price trends
    const bestBookingPeriod = getBestBookingPeriod(historicalData, priceStatus);

    return {
      priceHistory: historicalData,
      currentPrice: effectiveCurrentPrice,
      historicalLow,
      historicalHigh,
      typicalPrice,
      isCurrentPriceHigh,
      isCurrentPriceLow,
      bestBookingPeriod,
      priceStatus,
      priceChangeFromLastWeek,
      priceChangeFromLastMonth,
    };
  }, [fromLocation, toLocation, departureDate, travelClass, flightData, isLoading]);

  return data;
}

/**
 * Extract current price from flight data
 */
function getCurrentPrice(flightData: any): number | null {
  if (!flightData.departingFlights || flightData.departingFlights.length === 0) {
    return null;
  }

  // Get the lowest price from current search results
  const prices = flightData.departingFlights
    .map((flight: any) => flight.priceUsd)
    .filter((price: number) => price > 0);

  return prices.length > 0 ? Math.min(...prices) : null;
}

/**
 * Find price for a specific date in historical data
 */
function findPriceForDate(historicalData: FlightPriceData[], targetDate: Date): number | null {
  const targetDateString = format(targetDate, "yyyy-MM-dd");
  const dataPoint = historicalData.find(d => d.date === targetDateString);
  return dataPoint?.price || null;
}

/**
 * Determine the best booking period based on price trends
 */
function getBestBookingPeriod(historicalData: FlightPriceData[], priceStatus: "low" | "typical" | "high"): string {
  const now = new Date();
  const currentMonth = now.getMonth();
  const isHighSeason = currentMonth >= 5 && currentMonth <= 8; // June to September

  // Analyze recent price trends
  const recentPrices = historicalData.slice(-14); // Last 14 days
  const isIncreasingTrend = recentPrices.length > 7 && 
    recentPrices.slice(-7).reduce((sum, d) => sum + d.price, 0) / 7 >
    recentPrices.slice(0, 7).reduce((sum, d) => sum + d.price, 0) / 7;

  if (priceStatus === "low") {
    return "now, while prices are low";
  } else if (priceStatus === "high" && isIncreasingTrend) {
    return "soon, before prices increase further";
  } else if (isHighSeason) {
    return "2–4 months before takeoff";
  } else {
    return "1–3 months before takeoff";
  }
}