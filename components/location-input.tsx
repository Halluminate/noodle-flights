"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Check, X, Circle } from "lucide-react";
import { searchAirports, defaultSuggestions, cn } from "@/lib/utils";
import type {
  LocationSuggestion,
  DefaultSuggestion,
} from "@/lib/types/airport";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import type { CityWithAirports } from "@/lib/utils";

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions?: LocationSuggestion[];
  isDestination?: boolean; // New prop to identify if this is the destination input
  onCommit?: (value: string) => void; // New prop for when user commits to a selection
  onHoverChange?: (isHovered: boolean) => void; // New prop for hover state
  isHovered?: boolean; // New prop to receive hover state
  onClick?: () => void; // New prop for click handler
  isClicked?: boolean; // New prop to receive click state
}

export function LocationInput({
  value,
  onChange,
  placeholder,
  isDestination = false, // Default to false
  onCommit, // Optional callback for when user commits to selection
  onHoverChange, // Optional callback for hover state changes
  isHovered = false, // Default to false
  onClick, // Optional callback for click handler
  isClicked = false, // Default to false
}: LocationInputProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<
    (LocationSuggestion | CityWithAirports)[]
  >([]);
  const [lastSearchSuggestions, setLastSearchSuggestions] = useState<
    (LocationSuggestion | CityWithAirports)[]
  >([]); // Store last search results
  const [selectedLocations, setSelectedLocations] = useState<
    LocationSuggestion[]
  >([]);
  const [selectedCities] = useState<CityWithAirports[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoCompleteText, setAutoCompleteText] = useState(""); // New state for autocomplete preview
  const [manualSuggestionsMode, setManualSuggestionsMode] = useState(false); // Flag to prevent useEffect interference
  const [openAccordionId, setOpenAccordionId] = useState<string | undefined>(
    undefined
  ); // Track which accordion is open
  // Removed isSearching state - we'll just show suggestions when ready

  // Add navigation state for keyboard interaction
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] =
    useState<number>(-1);
  const [hasNavigatedToSuggestion, setHasNavigatedToSuggestion] =
    useState(false);
  const [selectedAccordionIndex, setSelectedAccordionIndex] =
    useState<number>(-1); // Track which accordion item is selected
  const [selectedAirportIndex, setSelectedAirportIndex] = useState<number>(-1); // Track which airport within accordion is selected
  const [highlightedDisplayText, setHighlightedDisplayText] =
    useState<string>(""); // Track display text for highlighted suggestion

  // Add debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track value at time of opening to allow reverting uncommitted edits on close
  const valueOnOpenRef = useRef<string>("");
  const wasCommittedRef = useRef<boolean>(false);

  // Add function to reset navigation state
  const resetNavigationState = () => {
    setSelectedSuggestionIndex(-1);
    setHasNavigatedToSuggestion(false);
    setSelectedAccordionIndex(-1);
    setSelectedAirportIndex(-1);
    setHighlightedDisplayText("");
  };

  // Add function to get display text from suggestion
  const getSuggestionDisplayText = (
    suggestion:
      | LocationSuggestion
      | CityWithAirports
      | DefaultSuggestion
      | undefined
  ) => {
    if (!suggestion) return "";
    if ("airports" in suggestion) {
      // For city groups, show the full name (matching what's displayed in the dropdown)
      return suggestion.name;
    } else {
      // For airports, show the full airport name (matching what's displayed in the dropdown)
      return suggestion.name;
    }
  };

  // Add function to get searchable text from suggestion (for autocomplete)
  const getSuggestionSearchableText = (
    suggestion:
      | LocationSuggestion
      | CityWithAirports
      | DefaultSuggestion
      | undefined
  ) => {
    if (!suggestion) return "";
    if ("airports" in suggestion) {
      // For city groups, extract just the city name (first part before comma)
      return suggestion.name?.split(",")[0]?.trim() || "";
    } else if (suggestion.data?.city) {
      // For airports, prefer the city name as it's more commonly searched
      return suggestion.data.city;
    } else {
      // For default suggestions or airports without city data, use the name as-is
      return suggestion.name || "";
    }
  };

  // Helper function to get all navigable items (city groups + individual airports)
  const getAllNavigableItems = (
    suggestions: (LocationSuggestion | CityWithAirports)[]
  ) => {
    const items: Array<{
      type: "city" | "airport";
      cityIndex?: number;
      airportIndex?: number;
      suggestion: LocationSuggestion | CityWithAirports;
    }> = [];

    suggestions.forEach((suggestion, cityIndex) => {
      if ("airports" in suggestion) {
        // Add the city group itself
        items.push({
          type: "city",
          cityIndex,
          suggestion,
        });

        // Add individual airports if the accordion is open
        if (openAccordionId === suggestion.id) {
          suggestion.airports.forEach((airport, airportIndex) => {
            items.push({
              type: "airport",
              cityIndex,
              airportIndex,
              suggestion: airport,
            });
          });
        }
      } else {
        // Single airport suggestion
        items.push({
          type: "airport",
          cityIndex,
          suggestion,
        });
      }
    });

    return items;
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    (query: string, preserveAutocomplete: boolean = false) => {
      // Clear existing timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        // Search will execute when ready - no loading state needed

        // Use requestAnimationFrame for smoother UI updates
        searchTimeoutRef.current = setTimeout(() => {
          requestAnimationFrame(async () => {
            // Simple check: only proceed if we still have a query
            if (!query) {
              setAutoCompleteText("");
              return;
            }

            try {
              const suggestions = await searchAirports(query);
              // Limit results to prevent rendering lag (max 5 suggestions for good UX)
              const limitedSuggestions = suggestions.slice(0, 5);
              setLastSearchSuggestions(limitedSuggestions);
              setFilteredSuggestions(limitedSuggestions);

              // Set the first accordion to be open by default
              const firstAccordion = limitedSuggestions.find(
                (suggestion) => "airports" in suggestion
              );
              setOpenAccordionId(firstAccordion?.id);

              // Update autocomplete text - only if suggestion actually starts with the query
              // Never show autocomplete for default suggestions (they should not have preview text)
              if (query && suggestions.length > 0) {
                // Check if this is default suggestions by looking at the first item's type
                const firstSuggestion = suggestions[0];
                const displayText = getSuggestionDisplayText(firstSuggestion);
                const searchableText =
                  getSuggestionSearchableText(firstSuggestion);

                // Only show autocomplete if:
                // - Suggestion starts with the current query (case insensitive)
                // - Either the searchable text is longer than query, OR the display text is longer (to show full location details)
                if (
                  searchableText
                    .toLowerCase()
                    .startsWith(query.toLowerCase()) &&
                  (searchableText.length > query.length ||
                    displayText.length > query.length)
                ) {
                  // Only update autocomplete if it's actually different to prevent flickering
                  setAutoCompleteText((prev) => {
                    // If we're preserving autocomplete and the new text is the same, keep the current one
                    if (preserveAutocomplete && prev === displayText) {
                      return prev;
                    }
                    // Only update if it's actually different
                    return prev !== displayText ? displayText : prev;
                  });
                } else {
                  // Only clear if it's not already empty and we're not preserving autocomplete
                  if (!preserveAutocomplete) {
                    setAutoCompleteText((prev) => (prev !== "" ? "" : prev));
                  }
                }
              } else {
                // Only clear if we're not preserving autocomplete
                if (!preserveAutocomplete) {
                  setAutoCompleteText("");
                }
              }
            } catch {
              setFilteredSuggestions([]);
              setLastSearchSuggestions([]);
              // Only clear autocomplete on error if we're not preserving it
              if (!preserveAutocomplete) {
                setAutoCompleteText("");
              }
            }
          });
        }, 0); // Use setTimeout to make search async
      }, 150); // Optimized debounce for better responsiveness
    },
    []
  );

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Effect to sync selectedLocations with localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && selectedLocations.length > 0) {
      localStorage.setItem(
        "selectedLocations",
        JSON.stringify(selectedLocations)
      );
    }
  }, [selectedLocations]);

  // Effect to handle initial suggestions for destination
  useEffect(() => {
    if (isPopoverOpen && isDestination && !searchQuery && !value) {
      setFilteredSuggestions(defaultSuggestions);
    }
  }, [isPopoverOpen, isDestination, searchQuery, value]);

  // Effect to handle search suggestions - now uses debounced search
  useEffect(() => {
    if (!isPopoverOpen) {
      setFilteredSuggestions([]);
      setLastSearchSuggestions([]);
      setAutoCompleteText("");
      setManualSuggestionsMode(false);
      setOpenAccordionId(undefined);
      return;
    }

    // Skip useEffect when we're manually managing suggestions
    if (manualSuggestionsMode) {
      return;
    }

    const query = searchQuery || (!isMultiSelect ? value : "");
    if (!query) {
      // Clear any stale autocomplete immediately when switching to default suggestions
      setAutoCompleteText("");

      // In multi-select mode, if we have previous search results, keep them visible (Google Flights UX)
      if (isMultiSelect && lastSearchSuggestions.length > 0) {
        // Keep the last search suggestions visible for more selections
        return;
      }

      if (isDestination) {
        setFilteredSuggestions(defaultSuggestions);
      } else {
        setFilteredSuggestions([]);
      }
      setLastSearchSuggestions([]);

      // Cancel any pending debounced searches to prevent them from setting autocomplete later
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      return;
    }

    // Check if we have existing autocomplete text that matches the query
    // This indicates user just accepted autocomplete - preserve it for smoother UX
    const preserveAutocomplete = Boolean(
      autoCompleteText &&
        autoCompleteText.toLowerCase().startsWith(query.toLowerCase()) &&
        autoCompleteText.length > query.length
    );

    // Use debounced search instead of direct search
    debouncedSearch(query, preserveAutocomplete);
  }, [
    isPopoverOpen,
    searchQuery,
    value,
    isMultiSelect,
    isDestination,
    lastSearchSuggestions.length,
    manualSuggestionsMode,
    debouncedSearch,
    autoCompleteText,
  ]);

  // Effect to reset navigation when suggestions change
  useEffect(() => {
    resetNavigationState();
  }, [filteredSuggestions]);

  // Effect to prevent other elements from taking focus during navigation
  useEffect(() => {
    if (isPopoverOpen && hasNavigatedToSuggestion) {
      const handleFocus = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        const input = popoverInputRef.current;

        // Only refocus if focus moved to a button or other interactive element
        // and the input is not already focused
        if (
          target &&
          input &&
          document.activeElement !== input &&
          (target.tagName === "BUTTON" ||
            (target.getAttribute("tabindex") !== null &&
              target.getAttribute("tabindex") !== "-1"))
        ) {
          e.preventDefault();
          // Use a small delay to prevent flickering
          setTimeout(() => {
            input.focus();
          }, 0);
        }
      };

      document.addEventListener("focusin", handleFocus);
      return () => document.removeEventListener("focusin", handleFocus);
    }
  }, [isPopoverOpen, hasNavigatedToSuggestion]);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
    // Don't clear lastSearchSuggestions anymore
    setSearchQuery("");
    // Clear highlighted display text when closing
    setHighlightedDisplayText("");
    // Revert uncommitted edits to the value when closing (outside click/Escape)
    if (!isMultiSelect && !wasCommittedRef.current) {
      onChange(valueOnOpenRef.current);
    }
    // Reset multi-select mode if we only have one selection
    if (selectedLocations.length <= 1 && selectedCities.length === 0) {
      setIsMultiSelect(false);
    }
    // Reset commit tracking for next open - do this after a small delay to ensure
    // any pending onChange calls from the suggestion selection have completed
    setTimeout(() => {
      wasCommittedRef.current = false;
    }, 0);
  }, [isMultiSelect, onChange, selectedCities.length, selectedLocations]);

  // Effect to handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        popoverRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        handleClosePopover();
      }
    };

    if (isPopoverOpen) {
      document.addEventListener(
        "pointerdown",
        handleClickOutside as EventListener
      );
      return () =>
        document.removeEventListener(
          "pointerdown",
          handleClickOutside as EventListener
        );
    }
  }, [isPopoverOpen, handleClosePopover]);

  // Ensure popover input focuses and selects text right after opening
  useEffect(() => {
    if (!isPopoverOpen) return;
    const text = isMultiSelect ? searchQuery : value;
    // Defer to next paint to ensure the input is mounted
    requestAnimationFrame(() => {
      const input = popoverInputRef.current;
      if (!input) return;
      input.focus();
      if (text) {
        // Defer selection slightly to avoid races with focus/render
        setTimeout(() => input.select(), 0);
      }
    });
  }, [isPopoverOpen, isMultiSelect, searchQuery, value]);

  const normalInputRef = useRef<HTMLInputElement>(null);
  const popoverInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Select-all on first mouse click behavior
  const handleMouseDownSelectAll = (
    e: React.MouseEvent<HTMLInputElement>,
    inputRef: React.MutableRefObject<HTMLInputElement | null>,
    textToSelect: string
  ) => {
    const input = inputRef.current;
    if (!input) return;
    const isAlreadyFocused = document.activeElement === input;
    if (!isAlreadyFocused && textToSelect) {
      e.preventDefault();
      input.focus();
      // Select after focus is applied
      setTimeout(() => input.select(), 0);
    }
  };

  const handleFocusSelectAll = (
    inputRef: React.MutableRefObject<HTMLInputElement | null>,
    textToSelect: string
  ) => {
    const input = inputRef.current;
    if (!input || !textToSelect) return;
    // Defer to ensure DOM focus state is settled
    setTimeout(() => input.select(), 0);
  };

  const handleNormalInputClick = () => {
    // Add 200ms delay before opening popover
    setTimeout(() => {
      // Capture current value for potential revert if user doesn't commit
      valueOnOpenRef.current = value;
      wasCommittedRef.current = false;
      setIsPopoverOpen(true);
      // Clear any stale autocomplete when opening popover
      setAutoCompleteText("");
      // Clear highlighted display text when opening
      setHighlightedDisplayText("");
      // Only enter multi-select mode if we previously had multiple selections
      setIsMultiSelect(
        selectedLocations.length > 1 || selectedCities.length > 0
      );
      // Only set search query if not in multiselect mode
      if (selectedLocations.length <= 1 && selectedCities.length === 0) {
        setSearchQuery(value);
      } else {
        setSearchQuery("");
      }
      // Focus/selection handled in isPopoverOpen effect
    }, 35);
  };

  // Prevent normal input from receiving focus; open popover instead
  const handleNormalInputPointerDown = (
    e: React.PointerEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    handleNormalInputClick();
  };

  const handleNormalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Only clear autocomplete when input changes from outside the popover if we're not in popover
    if (!isPopoverOpen) {
      setAutoCompleteText("");
    }

    // Reset navigation state when user types
    resetNavigationState();

    if (newValue === "") {
      handleClosePopover();
    } else if (!isPopoverOpen) {
      // Add 200ms delay before opening popover
      setTimeout(() => {
        // Capture current value for potential revert if user doesn't commit
        valueOnOpenRef.current = value;
        wasCommittedRef.current = false;
        setIsPopoverOpen(true);
        // Only set search query if not in multiselect mode
        if (selectedLocations.length <= 1 && selectedCities.length === 0) {
          setSearchQuery(newValue);
        }
        setTimeout(() => {
          popoverInputRef.current?.focus();
        }, 0);
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Open popover from keyboard without focusing normal input selection
    if (
      !isPopoverOpen &&
      (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")
    ) {
      e.preventDefault();
      handleNormalInputClick();
      return;
    }

    // Handle backspace and delete keys to clear autocomplete immediately
    if (e.key === "Backspace" || e.key === "Delete") {
      // Only clear autocomplete if we're not in the middle of a search
      // This prevents flickering when backspacing
      const currentValue = isMultiSelect ? searchQuery : value;
      if (currentValue.length <= 1) {
        setAutoCompleteText("");
      }
      resetNavigationState();
    }

    // Get current suggestions for navigation
    const currentSuggestions =
      filteredSuggestions.length > 0
        ? filteredSuggestions
        : lastSearchSuggestions;

    // Get all navigable items (city groups + individual airports)
    const navigableItems = getAllNavigableItems(currentSuggestions);

    // Handle arrow key navigation
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (navigableItems.length > 0) {
        const newIndex =
          selectedSuggestionIndex < navigableItems.length - 1
            ? selectedSuggestionIndex + 1
            : 0;

        const selectedItem = navigableItems[newIndex];

        if (selectedItem) {
          setSelectedSuggestionIndex(newIndex);
          setSelectedAccordionIndex(selectedItem.cityIndex ?? -1);
          setSelectedAirportIndex(selectedItem.airportIndex ?? -1);
          // Clear autocomplete text when navigating
          // setAutoCompleteText("");
          // Update highlighted display text
          setHighlightedDisplayText(
            getSuggestionDisplayText(selectedItem.suggestion)
          );
        }
        setHasNavigatedToSuggestion(true);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (navigableItems.length > 0) {
        const newIndex =
          selectedSuggestionIndex > 0
            ? selectedSuggestionIndex - 1
            : navigableItems.length - 1;

        const selectedItem = navigableItems[newIndex];

        if (selectedItem) {
          setSelectedSuggestionIndex(newIndex);
          setSelectedAccordionIndex(selectedItem.cityIndex ?? -1);
          setSelectedAirportIndex(selectedItem.airportIndex ?? -1);
          // Clear autocomplete text when navigating
          // setAutoCompleteText("");
          // Update highlighted display text
          setHighlightedDisplayText(
            getSuggestionDisplayText(selectedItem.suggestion)
          );
        }
        setHasNavigatedToSuggestion(true);
      }
      return;
    }

    // Handle right arrow key to complete autocomplete text
    if (e.key === "ArrowRight" && autoCompleteText) {
      e.preventDefault();

      // Clear autocomplete preview immediately
      setAutoCompleteText("");
      resetNavigationState();

      if (!isMultiSelect) {
        // Normal mode: set the full text as the value
        onChange(autoCompleteText);
      } else {
        // Multi-select mode: display full text but keep suggestions visible
        if (currentSuggestions.length > 0) {
          const firstSuggestion = currentSuggestions[0];
          const searchableText = getSuggestionSearchableText(firstSuggestion);

          // Enable manual suggestions mode to prevent useEffect interference
          setManualSuggestionsMode(true);

          // Set the full autocomplete text for display
          setSearchQuery(autoCompleteText);

          // Immediately search with the searchable text to keep suggestions visible
          setTimeout(async () => {
            try {
              const suggestions = await searchAirports(searchableText);
              const limitedSuggestions = suggestions.slice(0, 15);
              setFilteredSuggestions(limitedSuggestions);
              setLastSearchSuggestions(limitedSuggestions);

              // Re-enable normal useEffect behavior after a short delay
              setTimeout(() => {
                setManualSuggestionsMode(false);
              }, 100);
            } catch {
              setManualSuggestionsMode(false);
            }
          }, 0);
        } else {
          // Fallback: just set the text
          setSearchQuery(autoCompleteText);
        }
      }

      return;
    }

    // Handle escape to close and revert uncommitted edits (Google Flights UX)
    if (e.key === "Escape") {
      e.preventDefault();
      handleClosePopover();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      // If user has navigated to a specific suggestion with arrow keys, use it
      if (
        hasNavigatedToSuggestion &&
        selectedSuggestionIndex >= 0 &&
        navigableItems.length > 0
      ) {
        const selectedItem = navigableItems[selectedSuggestionIndex];

        if (!selectedItem) return;

        if (!isMultiSelect) {
          // Use handleSuggestionClick for all suggestion types to ensure consistent behavior
          handleSuggestionClick(selectedItem.suggestion);
          handleClosePopover();
        } else {
          // In multi-select mode, Enter should behave like clicking the checkbox
          handleSuggestionClick(selectedItem.suggestion);

          // Clear search query but keep suggestions visible (like Google Flights)
          setSearchQuery("");
          setAutoCompleteText("");
          resetNavigationState();
          // Don't clear filteredSuggestions - keep them visible for more selections
          setTimeout(() => {
            popoverInputRef.current?.focus();
          }, 0);
        }
      } else {
        // User hasn't navigated to suggestions - use the top suggestion if available, otherwise clear
        if (navigableItems.length > 0) {
          // Use the top suggestion
          const topItem = navigableItems[0];

          if (topItem) {
            if (!isMultiSelect) {
              // Use handleSuggestionClick for all suggestion types to ensure consistent behavior
              handleSuggestionClick(topItem.suggestion);
              handleClosePopover();
            } else {
              // In multi-select mode, Enter should behave like clicking the checkbox
              handleSuggestionClick(topItem.suggestion);

              // Clear search query but keep suggestions visible (like Google Flights)
              setSearchQuery("");
              setAutoCompleteText("");
              resetNavigationState();
              // Don't clear filteredSuggestions - keep them visible for more selections
              setTimeout(() => {
                popoverInputRef.current?.focus();
              }, 0);
            }
          } else {
            // Fallback: clear the field if topItem is undefined
            if (!isMultiSelect) {
              onChange("");
              onCommit?.(""); // Trigger search with empty value
              wasCommittedRef.current = true;
              handleClosePopover();
            } else {
              // In multi-select mode, just clear the search query
              setSearchQuery("");
              setAutoCompleteText("");
              resetNavigationState();
              setTimeout(() => {
                popoverInputRef.current?.focus();
              }, 0);
            }
          }
        } else {
          // No suggestions available - clear the field
          if (!isMultiSelect) {
            onChange("");
            onCommit?.(""); // Trigger search with empty value
            wasCommittedRef.current = true;
            handleClosePopover();
          } else {
            // In multi-select mode, just clear the search query
            setSearchQuery("");
            setAutoCompleteText("");
            resetNavigationState();
            setTimeout(() => {
              popoverInputRef.current?.focus();
            }, 0);
          }
        }
      }
    }
  };

  // Modify handlePopoverInputChange to remove direct searchAirports call
  const handlePopoverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    if (!isMultiSelect) {
      onChange(newValue);
    }

    // Clear lastSearchSuggestions when starting a new search
    if (newValue !== value) {
      setLastSearchSuggestions([]);
    }

    // Only clear autocomplete if the new value is shorter than the current autocomplete
    // and doesn't match the beginning of the autocomplete text
    if (autoCompleteText && newValue.length < autoCompleteText.length) {
      if (!autoCompleteText.toLowerCase().startsWith(newValue.toLowerCase())) {
        setAutoCompleteText("");
      }
    }

    // Reset navigation state when user types (this will clear highlighted display text)
    resetNavigationState();

    if (!newValue) {
    }
  };

  const handleSuggestionClick = (
    suggestion: LocationSuggestion | CityWithAirports | DefaultSuggestion
  ) => {
    if (!isMultiSelect) {
      // Handle city suggestions consistently (both DefaultSuggestion and CityWithAirports)
      if ("airports" in suggestion) {
        // In normal mode, when clicking on a city group suggestion, save as city name (consistent with Enter key)
        const cityName = suggestion.name?.split(",")[0]?.trim() || ""; // Extract just the city name
        onChange(cityName);
        onCommit?.(cityName); // Trigger search when user clicks on selection
        wasCommittedRef.current = true;
        setSelectedLocations([]); // Clear selected locations since we're storing city name
      } else {
        const displayText = suggestion.data?.city
          ? `${suggestion.code}, ${suggestion.data.city}`
          : suggestion.name;
        onChange(displayText);
        onCommit?.(displayText); // Trigger search when user clicks on selection
        wasCommittedRef.current = true;
        setSelectedLocations([suggestion]);
      }
      handleClosePopover();
    } else {
      if ("airports" in suggestion) {
        // Handle city group selection
        const allSelected = suggestion.airports.every((airport) =>
          selectedLocations.some((loc) => loc.id === airport.id)
        );

        let newLocations: LocationSuggestion[];
        if (allSelected) {
          // Remove all airports of this city
          newLocations = selectedLocations.filter(
            (loc) =>
              !suggestion.airports.some((airport) => airport.id === loc.id)
          );
        } else {
          // Add all airports of this city that aren't already selected
          const airportsToAdd = suggestion.airports.filter(
            (airport) => !selectedLocations.some((loc) => loc.id === airport.id)
          );
          newLocations = [...selectedLocations, ...airportsToAdd];
        }

        setSelectedLocations(newLocations);
        const selectedNames = newLocations.map((loc) => loc.name).join(", ");
        onChange(selectedNames);
      } else {
        // Handle individual location selection
        const isSelected = selectedLocations.some(
          (loc) => loc.id === suggestion.id
        );
        let newLocations: LocationSuggestion[];

        if (isSelected) {
          newLocations = selectedLocations.filter(
            (loc) => loc.id !== suggestion.id
          );
        } else {
          newLocations = [...selectedLocations, suggestion];
        }

        setSelectedLocations(newLocations);
        const selectedNames = newLocations.map((loc) => loc.name).join(", ");
        onChange(selectedNames);
      }

      // Don't clear search query in multi-select mode
      if (!isMultiSelect) {
        setSearchQuery("");
      }

      setTimeout(() => {
        popoverInputRef.current?.focus();
      }, 0);
    }
  };

  const handlePlusClick = () => {
    setIsMultiSelect(true);
    // Preserve the current input value when switching to multi-select mode
    setSearchQuery(value || "");
  };

  const handleConfirmSelection = () => {
    if (selectedLocations.length > 0 || selectedCities.length > 0) {
      const displayParts = [
        ...selectedCities.map((city) => city.name),
        ...selectedLocations
          .filter(
            (loc) =>
              !selectedCities.some((city) =>
                city.airports.some((airport) => airport.id === loc.id)
              )
          )
          .map((loc) => {
            // Format each location consistently with single-select mode
            return loc.data?.city ? `${loc.code}, ${loc.data.city}` : loc.name;
          }),
      ];
      const displayText = displayParts.filter(Boolean).join(" • ");
      onChange(displayText || ""); // Ensure we never pass undefined
    } else {
      onChange(""); // Clear the input if no selections
    }
    handleClosePopover();
    setIsMultiSelect(false);
    setSearchQuery("");
    setTimeout(() => {
      popoverInputRef.current?.focus();
    }, 0);
  };

  const removePill = (locationId: string) => {
    const newLocations = selectedLocations.filter(
      (loc) => loc.id !== locationId
    );
    setSelectedLocations(newLocations);
    const selectedNames = newLocations.map((loc) => loc.name).join(", ");
    onChange(newLocations.length > 0 ? selectedNames : "");
  };

  // Add effect to clear autocomplete when closing popover
  useEffect(() => {
    if (!isPopoverOpen) {
      setAutoCompleteText("");
    }
  }, [isPopoverOpen]);

  return (
    <div ref={containerRef} className="relative flex-1 h-full">
      {/* Normal Input */}
      <div
        className={`relative border rounded-sm text-[#C2C6CA] bg-transparent h-full transition-colors duration-200 ${
          isClicked
            ? "border-[#669DF6]"
            : isHovered
              ? "border-[#9AA0A6]"
              : "border-[#5f6368]"
        }`}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        onClick={() => onClick?.()}
      >
        {(() => {
          // Show formatted display only in normal input (not in popover)
          // Format: "City Name, CODE" with different styles
          if (isPopoverOpen) return null;
          const text = value || "";
          // Detect patterns like "CODE, City Name" to flip for display
          const matchCodeFirst = text.match(/^([A-Z]{3,4})\s*,\s*(.+)$/);
          // Detect already desired format "City Name, CODE"
          const matchCityFirst = text.match(/^(.+?)\s*,\s*([A-Z]{3,4})$/);
          let cityPart: string | undefined;
          let codePart: string | undefined;
          if (matchCodeFirst) {
            codePart = matchCodeFirst[1];
            cityPart = matchCodeFirst[2];
          } else if (matchCityFirst) {
            cityPart = matchCityFirst[1];
            codePart = matchCityFirst[2];
          }

          if (!cityPart || !codePart) return null;

          return (
            <div className="pointer-events-none absolute inset-0 flex items-center pl-14 pr-3 overflow-hidden">
              <div>
                <span className="truncate">{cityPart}</span>
                <span className="ml-1 text-[#9AA0A6] whitespace-nowrap text-xs">
                  {codePart}
                </span>
              </div>
            </div>
          );
        })()}
        {isDestination ? (
          <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#C2C6CA]" />
        ) : (
          <Circle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-3 w-3 text-[#C2C6CA]" />
        )}
        <Input
          ref={normalInputRef}
          value={value}
          onChange={handleNormalInputChange}
          onClick={undefined}
          onPointerDown={handleNormalInputPointerDown}
          onKeyDown={handleKeyDown}
          className={(() => {
            const text = value || "";
            const overlayActive =
              !isPopoverOpen &&
              (/^([A-Z]{3,4})\s*,\s*(.+)$/.test(text) ||
                /^(.+?)\s*,\s*([A-Z]{3,4})$/.test(text));
            return `pl-14 ${overlayActive ? "text-transparent" : "text-[#C2C6CA]"} placeholder:text-[#C2C6CA] bg-transparent border-0 outline-none ring-0 focus-visible:ring-0 h-full`;
          })()}
          style={{ fontSize: "16px", caretColor: "transparent" }}
          placeholder={placeholder}
        />
      </div>

      {/* Popover */}
      {isPopoverOpen && (
        <div
          ref={popoverRef}
          className="absolute top-0 left-0 -right-36 z-50 bg-[#3B3B3F] rounded-sm shadow-[0_0_20px_rgba(0,0,0,0.3)]"
        >
          {/* Enhanced Input */}
          <div className="relative border-b border-[#5F6368] bg-[#3B3B3F] rounded-t-sm min-h-[53px]">
            {isDestination ? (
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#C2C6CA] z-10" />
            ) : (
              <Circle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-3 w-3 text-[#C2C6CA] z-10" />
            )}

            {/* Input container with pills */}
            <div className="flex min-h-[56px] mx-1 items-center flex-wrap gap-1 px-12 py-2">
              {/* Selected location pills */}
              {isMultiSelect &&
                selectedLocations.map((location) => {
                  // Check if this location is part of a city group (multiple airports from same city selected)
                  const cityGroupsData = selectedLocations.reduce(
                    (
                      cityGroups: { [cityKey: string]: LocationSuggestion[] },
                      airport
                    ) => {
                      if (airport.data?.city && airport.data?.country) {
                        const cityKey = `${airport.data.city}-${airport.data.country}`;
                        if (!cityGroups[cityKey]) {
                          cityGroups[cityKey] = [];
                        }
                        cityGroups[cityKey].push(airport);
                      }
                      return cityGroups;
                    },
                    {}
                  );

                  const locationCityKey =
                    location.data?.city && location.data?.country
                      ? `${location.data.city}-${location.data.country}`
                      : null;

                  const isPartOfCityGroup =
                    locationCityKey &&
                    cityGroupsData[locationCityKey] &&
                    cityGroupsData[locationCityKey].length > 1;

                  // If it's part of a city group with multiple airports, don't show individual airport
                  if (isPartOfCityGroup) {
                    return null;
                  }

                  // For individual airports, show code and city
                  const displayText = location.data?.city
                    ? `${location.code}, ${location.data.city}`
                    : location.name;

                  return (
                    <div
                      key={location.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[#36373A] text-[#C2C6CA] border border-[#C2C6CA] text-sm rounded-full whitespace-nowrap"
                    >
                      <span className="max-w-[150px] truncate">
                        {displayText}
                      </span>
                      <Button
                        onClick={() => removePill(location.id)}
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 rounded-full flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}

              {/* Show city group pills */}
              {isMultiSelect &&
                Object.entries(
                  selectedLocations
                    // Group selected airports by city
                    .reduce(
                      (
                        cityGroups: {
                          [cityKey: string]: {
                            name: string;
                            airports: LocationSuggestion[];
                          };
                        },
                        airport
                      ) => {
                        if (airport.data?.city && airport.data?.country) {
                          const cityKey = `${airport.data.city}-${airport.data.country}`;
                          if (!cityGroups[cityKey]) {
                            const cityName = [
                              airport.data.city,
                              airport.data.state_name,
                              airport.data.country,
                            ]
                              .filter(Boolean)
                              .join(", ");
                            cityGroups[cityKey] = {
                              name: cityName,
                              airports: [],
                            };
                          }
                          cityGroups[cityKey].airports.push(airport);
                        }
                        return cityGroups;
                      },
                      {}
                    )
                )
                  // Filter for cities with multiple airports
                  .filter(([, cityData]) => cityData.airports.length > 1)
                  // Convert to the format expected by the UI
                  .map(([cityKey, cityData]) => ({ id: cityKey, ...cityData }))
                  .map((cityGroup) => (
                    <div
                      key={cityGroup.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[#36373A] text-[#C2C6CA] border border-[#C2C6CA] text-sm rounded-full whitespace-nowrap"
                    >
                      <span className="max-w-[150px] truncate">
                        {cityGroup.name.split(",")[0]}{" "}
                        {/* Only show city name */}
                      </span>
                      <Button
                        onClick={() => {
                          // Remove all airports of this city
                          const newLocations = selectedLocations.filter(
                            (loc) =>
                              !cityGroup.airports.some(
                                (airport) => airport.id === loc.id
                              )
                          );
                          setSelectedLocations(newLocations);
                          const selectedNames = newLocations
                            .map((loc) => loc.name)
                            .join(", ");
                          onChange(selectedNames);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 rounded-full flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

              {/* Add container for input and autocomplete */}
              <div className="relative flex-1 min-w-[250px]">
                {/* Autocomplete preview - only show when not navigating with arrow keys */}
                {autoCompleteText && !hasNavigatedToSuggestion && (
                  <div className="absolute inset-0 flex items-center pointer-events-none pr-12 whitespace-nowrap overflow-hidden">
                    <span
                      className="opacity-0 whitespace-pre font-[inherit]"
                      style={{
                        fontSize: "16px",
                        fontFamily: "inherit",
                        lineHeight: "inherit",
                      }}
                    >
                      {isMultiSelect ? searchQuery : value}
                    </span>
                    <span
                      className="text-[#C2C6CA] whitespace-pre font-[inherit]"
                      style={{
                        fontSize: "16px",
                        fontFamily: "inherit",
                        lineHeight: "inherit",
                      }}
                    >
                      {autoCompleteText.slice(
                        (isMultiSelect ? searchQuery : value).length
                      )}
                    </span>
                  </div>
                )}

                {/* Search input */}
                <Input
                  ref={popoverInputRef}
                  value={
                    hasNavigatedToSuggestion && highlightedDisplayText
                      ? highlightedDisplayText
                      : isMultiSelect
                        ? searchQuery
                        : value
                  }
                  onChange={handlePopoverInputChange}
                  onFocus={() =>
                    handleFocusSelectAll(
                      popoverInputRef,
                      isMultiSelect ? searchQuery : value
                    )
                  }
                  onMouseDown={(e) =>
                    handleMouseDownSelectAll(
                      e,
                      popoverInputRef,
                      isMultiSelect ? searchQuery : value
                    )
                  }
                  onKeyDown={handleKeyDown}
                  className="flex-1 w-full text-[#C2C6CA] placeholder:text-[#C2C6CA] bg-transparent border-0 outline-none ring-0 focus-visible:ring-0 p-0 h-full scrollbar-hide relative z-10 pr-0 whitespace-pre font-[inherit]"
                  style={{
                    fontSize: "16px",
                    fontFamily: "inherit",
                    lineHeight: "inherit",
                  }}
                  placeholder={isMultiSelect ? "Where else?" : placeholder}
                />
              </div>
            </div>

            {/* Plus or Check button */}
            <div className="absolute right-3 top-7 transform -translate-y-1/2">
              {!isMultiSelect ? (
                <Button
                  onClick={handlePlusClick}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  tabIndex={-1}
                  onKeyDown={(e) => {
                    // Prevent the button from interfering with keyboard navigation
                    if (
                      e.key === "ArrowDown" ||
                      e.key === "ArrowUp" ||
                      e.key === "Enter"
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                      // Only refocus if not already focused on input
                      const input = popoverInputRef.current;
                      if (input && document.activeElement !== input) {
                        input.focus();
                      }
                      // Create a new keyboard event for the input
                      const inputEvent = new KeyboardEvent("keydown", {
                        key: e.key,
                        code: e.code,
                        shiftKey: e.shiftKey,
                        ctrlKey: e.ctrlKey,
                        altKey: e.altKey,
                        metaKey: e.metaKey,
                        bubbles: true,
                        cancelable: true,
                      });
                      input?.dispatchEvent(inputEvent);
                    }
                  }}
                >
                  <Plus className="!size-6 text-[#C2C6CA]" />
                </Button>
              ) : (
                <Button
                  onClick={handleConfirmSelection}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 rounded-full bg-[#8AB4F8]"
                  tabIndex={-1}
                  onKeyDown={(e) => {
                    // Prevent the button from interfering with keyboard navigation
                    if (
                      e.key === "ArrowDown" ||
                      e.key === "ArrowUp" ||
                      e.key === "Enter"
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                      // Only refocus if not already focused on input
                      const input = popoverInputRef.current;
                      if (input && document.activeElement !== input) {
                        input.focus();
                      }
                      // Create a new keyboard event for the input
                      const inputEvent = new KeyboardEvent("keydown", {
                        key: e.key,
                        code: e.code,
                        shiftKey: e.shiftKey,
                        ctrlKey: e.ctrlKey,
                        altKey: e.altKey,
                        metaKey: e.metaKey,
                        bubbles: true,
                        cancelable: true,
                      });
                      input?.dispatchEvent(inputEvent);
                    }
                  }}
                >
                  <Check className="!size-6 text-[#37383B]" />
                </Button>
              )}
            </div>
          </div>

          {/* Suggestions */}
          <div className="">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((suggestion, index) => {
                if ("airports" in suggestion) {
                  // City with airports group
                  const isHighlighted =
                    selectedAccordionIndex === index &&
                    selectedAirportIndex === -1;
                  return (
                    <Accordion
                      key={suggestion.id}
                      type="single"
                      collapsible
                      className="w-full"
                      value={openAccordionId || ""}
                      onValueChange={setOpenAccordionId}
                    >
                      <AccordionItem value={suggestion.id} className="border-0">
                        <AccordionTrigger
                          className={cn(
                            "flex items-center gap-3 w-full p-4 text-left [&[data-state=open]>svg]:rotate-180 no-underline",
                            isHighlighted
                              ? "bg-[#5e5f62] hover:bg-[#5e5f62]"
                              : "bg-[#37383B] hover:bg-[#5E5F62] data-[state=open]:bg-[#37383B] data-[state=open]:hover:bg-[#5E5F62]"
                          )}
                        >
                          <div
                            className="flex items-center gap-3 flex-1 min-w-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSuggestionClick(suggestion);
                            }}
                          >
                            {isMultiSelect ? (
                              <div
                                className={`w-4 h-4 border rounded ${
                                  suggestion.airports.every((airport) =>
                                    selectedLocations.some(
                                      (loc) => loc.id === airport.id
                                    )
                                  )
                                    ? "bg-[#4285F4] border-[#4285F4]"
                                    : suggestion.airports.some((airport) =>
                                          selectedLocations.some(
                                            (loc) => loc.id === airport.id
                                          )
                                        )
                                      ? "bg-[#4285F4] border-[#4285F4] opacity-50"
                                      : "border-[#C2C6CA]"
                                } flex items-center justify-center`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const allSelected = suggestion.airports.every(
                                    (airport) =>
                                      selectedLocations.some(
                                        (loc) => loc.id === airport.id
                                      )
                                  );

                                  let newLocations: LocationSuggestion[];
                                  if (allSelected) {
                                    // Remove all airports of this city
                                    newLocations = selectedLocations.filter(
                                      (loc) =>
                                        !suggestion.airports.some(
                                          (airport) => airport.id === loc.id
                                        )
                                    );
                                  } else {
                                    // Add all airports of this city that aren't already selected
                                    const airportsToAdd =
                                      suggestion.airports.filter(
                                        (airport) =>
                                          !selectedLocations.some(
                                            (loc) => loc.id === airport.id
                                          )
                                      );
                                    newLocations = [
                                      ...selectedLocations,
                                      ...airportsToAdd,
                                    ];
                                  }

                                  setSelectedLocations(newLocations);
                                  const selectedNames = newLocations
                                    .map((loc) => loc.name)
                                    .join(", ");
                                  onChange(selectedNames);
                                }}
                              >
                                {suggestion.airports.every((airport) =>
                                  selectedLocations.some(
                                    (loc) => loc.id === airport.id
                                  )
                                ) && <Check className="h-3 w-3 text-white" />}
                              </div>
                            ) : (
                              <MapPin className="h-5 w-5 text-[#C2C6CA] flex-shrink-0" />
                            )}
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-white text-[16px] font-normal truncate">
                                {suggestion.name}
                              </span>
                              <span className="text-[#9AA0A6] text-sm truncate">
                                {suggestion.description}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-[#37383B]">
                          <div>
                            {suggestion.airports.map(
                              (airport, airportIndex) => {
                                const isAirportHighlighted =
                                  selectedAccordionIndex === index &&
                                  selectedAirportIndex === airportIndex;
                                return (
                                  <Button
                                    key={airport.id}
                                    variant="ghost"
                                    className={cn(
                                      "w-full justify-start p-4 h-auto bg-[#37383B] text-left rounded-none border-0 pl-12 hover:bg-[#5e5f62]",
                                      isAirportHighlighted
                                        ? "bg-[#5e5f62] hover:bg-[#5e5f62]"
                                        : ""
                                    )}
                                    onClick={() =>
                                      handleSuggestionClick(airport)
                                    }
                                  >
                                    <div className="flex items-center gap-3 w-full">
                                      <div className="flex-shrink-0">
                                        {isMultiSelect ? (
                                          <div
                                            className={`w-4 h-4 border rounded ${
                                              selectedLocations.some(
                                                (loc) => loc.id === airport.id
                                              )
                                                ? "bg-[#4285F4] border-[#4285F4]"
                                                : "border-[#C2C6CA]"
                                            } flex items-center justify-center`}
                                          >
                                            {selectedLocations.some(
                                              (loc) => loc.id === airport.id
                                            ) && (
                                              <Check className="h-3 w-3 text-white" />
                                            )}
                                          </div>
                                        ) : (
                                          // <Plane className="h-4 w-4 text-[#C2C6CA]" />
                                          <svg
                                            className="!size-[28px]"
                                            xmlns="http://www.w3.org/2000/svg"
                                            height="30px"
                                            viewBox="0 -960 960 960"
                                            width="30px"
                                            fill="#e3e3e3"
                                          >
                                            <path d="M308.46-120v-61.54l113.85-80.15v-173.23L120-313.08v-78.46l302.31-213.23v-177.54q0-23.77 16.96-40.73Q456.23-840 480-840q23.77 0 40.73 16.96 16.96 16.96 16.96 40.73v177.54L840-391.54v78.46L537.69-434.92v173.23l113.08 80.15V-120L480-172.31 308.46-120Z" />
                                          </svg>
                                        )}
                                      </div>
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-white text-[16px] font-normal truncate">
                                            {airport.name}
                                          </span>
                                          {airport.code && (
                                            <span className="text-[#8AB4F8] text-sm font-normal">
                                              {airport.code}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[#9AA0A6] text-sm truncate">
                                          {airport.description}
                                        </div>
                                      </div>
                                    </div>
                                  </Button>
                                );
                              }
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                } else {
                  // Single airport suggestion
                  const isSelected = selectedLocations.some(
                    (loc) => loc.id === suggestion.id
                  );
                  const isHighlighted =
                    selectedAccordionIndex === index &&
                    selectedAirportIndex === -1;

                  return (
                    <Button
                      key={suggestion.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start p-4 h-auto text-left rounded-none border-0 ",
                        isHighlighted ? "bg-[#5e5f62]" : "hover:bg-[#5e5f62]"
                      )}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-shrink-0">
                          {isMultiSelect ? (
                            <div
                              className={`w-4 h-4 border rounded ${
                                isSelected
                                  ? "bg-[#4285F4] border-[#4285F4]"
                                  : "border-[#C2C6CA]"
                              } flex items-center justify-center`}
                            >
                              {isSelected && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                          ) : (
                            // <Plane className="h-4 w-4 text-[#C2C6CA]" />
                            <svg
                              className="!size-[28px]"
                              xmlns="http://www.w3.org/2000/svg"
                              height="30px"
                              viewBox="0 -960 960 960"
                              width="30px"
                              fill="#e3e3e3"
                            >
                              <path d="M308.46-120v-61.54l113.85-80.15v-173.23L120-313.08v-78.46l302.31-213.23v-177.54q0-23.77 16.96-40.73Q456.23-840 480-840q23.77 0 40.73 16.96 16.96 16.96 16.96 40.73v177.54L840-391.54v78.46L537.69-434.92v173.23l113.08 80.15V-120L480-172.31 308.46-120Z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-normal text-[16px] truncate">
                              {suggestion.name}
                            </span>
                            {suggestion.code && (
                              <span className="text-[#8AB4F8] text-sm font-normal">
                                {suggestion.code}
                              </span>
                            )}
                          </div>
                          <div className="text-[#9AA0A6] text-sm truncate">
                            {suggestion.description}
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                }
              })
            ) : (
              <div className="p-4 text-center">
                <span className="text-[#9AA0A6] text-sm">
                  No matching locations found
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
