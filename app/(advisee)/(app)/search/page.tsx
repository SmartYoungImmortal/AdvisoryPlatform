import { Suspense } from "react";

import { SearchQueryResults } from "@/components/home/search-query-results";
import { SearchResultsScreen } from "@/components/home/search-results-screen";

export default function SearchResultsPage() {
  // The fallback is the screen without a query: what the export prerenders,
  // and what shows for the moment before the URL is read.
  return (
    <Suspense fallback={<SearchResultsScreen />}>
      <SearchQueryResults />
    </Suspense>
  );
}
