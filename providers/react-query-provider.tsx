"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

/**
 * React Query provider placed high in the tree so that any component / hook
 * can call `useQuery` or `useMutation` without re-creating the client.
 *
 * We memoise the QueryClient instance so it survives client navigations and
 * hot-reloads.  Stale time is bumped to 5 minutes which is usually acceptable
 * for flight search results while keeping the UI responsive.
 */
export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 min
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
