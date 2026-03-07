"use client";

import { Button } from "@/components/ui/button";
import { PopoverClose } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";
import { useFilters } from "../../../providers/flight-filters-context";
import { useState, useEffect } from "react";

export function PriceFilter() {
  const { filters, setFilter, priceRange } = useFilters();
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(
    filters.priceRange === Infinity ? priceRange.max : filters.priceRange
  );

  const handlePriceChange = (value: number[]) => {
    // Only update local drag value during drag, not the actual filter
    setDragValue(value[0] ?? priceRange.max);
  };

  const handlePriceCommit = (value: number[]) => {
    // Update the actual filter only when dragging stops
    setFilter("priceRange", value[0] ?? priceRange.max);
    setIsDragging(false);
  };

  const handleClear = () => {
    setFilter("priceRange", Infinity); // Set to Infinity to show all prices
    setDragValue(priceRange.max); // Reset drag value to dynamic max
  };

  // Update drag value when filters change externally
  useEffect(() => {
    if (!isDragging) {
      setDragValue(
        filters.priceRange === Infinity ? priceRange.max : filters.priceRange
      );
    }
  }, [filters.priceRange, isDragging, priceRange.max]);

  const formatPriceText = (price: number) => {
    if (price === Infinity || price >= priceRange.max) {
      return "All prices";
    }
    return `up to $${price.toLocaleString()}`;
  };

  return (
    <div className="w-[360px] bg-[#303134] text-white p-6 rounded-lg border-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-medium">Price</h3>
        <PopoverClose asChild>
          <button className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </PopoverClose>
      </div>

      {/* Price Text */}
      <div className="mb-6">
        <p className="text-[#8ab4f8] text-xs font-normal">
          {formatPriceText(filters.priceRange)}
        </p>
      </div>

      {/* Price Slider */}
      <div className="px-2 relative">
        <div className="relative">
          <Slider
            value={[
              isDragging
                ? dragValue
                : filters.priceRange === Infinity
                  ? priceRange.max
                  : filters.priceRange,
            ]}
            onValueChange={handlePriceChange}
            onValueCommit={handlePriceCommit}
            onPointerDown={() => setIsDragging(true)}
            max={priceRange.max}
            min={priceRange.min}
            step={50}
            className="w-full [&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]>.bg-secondary]:bg-[#5f6368] [&_[data-orientation=horizontal]_.bg-primary]:bg-[#8AB4F8] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-[#8AB4F8] [&_[role=slider]]:ring-0 [&_[role=slider]]:focus-visible:ring-0 [&_[role=slider]]:focus-visible:ring-offset-0"
          />
          {/* Price tooltip above slider thumb - only show when dragging */}
          {isDragging && (
            <div
              className="absolute -top-9 bg-[#AECBFA] text-[#202124] px-2 py-1 rounded-full text-xs font-medium"
              style={{
                left: `calc(${((dragValue - priceRange.min) / (priceRange.max - priceRange.min)) * 100}% - ${((dragValue - priceRange.min) / (priceRange.max - priceRange.min)) * 20}px + 10px)`,
                transform: "translateX(-50%)",
              }}
            >
              ${dragValue.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Clear Button */}
      <div className="flex justify-end mt-6 pt-4">
        <Button
          variant="ghost"
          onClick={handleClear}
          className="text-blue-400 hover:text-blue-300 hover:bg-transparent text-sm"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
