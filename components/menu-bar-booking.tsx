"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useFlight } from "@/providers/flight-provider";
import { MenuBarBase } from "./menu-bar-base";

export function MenuBarBooking() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tripType } = useFlight();

  const handleBack = () => {
    // For one-way trips, just go back
    if (tripType === "one-way") {
      router.back();
    } else {
      // For round-trip/multi-city, we want to go back to selecting return flight
      // but keep all the search parameters and selected flights
      const currentParams = new URLSearchParams(searchParams.toString());
      currentParams.set('selecting', 'return');
      router.push(`/search?${currentParams.toString()}`);
    }
  };

  const leftContent = (
    <Button 
      variant="ghost" 
      size="icon" 
      className="hover:bg-gray-700/50 rounded-full"
      onClick={handleBack}
    >
      <ArrowLeft className="h-5 w-5 text-gray-200" />
    </Button>
  );

  return <MenuBarBase leftContent={leftContent} />;
}
