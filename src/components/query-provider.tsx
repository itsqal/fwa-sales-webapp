"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiRequestError } from "@/lib/api/client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // These screens are records of custody between three companies. A
            // stale list is misleading, so refetch on focus and keep the window
            // short rather than serving cached rows for minutes.
            staleTime: 15_000,
            refetchOnWindowFocus: true,
            retry: (failureCount, error) => {
              if (error instanceof ApiRequestError) {
                // 4xx will not become a 2xx by asking again.
                if (error.status >= 400 && error.status < 500) return false;
              }
              return failureCount < 2;
            },
          },
          mutations: {
            // Never retry a write automatically: the ones that are safe to retry
            // carry an Idempotency-Key and are retried deliberately by the user.
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
