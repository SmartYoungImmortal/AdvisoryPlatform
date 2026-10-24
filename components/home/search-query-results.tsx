"use client";

import { useSearchParams } from "next/navigation";

import { SearchScreen } from "@/components/search/search-screen";

/**
 * `/search` with the query read off the URL. The site is a static export, so
 * the query cannot reach the page on the server; it is read here on the client
 * and handed down. `useSearchParams` needs a Suspense boundary around it under
 * a static export, which `app/(advisee)/(app)/search/page.tsx` supplies.
 */
export function SearchQueryResults() {
  const query = useSearchParams().get("q") ?? undefined;
  return <SearchScreen query={query} />;
}
