import { useState, useCallback, useRef } from 'react';

interface AirportLookupResponse {
  location: string;
  airportCode: string;
  fallback: string;
}

interface AirportLookupError {
  error: string;
}

// Client-side cache to avoid repeated API calls
const clientCache = new Map<string, string>();

export function useAirportLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const lookupAirport = useCallback(async (
    location: string | undefined, 
    fallback: string = 'SFO'
  ): Promise<string> => {
    if (!location) return fallback;
    
    // Check client cache first
    const cacheKey = `${location}:${fallback}`;
    if (clientCache.has(cacheKey)) {
      return clientCache.get(cacheKey)!;
    }
    
    // If it looks like an airport code, return it directly
    const firstPart = location.split(',')[0]?.trim() || '';
    if (/^[A-Z]{2,4}$/.test(firstPart)) {
      clientCache.set(cacheKey, firstPart);
      return firstPart;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const params = new URLSearchParams({
        location,
        fallback
      });
      
      const response = await fetch(`/api/airports/lookup?${params}`, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: AirportLookupResponse = await response.json();
      
      // Cache the result
      clientCache.set(cacheKey, data.airportCode);
      
      return data.airportCode;
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, return fallback
        return fallback;
      }
      
      console.error('Airport lookup error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Return fallback on error
      return fallback;
      
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);
  
  const clearCache = useCallback(() => {
    clientCache.clear();
  }, []);
  
  return {
    lookupAirport,
    isLoading,
    error,
    clearCache
  };
}
