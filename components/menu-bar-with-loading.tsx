"use client";

import { MenuBar } from "./menu-bar";
import { MenuBarBooking } from "./menu-bar-booking";
import { LoadingIndicator } from "./ui/loading-indicator";
import { useIsFetching } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function MenuBarWithLoading() {
  const pathname = usePathname();
  const isFetching = useIsFetching({ queryKey: ["flights"] });
  const [hasNavigatedToSearch, setHasNavigatedToSearch] = useState(false);
  
  // Track if we've navigated to search page (not just landed on root with params)
  useEffect(() => {
    if (pathname === "/search") {
      setHasNavigatedToSearch(true);
    }
  }, [pathname]);
  
  // Only show loading indicator on search page after navigation, not on initial root load
  const showLoading = pathname === "/search" && isFetching > 0 && hasNavigatedToSearch;

  // Use different menu bar for booking page
  const isBookingPage = pathname === "/booking";

  return (
    <div className="relative">
      {isBookingPage ? <MenuBarBooking /> : <MenuBar />}
      <LoadingIndicator isLoading={showLoading} />
    </div>
  );
}
