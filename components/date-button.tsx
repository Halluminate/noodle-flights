import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  parse,
  addDays,
  addYears,
  isAfter,
  isSameDay,
  isBefore,
} from "date-fns";
import { useState, useRef, useEffect } from "react";

interface DateButtonProps {
  date: Date | undefined;
  label: string;
  isActive?: boolean;
  showLeftChevron?: boolean;
  showRightChevron?: boolean;
  onLeftChevronClick?: () => void;
  onRightChevronClick?: () => void;
  onClick?: () => void;
  showCalendarIcon?: boolean;
  className?: string;
  tripType?: "departure" | "return";
  onDateChange?: (date: Date) => void;
  returnDate: Date | undefined;
  departureDate: Date | undefined;
  isEditable?: boolean; // New prop to control whether the input is editable
  canNavigateBack?: boolean; // New prop to control left chevron state
  canNavigateForward?: boolean; // New prop to control right chevron state
  onSelectionChange?: (isSelected: "departure" | "return" | undefined) => void; // New prop to notify parent of selection changes
  isExternallySelected?: boolean; // New prop to control selection from parent
  isStandalone?: boolean; // When true, this button renders with full rounded border on all sides
}

export function DateButton({
  date,
  label,
  isActive = false,
  showLeftChevron = true,
  showRightChevron = true,
  onLeftChevronClick,
  onRightChevronClick,
  onClick,
  showCalendarIcon = false,
  className = "",
  tripType,
  onDateChange,
  returnDate,
  departureDate,
  isEditable = false, // Default to non-editable for backward compatibility
  canNavigateBack = true,
  canNavigateForward = true,
  onSelectionChange,
  isExternallySelected = false,
  isStandalone = false,
}: DateButtonProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(
    date ? format(date, "EEE, dd MMM") : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setInputValue(date ? format(date, "EEE, dd MMM") : "");
  }, [date]);

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-date-button]')) {
        onSelectionChange?.(undefined);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onSelectionChange]);

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditable) {
      setIsEditing(true);
    }
    onClick?.();
  };

  const handleButtonClick = () => {
    onSelectionChange?.(tripType);
    onClick?.();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEditable) {
      setInputValue(e.target.value);
    }
  };

  const handleInputBlur = () => {
    if (!isEditable) {
      setIsEditing(false);
      return;
    }

    try {
      if (!inputValue) {
        setIsEditing(false);
        return;
      }

      let parsedDate: Date | null = null;
      const trimmedInput = inputValue.trim();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = addYears(today, 1); // Maximum date is 1 year from today

      // Handle various date formats: x/yy/zzzz, x-yy-zzz, x/yy
      // Support both MM/DD and DD/MM formats based on locale (US format: MM/DD)
      const slashFormatMatch = trimmedInput.match(
        /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/
      );
      const dashFormatMatch = trimmedInput.match(
        /^(\d{1,2})-(\d{1,2})(?:-(\d{2}|\d{4}))?$/
      );
      
      const formatMatch = slashFormatMatch || dashFormatMatch;
      if (formatMatch) {
        const first = formatMatch[1];
        const second = formatMatch[2];
        const year = formatMatch[3];
        const currentYear = today.getFullYear();
        let fullYear = currentYear;
        const month = parseInt(first, 10) - 1;
        const day = parseInt(second, 10);

        if (year) {
          fullYear = parseInt(year) < 100 ? 2000 + parseInt(year) : parseInt(year);
        }

        // Validate month and day
        if (month < 0 || month > 11 || day < 1 || day > 31) {
          setInputValue(date ? format(date, "EEE, dd MMM") : "");
          setIsEditing(false);
          return;
        }

        // Create date with the parsed values
        const parsedDateTemp = new Date(fullYear, month, day);

        // If no year was provided and date is in the past, try next year
        if (!year && parsedDateTemp < today) {
          parsedDateTemp.setFullYear(fullYear + 1);
        }

        // Don't allow dates more than 1 year in the future
        if (isAfter(parsedDateTemp, maxDate)) {
          setInputValue(date ? format(date, "EEE, dd MMM") : "");
          setIsEditing(false);
          return;
        }

        parsedDate = parsedDateTemp;
      }
      // Handle single number (day of current/next month)
      else if (/^\d{1,2}$/.test(trimmedInput)) {
        const day = parseInt(trimmedInput);
        if (day >= 1 && day <= 31) {
          // Try current month first
          let targetDate = new Date(today.getFullYear(), today.getMonth(), day);

          // If the date would be in the past in current month, try next month
          if (isBefore(targetDate, today)) {
            targetDate = new Date(
              today.getFullYear(),
              today.getMonth() + 1,
              day
            );
          }

          // If the date would be more than a year in the future, don't allow it
          if (isAfter(targetDate, maxDate)) {
            setInputValue(date ? format(date, "EEE, dd MMM") : "");
            setIsEditing(false);
            return;
          }

          // For return dates, if the date would be before departure, try next month
          if (
            tripType === "return" &&
            departureDate &&
            isBefore(targetDate, departureDate)
          ) {
            targetDate = new Date(
              departureDate.getFullYear(),
              departureDate.getMonth() + 1,
              day
            );
            // If still before departure date, reject it
            if (isBefore(targetDate, departureDate)) {
              setInputValue(date ? format(date, "EEE, dd MMM") : "");
              setIsEditing(false);
              return;
            }
          }

          parsedDate = targetDate;
        }
      }
      // Handle weekday only (e.g., "Tue", "Thur", "Friday", etc.)
      else if (/^[a-zA-Z]{3,}$/i.test(trimmedInput)) {
        const targetDay = trimmedInput.toLowerCase();
        const dayMap: Record<string, number> = {
          sun: 0,
          sunday: 0,
          mon: 1,
          monday: 1,
          tue: 2,
          tues: 2,
          tuesday: 2,
          wed: 3,
          wednesday: 3,
          thu: 4,
          thur: 4,
          thurs: 4,
          thursday: 4,
          fri: 5,
          friday: 5,
          sat: 6,
          saturday: 6,
        };

        // Find matching day by checking if input is a substring of any full name
        let targetDayIndex = -1;
        if (targetDay.length >= 3) {
          const fullDays = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ];
          // First try exact match with our map
          const dayValue = dayMap[targetDay];
          if (dayValue !== undefined) {
            targetDayIndex = dayValue;
          } else {
            // Then try substring match
                         for (let i = 0; i < fullDays.length; i++) {
               if (fullDays[i]!.includes(targetDay)) {
                 targetDayIndex = i;
                 break;
               }
             }
          }
        }

        if (targetDayIndex !== -1) {
          // For return date, use departure date as reference instead of today
          const referenceDate =
            tripType === "return" && departureDate ? departureDate : today;
          const currentDay = referenceDate.getDay();
          let daysToAdd = (targetDayIndex - currentDay + 7) % 7;

          // If it's the same weekday and we're setting return date, add 7 days
          if (daysToAdd === 0 && tripType === "return" && departureDate) {
            daysToAdd = 7;
          }

          parsedDate = addDays(referenceDate, daysToAdd);

          // For return dates, if the calculated date is before departure, add weeks until it's after
          if (
            tripType === "return" &&
            departureDate &&
            isBefore(parsedDate, departureDate)
          ) {
            while (isBefore(parsedDate, departureDate)) {
              parsedDate = addDays(parsedDate, 7);
            }
          }
        }
      }
      // Try parsing other formats
      else {
        try {
          // Try "24 Jul", "24 July", "December 25", "Dec 25" format (case insensitive)
          const monthDateMatch = trimmedInput.match(
            /^(?:(\d{1,2})\s+([a-zA-Z]{3,})|([a-zA-Z]{3,})\s+(\d{1,2}))$/i
          );
          if (monthDateMatch) {
            const dayStr1 = monthDateMatch[1];
            const monthStr1 = monthDateMatch[2];
            const monthStr2 = monthDateMatch[3];
            const dayStr2 = monthDateMatch[4];
            const day = parseInt(dayStr1 || dayStr2 || "", 10);
            const monthStr = (monthStr1 || monthStr2 || "").toLowerCase();

            // Map of month names to their index (0-based)
            const monthMap: Record<string, number> = {
              jan: 0,
              january: 0,
              feb: 1,
              february: 1,
              mar: 2,
              march: 2,
              apr: 3,
              april: 3,
              may: 4,
              jun: 5,
              june: 5,
              jul: 6,
              july: 6,
              aug: 7,
              august: 7,
              sep: 8,
              sept: 8,
              september: 8,
              oct: 9,
              october: 9,
              nov: 10,
              november: 10,
              dec: 11,
              december: 11,
            };

            const monthInput = monthStr.toLowerCase();
            let monthIndex = -1;

            // First try exact match with our map
            const monthValue = monthMap[monthInput];
            if (monthValue !== undefined) {
              monthIndex = monthValue;
            } else if (monthInput.length >= 3) {
              // Then try substring match with full month names
              const fullMonths = [
                "january",
                "february",
                "march",
                "april",
                "may",
                "june",
                "july",
                "august",
                "september",
                "october",
                "november",
                "december",
              ];
                             for (let i = 0; i < fullMonths.length; i++) {
                 if (fullMonths[i]!.includes(monthInput)) {
                   monthIndex = i;
                   break;
                 }
               }
            }

            if (monthIndex !== -1 && day >= 1 && day <= 31) {
              const currentYear = today.getFullYear();
              parsedDate = new Date(currentYear, monthIndex, day);

              // If the date is in the past, move to next year
              if (parsedDate < today) {
                parsedDate.setFullYear(currentYear + 1);
              }

              // For return dates, if the date would be before departure, reject it
              if (
                tripType === "return" &&
                departureDate &&
                isBefore(parsedDate, departureDate)
              ) {
                setInputValue(date ? format(date, "EEE, dd MMM") : "");
                setIsEditing(false);
                return;
              }

              // Don't allow dates more than 1 year in the future
              if (isAfter(parsedDate, maxDate)) {
                setInputValue(date ? format(date, "EEE, dd MMM") : "");
                setIsEditing(false);
                return;
              }
            }
          }

          // If month + date format didn't match, try other formats
          if (!parsedDate) {
            // Try "fri 18" or "thur 24" format
            const weekdayDateMatch = trimmedInput.match(
              /^([a-zA-Z]{3,})\s+(\d{1,2})$|^(\d{1,2})\s+([a-zA-Z]{3,})$/i
            );
            if (weekdayDateMatch) {
              const weekday1 = weekdayDateMatch[1];
              const dayStr1 = weekdayDateMatch[2];
              const dayStr2 = weekdayDateMatch[3];
              const weekday2 = weekdayDateMatch[4];
              const day = parseInt(dayStr1 || dayStr2 || "", 10);
              const weekday = (weekday1 || weekday2 || "").toLowerCase();

              // Map full weekday names to 3 letter format
              const weekdayMap: { [key: string]: string } = {
                mon: "mon",
                monday: "mon",
                tue: "tue",
                tues: "tue",
                tuesday: "tue",
                wed: "wed",
                wednesday: "wed",
                thu: "thu",
                thur: "thu",
                thurs: "thu",
                thursday: "thu",
                fri: "fri",
                friday: "fri",
                sat: "sat",
                saturday: "sat",
                sun: "sun",
                sunday: "sun",
              };

              const normalizedWeekday = weekdayMap[weekday];
              if (normalizedWeekday && day >= 1 && day <= 31) {
                const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                const targetDayIndex = days.indexOf(normalizedWeekday);

                // Try to find the date in current and next month that matches both the day and weekday
                let possibleDates = [];

                // Check current month
                const currentMonthDate = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  day
                );
                if (currentMonthDate.getDay() === targetDayIndex) {
                  possibleDates.push(currentMonthDate);
                }

                // Check next month
                const nextMonthDate = new Date(
                  today.getFullYear(),
                  today.getMonth() + 1,
                  day
                );
                if (nextMonthDate.getDay() === targetDayIndex) {
                  possibleDates.push(nextMonthDate);
                }

                // Check month after next (in case both current and next month dates are invalid)
                const twoMonthsDate = new Date(
                  today.getFullYear(),
                  today.getMonth() + 2,
                  day
                );
                if (twoMonthsDate.getDay() === targetDayIndex) {
                  possibleDates.push(twoMonthsDate);
                }

                // Filter out invalid dates
                possibleDates = possibleDates.filter((date) => {
                  // Remove dates in the past
                  if (isBefore(date, today) && !isSameDay(date, today)) {
                    return false;
                  }
                  // Remove dates more than 1 year in the future
                  if (isAfter(date, maxDate)) {
                    return false;
                  }
                  // For return dates, remove dates before departure
                  if (
                    tripType === "return" &&
                    departureDate &&
                    isBefore(date, departureDate)
                  ) {
                    return false;
                  }
                  return true;
                });

                // If we found valid dates, use the first (earliest) one
                                 if (possibleDates.length > 0) {
                   parsedDate = possibleDates[0]!;
                } else {
                  // No valid dates found that match both day and weekday
                  setInputValue(date ? format(date, "EEE, dd MMM") : "");
                  setIsEditing(false);
                  return;
                }
              }
            }

            // If weekday + date format didn't match, try other formats
            if (!parsedDate) {
              try {
                // Try "Tue 17 Jun" format
                parsedDate = parse(trimmedInput, "EEE, dd MMM", new Date());
              } catch {
                try {
                  // Try "17 June" format
                  parsedDate = parse(trimmedInput, "dd MMM", new Date());
                } catch {
                  // If all parsing attempts fail, reset the input
                  setInputValue(date ? format(date, "EEE, dd MMM") : "");
                  setIsEditing(false);
                  return;
                }
              }
            }
          }
        } catch {
          // Reset to the current date if parsing fails
          setInputValue(date ? format(date, "EEE, dd MMM") : "");
          setIsEditing(false);
          return;
        }
      }

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        // Don't allow dates more than 1 year in the future
        if (isAfter(parsedDate, maxDate)) {
          setInputValue(date ? format(date, "EEE, dd MMM") : "");
          setIsEditing(false);
          return;
        }

        // Don't allow selecting past dates for departure
        if (isBefore(parsedDate, today) && !isSameDay(parsedDate, today)) {
          if (tripType === "departure") {
            setInputValue(date ? format(date, "EEE, dd MMM") : "");
            setIsEditing(false);
            return;
          }
        }

        // If selecting departure date after return date, update both
        if (
          tripType === "departure" &&
          returnDate &&
          isAfter(parsedDate, returnDate)
        ) {
          onDateChange?.(parsedDate);
          setIsEditing(false);
          return;
        }

        // Don't allow selecting return date before departure date
        if (
          tripType === "return" &&
          departureDate &&
          isBefore(parsedDate, departureDate)
        ) {
          setInputValue(date ? format(date, "EEE, dd MMM") : "");
          setIsEditing(false);
          return;
        }

        // Set the input value to the formatted date before calling onDateChange
        setInputValue(format(parsedDate, "EEE, dd MMM"));
        onDateChange?.(parsedDate);
      } else {
        // Reset to the current date if parsing fails
        setInputValue(date ? format(date, "EEE, dd MMM") : "");
      }

      setIsEditing(false);
    } catch {
      // Reset to the current date if parsing fails
      setInputValue(date ? format(date, "EEE, dd MMM") : "");
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setInputValue(date ? format(date, "EEE, dd MMM") : "");
      setIsEditing(false);
    }
  };

  return (
    <div
      data-date-button
      className={`flex flex-1 items-center ${
        isStandalone
          ? "rounded-sm border border-[#5f6368]"
          : tripType === "departure"
            ? "rounded-l-sm border-y border-l border-[#5f6368]"
            : "rounded-r-sm border-y border-r border-[#5f6368]"
      } ${
        isActive  || isExternallySelected ? "border-2 border-[#669DF6] rounded-sm" : "hover:border hover:border-[#9AA0A6] hover:rounded-sm"
      } ${className}`}
      onClick={handleButtonClick}
    >
      <div className="flex flex-1 items-center min-w-0">
        <div
          className={`flex flex-1 items-center gap-2 px-4 py-4 min-w-0 whitespace-nowrap`}
        >
          {showCalendarIcon && (
            <CalendarIcon className="h-4 w-4 flex-shrink-0 text-[#C2C6CA]" />
          )}
          {isEditing && isEditable ? (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              onClick={handleInputClick}
              className="bg-transparent text-[#E8EAED] font-normal w-[100px] outline-none border-none focus:ring-0 whitespace-nowrap"
              placeholder={label}
            />
          ) : (
            <span
              className="text-[#E8EAED] font-normal cursor-text whitespace-nowrap w-[100px]"
              onClick={handleInputClick}
            >
              {date ? format(date, "EEE, dd MMM") : label}
            </span>
          )}
        </div>

        <div className="flex items-center self-stretch">
          {showLeftChevron && date && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (canNavigateBack) {
                  onSelectionChange?.(tripType);
                  onLeftChevronClick?.();
                }
              }}
              className={`px-1 h-full flex items-center justify-center ${canNavigateBack ? "hover:bg-[#3E3E41]" : ""} ${
                canNavigateBack ? "cursor-pointer" : ""
              }`}
            >
              <ChevronLeft
                className={`h-5 w-5 ${
                  canNavigateBack
                    ? "text-[#C2C6CA] hover:text-white"
                    : "text-[#9BA0A6]"
                }`}
              />
            </div>
          )}
          {showRightChevron && date && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (canNavigateForward) {
                  onSelectionChange?.(tripType);
                  onRightChevronClick?.();
                }
              }}
              className={`px-1 h-full flex items-center justify-center ${canNavigateForward ? "hover:bg-[#3E3E41]" : ""} rounded-r-sm ${
                canNavigateForward ? "cursor-pointer" : "cursor-not-allowed"
              }`}
            >
              <ChevronRight
                className={`h-5 w-5 ${
                  canNavigateForward
                    ? "text-[#C2C6CA] hover:text-white"
                    : "text-[#9BA0A6]"
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
