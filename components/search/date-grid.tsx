"use client"

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import React, { useState, useMemo } from "react"
import { useFlight } from "@/providers/flight-provider"
import { generateFlightPriceData } from "@/lib/utils"

export default function DateGrid() {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
    const [gridCenterDeparture, setGridCenterDeparture] = useState<Date | undefined>()
    const [gridCenterReturn, setGridCenterReturn] = useState<Date | undefined>()
    const { departureDate, returnDate, setDepartureDateAndTriggerSearch, setReturnDateAndTriggerSearch } = useFlight()

    // Set initial grid centers when dates are first set
    React.useEffect(() => {
        if (departureDate && !gridCenterDeparture) {
            setGridCenterDeparture(departureDate)
        }
        if (returnDate && !gridCenterReturn) {
            setGridCenterReturn(returnDate)
        }
        
        // If no dates are set, initialize with today's date
        if (!gridCenterDeparture && !departureDate) {
            const today = new Date()
            setGridCenterDeparture(today)
        }
        if (!gridCenterReturn && !returnDate) {
            const today = new Date()
            setGridCenterReturn(today)
        }
    }, [departureDate, returnDate, gridCenterDeparture, gridCenterReturn])

    // Navigation handlers for departure dates
    const handleDepartureNavigation = (direction: 'forward' | 'backward') => {
        if (!gridCenterDeparture) return
        
        const newCenterDate = new Date(gridCenterDeparture)
        
        if (direction === 'forward') {
            newCenterDate.setDate(newCenterDate.getDate() + 7)
        } else {
            // Check if we can go backward (don't go before today)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            const minDate = new Date(today)
            minDate.setDate(minDate.getDate() - 3) // Allow going back 3 days from today
            
            if (newCenterDate.getTime() <= minDate.getTime()) {
                return // Can't go back further
            }
            
            newCenterDate.setDate(newCenterDate.getDate() - 7)
        }
        
        setGridCenterDeparture(newCenterDate)
    }

    // Navigation handlers for return dates
    const handleReturnNavigation = (direction: 'forward' | 'backward') => {
        if (!gridCenterReturn) return
        
        const newCenterDate = new Date(gridCenterReturn)
        
        if (direction === 'forward') {
            newCenterDate.setDate(newCenterDate.getDate() + 7)
        } else {
            // Check if we can go backward (don't go before today)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            const minDate = new Date(today)
            minDate.setDate(minDate.getDate() - 3) // Allow going back 3 days from today
            
            if (newCenterDate.getTime() <= minDate.getTime()) {
                return // Can't go back further
            }
            
            newCenterDate.setDate(newCenterDate.getDate() - 7)
        }
        
        setGridCenterReturn(newCenterDate)
    }

    // Check if navigation buttons should be disabled
    const canNavigateDepartureBackward = () => {
        if (!gridCenterDeparture) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const minDate = new Date(today)
        minDate.setDate(minDate.getDate() - 3)
        return gridCenterDeparture.getTime() > minDate.getTime()
    }

    const canNavigateReturnBackward = () => {
        if (!gridCenterReturn) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const minDate = new Date(today)
        minDate.setDate(minDate.getDate() - 3)
        return gridCenterReturn.getTime() > minDate.getTime()
    }


    // Generate departure dates (7 days centered around grid center departure date)
    const departureDates = useMemo(() => {
        if (!gridCenterDeparture) return []
        
        const dates = []
        const centerDate = new Date(gridCenterDeparture)
        
        // Generate 7 days centered around the grid center departure date
        for (let i = -3; i <= 3; i++) {
            const date = new Date(centerDate)
            date.setDate(date.getDate() + i)
            
            const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
            const dateStr = date.toLocaleDateString("en-US", { 
                day: "numeric", 
                month: "short" 
            })
            
            // Generate prices for this date
            const priceData = generateFlightPriceData(date, "economy", 7)
            const prices = priceData.map(item => `$${item.price}`)
            
            dates.push({
                day: dayName,
                date: dateStr,
                prices: prices,
                isHighPrice: Math.random() > 0.8, // 20% chance of high price
                hasLowPrice: Math.random() > 0.9, // 10% chance of low price
            })
        }
        
        return dates
    }, [gridCenterDeparture])

    // Generate return dates (7 days centered around grid center return date)
    const returnDates = useMemo(() => {
        if (!gridCenterReturn) return []
        
        const dates = []
        const centerDate = new Date(gridCenterReturn)
        
        // Generate 7 days centered around the grid center return date
        for (let i = -3; i <= 3; i++) {
            const date = new Date(centerDate)
            date.setDate(date.getDate() + i)
            
            const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
            const dateStr = date.toLocaleDateString("en-US", { 
                day: "numeric", 
                month: "short" 
            })
            
            dates.push({
                day: dayName,
                date: dateStr,
            })
        }
        
                return dates
    }, [gridCenterReturn])

    // Set initial selected cell based on current departure and return dates
    React.useEffect(() => {
        if (departureDate && returnDate && departureDates.length > 0 && returnDates.length > 0) {
            // Find the indices of the current dates within the grid
            const selectedDepartureIndex = departureDates.findIndex(date => {
                const dateStr = `${departureDate.getDate()} ${departureDate.toLocaleDateString("en-US", { month: "short" })}`
                return date.date === dateStr
            })
            
            const selectedReturnIndex = returnDates.findIndex(date => {
                const dateStr = `${returnDate.getDate()} ${returnDate.toLocaleDateString("en-US", { month: "short" })}`
                return date.date === dateStr
            })
            
            // If both dates are found in the grid, set the selected cell
            if (selectedDepartureIndex >= 0 && selectedReturnIndex >= 0) {
                setSelectedCell({ row: selectedReturnIndex, col: selectedDepartureIndex })
            }
        }
    }, [departureDate, returnDate, departureDates, returnDates])

    const shouldHighlightCell = (currentRow: number, currentCol: number) => {
        // If user is hovering on a cell, use hover highlighting
        if (hoveredCell) {
            // Column 8 (return dates) should only highlight when directly hovered
            if (currentCol === 7) {
                return currentRow === hoveredCell.row && currentCol === hoveredCell.col
            }

    // Highlight cells above (same column, row <= hovered row) and to the right (same row, col >= hovered col)
    return (
      (currentCol === hoveredCell.col && currentRow <= hoveredCell.row) ||
      (currentRow === hoveredCell.row && currentCol >= hoveredCell.col)
            )
        }

        // If no hover, show default highlighting for selected intersection
        if (!selectedCell) return false
        
        // Show L-shaped highlight for the selected cell
        return (
            (currentCol === selectedCell.col && currentRow <= selectedCell.row) ||
            (currentRow === selectedCell.row && currentCol >= selectedCell.col)
    )
  }

  const shouldHighlightHeader = (currentCol: number) => {
    if (!hoveredCell) return false
        // Only highlight the header when hovering directly on the header row (row -1)
        // Column 8 (settings button) is also considered a header
        return currentCol === hoveredCell.col && hoveredCell.row === -1
    }

    // Check if a cell should be highlighted as the selected intersection
    const shouldHighlightSelectedIntersection = (currentRow: number, currentCol: number) => {
        if (!selectedCell) return false
        
        // Simply check if this is the cell that was clicked
        return currentRow === selectedCell.row && currentCol === selectedCell.col
    }





  const handleCellHover = (row: number, col: number) => {
    setHoveredCell({ row, col })
  }

  const handleCellLeave = () => {
    setHoveredCell(null)
  }

    // Handle cell click to set departure and return dates
    const handleCellClick = (rowIndex: number, colIndex: number) => {
        if (!departureDates[colIndex] || !returnDates[rowIndex]) return

        // Get the departure date from the clicked column
            const departureDateStr = departureDates[colIndex]!.date
        
        // Get the return date from the clicked row
            const returnDateStr = returnDates[rowIndex]!.date

        // Parse the dates (assuming format like "15 Aug")
        const currentYear = new Date().getFullYear()
        const departureDate = new Date(`${departureDateStr} ${currentYear}`)
        const returnDate = new Date(`${returnDateStr} ${currentYear}`)

        // Set the dates in the flight context and trigger search
        setDepartureDateAndTriggerSearch(departureDate)
        setReturnDateAndTriggerSearch(returnDate)
        
        // Set the selected cell for highlighting
        setSelectedCell({ row: rowIndex, col: colIndex })
        
              // Clicked cell and setting dates
    }

    // If no grid center departure date is set, show a message
    if (!gridCenterDeparture) {
        return (
            <div className="text-white">
                <div className="text-center py-8 text-gray-400">
                    Please select a departure date to view the price grid
                </div>
            </div>
        )
    }

  return (
        <div className="text-white">
            <div className="max-w-full">
        {/* Header */}
                <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
                        <h1 className="text-sm font-medium">Departure</h1>
            <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={`h-6 w-6 ${canNavigateDepartureBackward() ? 'text-gray-400 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
                                onClick={() => handleDepartureNavigation('backward')} 
                                disabled={!canNavigateDepartureBackward()}
                            >
                                <ChevronLeft className="h-3 w-3" />
              </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-gray-400 hover:text-white"
                                onClick={() => handleDepartureNavigation('forward')}
                            >
                                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Main Price Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-8 overflow-hidden">
              {/* Headers */}
              {departureDates.map((date, index) => (
                <div
                  key={`header-${index}`}
                                    className="px-2 py-1 text-center cursor-pointer text-white"
                  style={{
                    border: "1px solid #5F6368",
                                        backgroundColor: shouldHighlightHeader(index) ? "#394457" : "rgba(58,63,67,1)",
                  }}
                                    onMouseEnter={() => handleCellHover(-1, index)}
                                    onMouseLeave={handleCellLeave}
                >
                  <div className="text-sm font-medium">{date.day}</div>
                                    <div className="text-sm text-gray-400">{date.date}</div>
                </div>
              ))}
              <div
                                className="px-2 py-1 text-center cursor-pointer"
                style={{
                  border: "1px solid #5F6368",
                  backgroundColor: shouldHighlightHeader(7) ? "#394457" : "rgba(58,63,67,1)",
                }}
                                onMouseEnter={() => handleCellHover(-1, 7)}
                                onMouseLeave={handleCellLeave}
              >
                <div className="flex justify-center">
                                    <Button variant="ghost" size="icon" className="h-4 w-4 text-gray-400 hover:text-white p-0">
                                        <Settings className="h-2 w-2" />
                  </Button>
                </div>
              </div>

              {/* Price Rows */}
              {Array.from({ length: 7 }).map((_, rowIndex) => (
                <React.Fragment key={`row-${rowIndex}`}>
                  {departureDates.map((date, colIndex) => (
                    <div
                      key={`cell-${rowIndex}-${colIndex}`}
                                            className={`px-2 py-1 text-sm font-medium cursor-pointer flex items-center justify-center ${
                                                shouldHighlightSelectedIntersection(rowIndex, colIndex)
                                                    ? "text-[#202124]"
                                                    : date.isHighPrice
                          ? "text-red-400"
                          : date.hasLowPrice &&
                                                            (date.prices[rowIndex] === "$465" ||
                                                                date.prices[rowIndex] === "$510" ||
                                                                date.prices[rowIndex] === "$524")
                            ? "text-[#81C995]"
                            : "text-[#E8EAED]"
                      }`}
                      style={{
                        border: "1px solid #5F6368",
                                                backgroundColor: shouldHighlightSelectedIntersection(rowIndex, colIndex)
                                                    ? "#8AB4F8"
                                                    : shouldHighlightCell(rowIndex, colIndex)
                                                        ? "#394457"
                                                        : "transparent",
                      }}
                      onMouseEnter={() => handleCellHover(rowIndex, colIndex)}
                      onMouseLeave={handleCellLeave}
                                             onClick={() => handleCellClick(rowIndex, colIndex)}
                    >
                      {date.prices[rowIndex]}
                    </div>
                  ))}
                  <div
                                        className="px-2 py-1 text-center cursor-pointer rounded-none text-white"
                    style={{
                      border: "1px solid #5F6368",
                      backgroundColor: shouldHighlightCell(rowIndex, 7) ? "#394457" : "rgba(60,64,67,1)",
                    }}
                    onMouseEnter={() => handleCellHover(rowIndex, 7)}
                    onMouseLeave={handleCellLeave}
                  >
                                        <div className="text-sm font-medium">{returnDates[rowIndex]?.day || ""}</div>
                                        <div className="text-sm text-gray-400">{returnDates[rowIndex]?.date || ""}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Vertical Return Label */}
                    <div className="w-6 flex items-center justify-start ml-2 flex-col gap-4 p-4">
                        <div className="text-white text-sm font-medium transform rotate-90 whitespace-nowrap">Return</div>
                        <div className="flex items-center gap- flex-col">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={`h-6 w-6 ${canNavigateReturnBackward() ? 'text-gray-400 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
                                onClick={() => handleReturnNavigation('backward')} 
                                disabled={!canNavigateReturnBackward()}
                            >
                                <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-gray-400 hover:text-white"
                                onClick={() => handleReturnNavigation('forward')}
                            >
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        </div>
          </div>
        </div>
      </div>
    </div>
  )
}
