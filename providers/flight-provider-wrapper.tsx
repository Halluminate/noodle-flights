"use client";

import { Suspense } from "react";
import { FlightProvider } from "./flight-provider";
import { ReactQueryProvider } from "./react-query-provider";

// Fallback component for Suspense
function FlightProviderFallback() {
  return (
    <div className="min-h-screen bg-[#202124] flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}

// Wrapper component that provides Suspense boundary for useSearchParams
export function FlightProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FlightProviderFallback />}>
      <ReactQueryProvider>
        <FlightProvider>
          {children}
        </FlightProvider>
      </ReactQueryProvider>
    </Suspense>
  );
}