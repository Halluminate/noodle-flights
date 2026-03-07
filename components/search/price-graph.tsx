"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts"

import { useFlight } from "@/providers/flight-provider"
import { generateFlightPriceData, FlightPriceData } from "@/lib/utils"
import { Minus, Plus, PlaneTakeoff, ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react"

export const description = "An interactive bar chart"

interface BarTooltipProps {
  data: FlightPriceData
  isVisible: boolean
  position: { x: number; y: number }
  type?: "selected" | "hover"
  localDepartureDate?: Date
  localReturnDate?: Date
  setLocalReturnDate?: React.Dispatch<React.SetStateAction<Date | undefined>>
  setHasLocalChanges?: React.Dispatch<React.SetStateAction<boolean>>
  isOutsideRange?: boolean
  side?: "left" | "right"
}

const BarTooltip = ({
  data,
  isVisible,
  position,
  type = "hover",
  localDepartureDate,
  localReturnDate,
  setLocalReturnDate,
  setHasLocalChanges,
  isOutsideRange = false,
  side = "left"
}: BarTooltipProps) => {
  // Get departure and return dates from flight context
  const { departureDate, returnDate, tripType } = useFlight()

  if (!isVisible || !data) return null

  // Use local dates if provided, otherwise use global
  const effectiveDepartureDate = localDepartureDate || departureDate
  const effectiveReturnDate = localReturnDate || returnDate

  // Calculate trip duration based on actual selected dates
  let tripDuration = 4 // default fallback
  let startFormatted = "Select dates"
  let endFormatted = ""

  // Calculate trip duration from flight context dates
  if (effectiveDepartureDate && effectiveReturnDate) {
    const contextStartDate = new Date(effectiveDepartureDate)
    const contextEndDate = new Date(effectiveReturnDate)

    // Calculate trip duration in days
    const timeDiff = contextEndDate.getTime() - contextStartDate.getTime()
    tripDuration = Math.ceil(timeDiff / (1000 * 3600 * 24)) // Remove the +1 to get actual days between dates
  } else if (effectiveDepartureDate) {
    // If only departure date is selected, default to 4-day trip
    tripDuration = 4
  } else {
    // No dates selected - default to 4-day trip
    tripDuration = 4
  }

  // For hover tooltips, use the hovered bar's date as start date
  // For selected tooltips, use the flight context dates
  if (type === "hover") {
    // Use the hovered bar's date as start date
    const startDate = new Date(data.date)
    const endDate = new Date(startDate)
    
    // For hover tooltips, calculate trip duration from current local dates
    let hoverTripDuration = tripDuration
    if (effectiveDepartureDate && effectiveReturnDate) {
      const contextStartDate = new Date(effectiveDepartureDate)
      const contextEndDate = new Date(effectiveReturnDate)
      const timeDiff = contextEndDate.getTime() - contextStartDate.getTime()
      hoverTripDuration = Math.ceil(timeDiff / (1000 * 3600 * 24))
    }
    
    endDate.setDate(startDate.getDate() + hoverTripDuration)

    startFormatted = startDate.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    endFormatted = endDate.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  } else {
    // For selected tooltips, use the flight context dates with local return date
    if (effectiveDepartureDate && effectiveReturnDate) {
      const startDate = new Date(effectiveDepartureDate)
      const endDate = new Date(effectiveReturnDate)

      startFormatted = startDate.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
      endFormatted = endDate.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    } else if (effectiveDepartureDate) {
      // If only departure date is selected, use it as start
      const startDate = new Date(effectiveDepartureDate)
      const endDate = new Date(effectiveDepartureDate)
      endDate.setDate(startDate.getDate() + 3) // Default 4-day trip

      startFormatted = startDate.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
      endFormatted = endDate.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    } else {
      // No dates selected - show generic message
      startFormatted = "Select dates"
      endFormatted = ""
    }
  }

  // Handlers for plus/minus buttons (only for selected tooltip with departure date)
  const handleDecreaseDuration = () => {
    if (type === "selected" && effectiveDepartureDate && effectiveReturnDate && setLocalReturnDate && setHasLocalChanges) {
      const newReturnDate = new Date(effectiveReturnDate)
      newReturnDate.setDate(newReturnDate.getDate() - 1)

      // Ensure return date doesn't go below departure date
      if (newReturnDate >= effectiveDepartureDate) {
        setLocalReturnDate(newReturnDate)
        setHasLocalChanges(true)
      }
    }
  }

  const handleIncreaseDuration = () => {
    if (type === "selected" && effectiveDepartureDate && setLocalReturnDate && setHasLocalChanges) {
      if (effectiveReturnDate) {
        const newReturnDate = new Date(effectiveReturnDate)
        newReturnDate.setDate(newReturnDate.getDate() + 1)
        setLocalReturnDate(newReturnDate)
        setHasLocalChanges(true)
      } else {
        // If no return date is set, set it to departure date + 1
        const newReturnDate = new Date(effectiveDepartureDate)
        newReturnDate.setDate(newReturnDate.getDate() + 1)
        setLocalReturnDate(newReturnDate)
        setHasLocalChanges(true)
      }
    }
  }

  // Check if decrease button should be disabled
  const isDecreaseDisabled = type === "selected" && effectiveDepartureDate && effectiveReturnDate
    ? new Date(effectiveReturnDate).getTime() <= new Date(effectiveDepartureDate).getTime()
    : true

  // Check if we should show duration controls (only for round-trip)
  const shouldShowDurationControls = tripType !== "one-way"

  return (
    <>
      {/* Connecting line from tooltip to bar - only show if not outside range */}
      {!isOutsideRange && (
        <div
          className="absolute bg-gray-400 w-px z-10"
          style={{
            left: `${position.x}px`,
            top: `${position.y + 30}px`, // Start from bottom of tooltip
            height: '250px', // Height to reach the bar
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute bg-[#202124] rounded-2xl p-3 shadow-lg z-10 min-w-[270px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y - 30}px`, // Position above the bar
          transform: isOutsideRange 
            ? (side === "left" ? 'none' : 'translateX(-100%)')
            : 'translateX(-50%)'
        }}
      >
        {/* Top section with trip duration and buttons */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">
            {tripType === "one-way" ? "One-way trip" : (() => {
              // For hover tooltips, calculate duration from current local dates
              let displayDuration = tripDuration
              if (type === "hover" && effectiveDepartureDate && effectiveReturnDate) {
                const contextStartDate = new Date(effectiveDepartureDate)
                const contextEndDate = new Date(effectiveReturnDate)
                const timeDiff = contextEndDate.getTime() - contextStartDate.getTime()
                displayDuration = Math.ceil(timeDiff / (1000 * 3600 * 24))
              }
              return displayDuration === 0 ? "Same Day trip" : displayDuration === 1 ? "1-day trip" : `${displayDuration}-day trip`
            })()}
          </span>
          {shouldShowDurationControls && (
            <div className="flex items-center gap-3">
              <button
                className={`w-8 h-8 bg-[#3E495E] rounded text-white text-xs flex items-center justify-center transition-colors ${type === "selected" && !isDecreaseDisabled
                    ? "hover:bg-[#4E5A6E] cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                  }`}
                onClick={handleDecreaseDuration}
                disabled={type !== "selected" || isDecreaseDisabled}
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                className={`w-8 h-8 bg-[#3E495E] rounded text-white text-xs flex items-center justify-center transition-colors ${type === "selected"
                    ? "hover:bg-[#4E5A6E] cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                  }`}
                onClick={handleIncreaseDuration}
                disabled={type !== "selected"}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Separator line */}
        <div className="border-t border-gray-600 mb-2"></div>

        {/* Date range */}
        <div className="text-sm text-gray-300 mb-1">
          {tripType === "one-way" ? startFormatted : `${startFormatted} - ${endFormatted}`}
        </div>

        {/* Price */}
        <div className="text-sm font-medium text-[#E8EAED]">
          From ${data.price.toLocaleString()}
        </div>

        {/* V-shaped cutout */}
        {isOutsideRange ? (
          <div className={`absolute top-1/2 transform -translate-y-1/2 ${side === "left" ? "-left-3" : "-right-3"}`}>
            <div className={`w-0 h-0 border-t-[12px] border-b-[12px] ${side === "left" ? "border-r-[12px] border-l-transparent border-t-transparent border-b-transparent border-r-[#202124]" : "border-l-[12px] border-r-transparent border-t-transparent border-b-transparent border-l-[#202124]"}`}></div>
          </div>
        ) : (
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent border-t-[#202124]"></div>
          </div>
        )}
      </div>
    </>
  )
}

export function PriceGraph({
  localDepartureDate,
  setLocalDepartureDate,
  localReturnDate,
  setLocalReturnDate,
  setHasLocalChanges,
}: {
  localDepartureDate?: Date
  setLocalDepartureDate?: React.Dispatch<React.SetStateAction<Date | undefined>>
  localReturnDate?: Date
  setLocalReturnDate?: React.Dispatch<React.SetStateAction<Date | undefined>>
  setHasLocalChanges?: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const { departureDate, travelClass, returnDate, tripType } = useFlight()
  
  // Navigation state for different date ranges
  const [currentDateRange, setCurrentDateRange] = React.useState<Date>(() => {
    // Always start with today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  
  // Use local departure date if provided, otherwise use global
  const effectiveDepartureDate = localDepartureDate || departureDate
  const [hoveredBar, setHoveredBar] = React.useState<{ data: FlightPriceData; position: { x: number; y: number } } | null>(null)
  const [selectedBarTooltip, setSelectedBarTooltip] = React.useState<{ data: FlightPriceData; position: { x: number; y: number } } | null>(null)
  const chartRef = React.useRef<HTMLDivElement>(null)

  // Use local return date if provided, otherwise use global
  const effectiveReturnDate = localReturnDate || returnDate

  // Update local state when global dates change
  React.useEffect(() => {
    if (setLocalDepartureDate) {
      setLocalDepartureDate(departureDate)
    }
    if (setLocalReturnDate) {
      setLocalReturnDate(returnDate)
    }
  }, [departureDate, returnDate, setLocalDepartureDate, setLocalReturnDate])

  // Navigation functions
  const handleNavigateLeft = () => {
    const newDateRange = new Date(currentDateRange)
    newDateRange.setDate(newDateRange.getDate() - 15) // Navigate 15 days back
    setCurrentDateRange(newDateRange)
  }

  const handleNavigateRight = () => {
    const newDateRange = new Date(currentDateRange)
    newDateRange.setDate(newDateRange.getDate() + 15) // Navigate 15 days forward
    setCurrentDateRange(newDateRange)
  }

  // Check if navigation buttons should be disabled
  const canNavigateLeft = React.useMemo(() => {
    // Don't allow navigating before today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return currentDateRange > today
  }, [currentDateRange])

  const canNavigateRight = React.useMemo(() => {
    // Allow navigation up to 1 year from today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxAllowedDate = new Date(today)
    maxAllowedDate.setDate(maxAllowedDate.getDate() + 365) // 1 year from today
    
    const chartEndDate = new Date(currentDateRange)
    chartEndDate.setDate(chartEndDate.getDate() + 60) // End of current chart range
    
    return chartEndDate < maxAllowedDate
  }, [currentDateRange])

  // Generate chart data based on current date range
  const chartData = React.useMemo(() => {
    // Generate 60 days of data starting from currentDateRange
    const data = generateFlightPriceData(currentDateRange, travelClass, 60)
    return data
  }, [currentDateRange, travelClass])



  // Find the index of the selected departure date
  const selectedDepartureIndex = React.useMemo(() => {
    if (!effectiveDepartureDate) return null

    // Normalize the departure date to remove time components and use local timezone
    const normalizedDepartureDate = new Date(effectiveDepartureDate)
    normalizedDepartureDate.setHours(0, 0, 0, 0)
    const departureDateString = normalizedDepartureDate.toLocaleDateString('en-CA') // YYYY-MM-DD format in local timezone

    const foundIndex = chartData.findIndex(item => item.date === departureDateString)
    return foundIndex >= 0 ? foundIndex : null
  }, [effectiveDepartureDate, chartData])

  // Handle bar click to set departure date and calculate return date
  const handleBarClick = (data: FlightPriceData) => {
    // Convert the date string back to a Date object
    const clickedDate = new Date(data.date)
    
    // Set the local departure date to the clicked bar's date
    if (setLocalDepartureDate) {
      setLocalDepartureDate(clickedDate)
    }
    
    // Calculate the previous trip duration
    let previousTripDuration = 4 // default fallback
    if (effectiveDepartureDate && effectiveReturnDate) {
      const prevStartDate = new Date(effectiveDepartureDate)
      const prevEndDate = new Date(effectiveReturnDate)
      const timeDiff = prevEndDate.getTime() - prevStartDate.getTime()
      previousTripDuration = Math.ceil(timeDiff / (1000 * 3600 * 24))
    }
    
    // Calculate new return date based on previous trip duration
    const newReturnDate = new Date(clickedDate)
    newReturnDate.setDate(clickedDate.getDate() + previousTripDuration)
    
    // Only update local return date (not global state)
    if (setLocalReturnDate) {
      setLocalReturnDate(newReturnDate)
    }
    
    // Mark as having local changes
    if (setHasLocalChanges) {
      setHasLocalChanges(true)
    }
  }

  // Helper function to calculate bar position using chart coordinates
  const calculateBarPosition = React.useCallback((index: number) => {
    if (!chartRef.current) return 0

    const chartRect = chartRef.current.getBoundingClientRect()
    const chartWidth = chartRect.width

    // Account for Y-axis taking up space inside the chart area
    // Y-axis has tickMargin={8} and labels are positioned inside
    const yAxisWidth = 40 // Approximate width for Y-axis labels and spacing
    const chartMargin = 12 + 12 // left + right margin from BarChart
    const availableWidth = chartWidth - chartMargin - yAxisWidth

    // Recharts distributes bars evenly across the available width
    // Calculate position as a percentage of the available width
    const barPosition = chartMargin + yAxisWidth + (index / chartData.length) * availableWidth

    return barPosition
  }, [chartData.length])

  // Set persistent tooltip for selected departure date
  React.useEffect(() => {
    if (selectedDepartureIndex !== null && selectedDepartureIndex >= 0 && chartRef.current) {
      // Add a small delay to ensure the chart is fully rendered
      const updateTooltipPosition = () => {
        if (!chartRef.current) return
        
        // Try to get the actual bar element first
        const barElement = getBarElementByIndex(selectedDepartureIndex)
        
        let barCenter: number
        
        if (barElement) {
          // Use actual bar element position
          const barRect = barElement.getBoundingClientRect()
          const chartRect = chartRef.current.getBoundingClientRect()
          barCenter = barRect.left + (barRect.width / 2) - chartRect.left
        } else {
          // Fallback to calculated position
          barCenter = calculateBarPosition(selectedDepartureIndex)
        }

        setSelectedBarTooltip({
          data: chartData[selectedDepartureIndex],
          position: {
            x: barCenter,
            y: 20 // Position above the chart
          }
        })
      }

      // Try immediately first
      updateTooltipPosition()
      
      // Then try again after a short delay to ensure chart is rendered
      const timeoutId = setTimeout(updateTooltipPosition, 100)
      
      return () => clearTimeout(timeoutId)
    } else {
      setSelectedBarTooltip(null)
    }
  }, [selectedDepartureIndex, chartData, calculateBarPosition])

  // Continuous position fixing for 5 seconds after mount to handle dialog width changes
  React.useEffect(() => {
    if (selectedDepartureIndex !== null && selectedDepartureIndex >= 0 && chartRef.current) {
      const updateTooltipPosition = () => {
        if (!chartRef.current) return
        
        // Try to get the actual bar element first
        const barElement = getBarElementByIndex(selectedDepartureIndex)
        
        let barCenter: number
        
        if (barElement) {
          // Use actual bar element position
          const barRect = barElement.getBoundingClientRect()
          const chartRect = chartRef.current.getBoundingClientRect()
          barCenter = barRect.left + (barRect.width / 2) - chartRect.left
        } else {
          // Fallback to calculated position
          barCenter = calculateBarPosition(selectedDepartureIndex)
        }

        setSelectedBarTooltip(prev => prev ? {
          ...prev,
          position: {
            x: barCenter,
            y: prev.position.y
          }
        } : null)
      }

      // Use ResizeObserver to detect actual size changes
      const resizeObserver = new ResizeObserver(() => {
        updateTooltipPosition()
      })

      // Observe the chart container
      resizeObserver.observe(chartRef.current)

      // Also update on window resize
      const handleWindowResize = () => {
        updateTooltipPosition()
      }
      window.addEventListener('resize', handleWindowResize)

      // Initial update
      updateTooltipPosition()

      // Short polling period for the first 1 second to catch any missed updates during dialog opening
      const intervalId = setInterval(updateTooltipPosition, 100)
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId)
      }, 1000)

      return () => {
        resizeObserver.disconnect()
        window.removeEventListener('resize', handleWindowResize)
        clearInterval(intervalId)
        clearTimeout(timeoutId)
      }
    }
  }, [selectedDepartureIndex, chartData, calculateBarPosition])

  const handleBarMouseEnter = (
    data: FlightPriceData,
    index: number,
    event: { target: EventTarget | null }
  ) => {
    if (!chartRef.current) return
    if (!(event.target instanceof HTMLElement)) return

    // Get the actual bar element's bounding rect
    const barElement = event.target
    const barRect = barElement.getBoundingClientRect()
    const chartRect = chartRef.current.getBoundingClientRect()

    // Calculate position relative to the chart container
    const barCenter = barRect.left + (barRect.width / 2) - chartRect.left

    setHoveredBar({
      data,
      position: {
        x: barCenter,
        y: 20 // Position above the chart
      }
    })
  }

  // Helper function to get bar element by index
  const getBarElementByIndex = (index: number): HTMLElement | null => {
    if (!chartRef.current) return null
    
    // Try multiple selectors for Recharts bar elements
    const selectors = [
      '[data-testid="recharts-bar-rectangle"]',
      '.recharts-bar-rectangle',
      'path[class*="recharts-bar-rectangle"]',
      'rect[class*="recharts-bar-rectangle"]',
      'path[class*="recharts-bar"]',
      'rect[class*="recharts-bar"]'
    ]
    
    for (const selector of selectors) {
      const barElements = chartRef.current.querySelectorAll(selector)
      if (barElements.length > 0) {
        // Try to find by index first
        const targetElement = Array.from(barElements).find((element, i) => i === index)
        if (targetElement) {
          return targetElement as HTMLElement
        }
        
        // If that doesn't work, try to find by data attributes
        const targetByData = Array.from(barElements).find((element) => {
          const dataIndex = element.getAttribute('data-index')
          return dataIndex && parseInt(dataIndex) === index
        })
        if (targetByData) {
          return targetByData as HTMLElement
        }
      }
    }
    
    // Debug: Log available elements if no match found
    if (process.env.NODE_ENV === 'development') {
          // Available bar elements and looking for index
    }
    
    return null
  }

  const handleBarMouseLeave = () => {
    setHoveredBar(null)
  }

  // Set fixed Y-axis domain to match our tick range
  const yAxisDomain = [0, 750]

  // Update tooltip position on window resize
  React.useEffect(() => {
    const handleResize = () => {
      if (selectedDepartureIndex !== null && selectedDepartureIndex >= 0 && chartRef.current) {
        const barElement = getBarElementByIndex(selectedDepartureIndex)
        
        if (barElement) {
          const barRect = barElement.getBoundingClientRect()
          const chartRect = chartRef.current.getBoundingClientRect()
          const barCenter = barRect.left + (barRect.width / 2) - chartRect.left

          setSelectedBarTooltip(prev => prev ? {
            ...prev,
            position: {
              x: barCenter,
              y: prev.position.y
            }
          } : null)
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [selectedDepartureIndex])

  return (
    <div className="py-0 w-full relative h-full">
      <div className="bg-[rgba(48,49,52,1)] border-0 h-full">

        {/* Navigation buttons */}
        {canNavigateLeft && (
          <div className="absolute top-1/2 -left-5 transform -translate-y-1/2 z-20">
            <button
              onClick={handleNavigateLeft}
              className="w-10 h-10 shadow-xl rounded-full bg-[#34363C] text-white flex items-center justify-center transition-all border border-[#34363C] cursor-pointer"
              aria-label="Navigate left"
            >
              <ChevronLeft className="w-6 h-6 text-custom-blue-500" />
            </button>
          </div>
        )}

        {canNavigateRight && (
          <div className="absolute top-1/2 -right-5 transform -translate-y-1/2 z-20">
            <button
              onClick={handleNavigateRight}
              className="w-10 h-10 shadow-xl rounded-full bg-[#34363C] text-white flex items-center justify-center transition-all border border-[#34363C] cursor-pointer"
              aria-label="Navigate right"
            >
              <ChevronRight className="w-6 h-6 text-custom-blue-500" />
            </button>
          </div>
        )}

        <div className="h-full w-full" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                left: 12,
                right: 12,
                top: 60,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  const day = date.getDate()
                  const currentYear = new Date().getFullYear()
                  const dateYear = date.getFullYear()

                  // Only show month label for the 1st of each month
                  if (day === 1) {
                    const month = date.toLocaleDateString("en-US", { month: "long" })
                    
                    // Show year only if it's different from current year
                    if (dateYear !== currentYear) {
                      return `${month} ${dateYear}`
                    }
                    return month
                  }
                  return ""
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
                tickFormatter={(value) => {
                  if (value >= 1000) {
                    return `$${value / 1000}k`
                  }
                  return `$${value}`
                }}
                domain={yAxisDomain}
                ticks={[0, 250, 500, 750]}
              />
              <Bar
                dataKey="price"
                fill="#8AB4F8"
                barSize={12}
                radius={[2, 2, 0, 0]}
                onMouseEnter={(data, index, event) => handleBarMouseEnter(data, index, event)}
                onMouseLeave={handleBarMouseLeave}
                onClick={(data) => handleBarClick(data)}
                style={{ cursor: 'pointer', zIndex: 50 }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={selectedDepartureIndex !== null && index === selectedDepartureIndex ? "#165ABC" : "#8AB4F8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>


        </div>

        {/* Plane icons for departure and return dates */}
        {effectiveDepartureDate && selectedDepartureIndex !== null && selectedDepartureIndex >= 0 && chartRef.current && (
          <>
            {/* Show ArrowLeftRight when departure and return dates are the same */}
            {effectiveReturnDate && effectiveDepartureDate && new Date(effectiveDepartureDate).toDateString() === new Date(effectiveReturnDate).toDateString() ? (
              <svg
                className="absolute pointer-events-none"
                style={{
                  left: `${(selectedBarTooltip?.position.x ?? 0) + 145}px`,
                  bottom: '-130px',
                  transform: 'translateX(-50%)'
                }}
              >
                <ArrowLeftRight 
                  width={16} 
                  height={16} 
                  className="text-[#787E82]"
                />
              </svg>
            ) : (
              /* Show separate plane icons for different dates */
              <>
                <svg
                  className="absolute pointer-events-none"
                  style={{
                    left: `${(selectedBarTooltip?.position.x ?? 0) + 145}px`,
                    bottom: '-130px',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <PlaneTakeoff 
                    width={16} 
                    height={16} 
                    className="text-[#787E82]"
                  />
                </svg>
                
                {/* Only show return plane icon for round-trip journeys */}
                {tripType !== "one-way" && effectiveReturnDate && chartRef.current && (() => {
                  // Check if return date exists in the current chart data
                  const returnDateString = new Date(effectiveReturnDate).toLocaleDateString('en-CA')
                  const returnIndex = chartData.findIndex(item => item.date === returnDateString)
                  
                  // Only show return plane icon if return date is within chart data range
                  if (returnIndex >= 0) {
                    return (
                      <svg
                        className="absolute pointer-events-none"
                        style={{
                          left: `${calculateBarPosition(returnIndex) - 142}px`,
                          bottom: '-130px',
                          transform: 'translateX(-50%) scaleX(-1)'
                        }}
                      >
                        <PlaneTakeoff 
                          width={16} 
                          height={16} 
                          className="text-[#787E82]"
                        />
                      </svg>
                    )
                  }
                  return null
                })()}
              </>
            )}
          </>
        )}

        {/* Custom tooltip */}
        {selectedBarTooltip && (
          <BarTooltip
            data={selectedBarTooltip.data}
            isVisible={true}
            position={selectedBarTooltip.position}
            type="selected"
            localDepartureDate={localDepartureDate}
            localReturnDate={localReturnDate}
            setLocalReturnDate={setLocalReturnDate}
            setHasLocalChanges={setHasLocalChanges}
          />
        )}
        {hoveredBar && (
          <BarTooltip
            data={hoveredBar.data}
            isVisible={true}
            position={hoveredBar.position}
            type="hover"
            localDepartureDate={localDepartureDate}
            localReturnDate={localReturnDate}
            setLocalReturnDate={setLocalReturnDate}
            setHasLocalChanges={setHasLocalChanges}
          />
        )}

        {/* Show tooltip for departure date outside current range */}
        {effectiveDepartureDate && selectedDepartureIndex === null && (() => {
          const departureDate = new Date(effectiveDepartureDate)
          const chartStartDate = new Date(chartData[0]?.date || '')
          const chartEndDate = new Date(chartData[chartData.length - 1]?.date || '')
          
          // Determine if departure date is before or after current range
          const isBeforeRange = departureDate < chartStartDate
          const isAfterRange = departureDate > chartEndDate
          
          if (isBeforeRange || isAfterRange) {
            // Create a mock data point for the tooltip
            const mockData: FlightPriceData = {
              date: departureDate.toLocaleDateString('en-CA'),
              price: 500, // Default price
              month: departureDate.toLocaleDateString("en-US", { month: "short" })
            }
            
            // Position tooltip on left or right side of container
            const position = isBeforeRange 
              ? { x: 65, y: 20 } // Left side
              : { x: 980, y: 20 } // Right side
            
            return (
              <BarTooltip
                data={mockData}
                isVisible={true}
                position={position}
                type="selected"
                localDepartureDate={localDepartureDate}
                localReturnDate={localReturnDate}
                setLocalReturnDate={setLocalReturnDate}
                setHasLocalChanges={setHasLocalChanges}
                isOutsideRange={true}
                side={isBeforeRange ? "left" : "right"}
              />
            )
          }
          return null
        })()}
      </div>
    </div>
  )
}
