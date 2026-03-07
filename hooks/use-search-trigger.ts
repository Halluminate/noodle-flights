import { useState, useCallback, useRef } from 'react'

interface SearchTriggerReturn {
  triggerSearch: () => number
  isSearching: boolean
  searchId: number
  setIsSearching: (value: boolean) => void
}

export function useSearchTrigger(): SearchTriggerReturn {
  const [isSearching, setIsSearching] = useState(false)
  const searchIdRef = useRef(0)
  const [currentSearchId, setCurrentSearchId] = useState(0)
  
  const triggerSearch = useCallback(() => {
    searchIdRef.current += 1
    setCurrentSearchId(searchIdRef.current)
    setIsSearching(true)
    return searchIdRef.current
  }, [])
  
  return { 
    triggerSearch, 
    isSearching, 
    searchId: currentSearchId,
    setIsSearching 
  }
}