/**
 * Hook for managing URL state synchronization
 * 
 * Provides utilities to sync application state with URL parameters
 * enabling proper browser back/forward navigation and shareable URLs
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import {
  FlightSearchParams,
  FilterParams,
  encodeFlightSearchToUrl,
  decodeFlightSearchFromUrl,
  encodeFiltersToUrl,
  decodeFiltersFromUrl,
  createShareableUrl
} from '@/lib/utils/url-state'

/**
 * Hook for managing flight search state in URL parameters
 */
export function useFlightSearchUrlState() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  /**
   * Updates URL with new search parameters
   */
  const updateUrlWithSearchParams = useCallback(
    (params: FlightSearchParams, replace = false) => {
      const urlParams = encodeFlightSearchToUrl(params)
      const newUrl = `${pathname}?${urlParams.toString()}`
      
      if (replace) {
        router.replace(newUrl)
      } else {
        router.push(newUrl)
      }
    },
    [router, pathname]
  )

  /**
   * Updates URL with new filter parameters (preserves existing search params)
   */
  const updateUrlWithFilters = useCallback(
    (filters: FilterParams, replace = true) => {
      const currentParams = new URLSearchParams(searchParams)
      const filterParams = encodeFiltersToUrl(filters)
      
      // Remove existing filter parameters
      const filterKeys = ['stops', 'airlines', 'price', 'dt', 'at', 'dur', 'em', 'ca']
      filterKeys.forEach(key => currentParams.delete(key))
      
      // Add new filter parameters
      filterParams.forEach((value, key) => {
        currentParams.set(key, value)
      })
      
      const newUrl = `${pathname}?${currentParams.toString()}`
      
      if (replace) {
        router.replace(newUrl)
      } else {
        router.push(newUrl)
      }
    },
    [router, pathname, searchParams]
  )

  /**
   * Reads current search parameters from URL
   */
  const getSearchParamsFromUrl = useCallback((): Partial<FlightSearchParams> => {
    return decodeFlightSearchFromUrl(searchParams)
  }, [searchParams])

  /**
   * Reads current filter parameters from URL
   */
  const getFiltersFromUrl = useCallback((): Partial<FilterParams> => {
    return decodeFiltersFromUrl(searchParams)
  }, [searchParams])

  /**
   * Navigates to search results with given parameters
   */
  const navigateToSearch = useCallback(
    (params: FlightSearchParams, filters?: FilterParams) => {
      const urlParams = encodeFlightSearchToUrl(params)
      
      if (filters) {
        const filterParams = encodeFiltersToUrl(filters)
        filterParams.forEach((value, key) => {
          urlParams.set(key, value)
        })
      }
      
      router.push(`/search?${urlParams.toString()}`)
    },
    [router]
  )

  /**
   * Creates a shareable URL for the current state
   */
  const getShareableUrl = useCallback(
    (params: FlightSearchParams, filters?: FilterParams): string => {
      const baseUrl = `${window.location.origin}/search`
      return createShareableUrl(baseUrl, params, filters)
    },
    []
  )

  /**
   * Clears all URL parameters and navigates to clean URL
   */
  const clearUrlParams = useCallback(() => {
    router.replace(pathname)
  }, [router, pathname])

  return {
    updateUrlWithSearchParams,
    updateUrlWithFilters,
    getSearchParamsFromUrl,
    getFiltersFromUrl,
    navigateToSearch,
    getShareableUrl,
    clearUrlParams,
    hasUrlParams: searchParams.toString().length > 0
  }
}

/**
 * Hook for copying shareable URL to clipboard
 */
export function useShareUrl() {
  const { getShareableUrl } = useFlightSearchUrlState()

  const shareSearch = useCallback(
    async (params: FlightSearchParams, filters?: FilterParams): Promise<boolean> => {
      try {
        const url = getShareableUrl(params, filters)
        await navigator.clipboard.writeText(url)
        return true
      } catch (error) {
        return false
      }
    },
    [getShareableUrl]
  )

  const shareCurrentPage = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      return true
    } catch (error) {
      return false
    }
  }, [])

  return {
    shareSearch,
    shareCurrentPage
  }
}

/**
 * Hook that syncs URL parameters with component state on mount
 * Use this to initialize state from URL when component mounts
 */
export function useUrlStateSync<T>(
  currentState: T,
  setState: (state: T) => void,
  encodeState: (state: T) => URLSearchParams,
  decodeState: (params: URLSearchParams) => Partial<T>,
  dependencies: any[] = []
) {
  const searchParams = useSearchParams()
  const { updateUrlWithSearchParams } = useFlightSearchUrlState()

  // Initialize state from URL on mount
  useEffect(() => {
    const urlState = decodeState(searchParams)
    if (Object.keys(urlState).length > 0) {
      setState({ ...currentState, ...urlState })
    }
  }, []) // Only run on mount

  // Update URL when state changes (but not on initial load)
  useEffect(() => {
    const urlParams = encodeState(currentState)
    if (urlParams.toString() !== searchParams.toString()) {
      // Only update if there's an actual difference
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`
      window.history.replaceState({}, '', newUrl)
    }
  }, [currentState, ...dependencies])
}