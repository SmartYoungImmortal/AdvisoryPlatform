import { Suspense } from "react";

import { SearchQueryResults } from "@/components/home/search-query-results";
import { SearchScreen } from "@/components/search/search-screen";

export default function SearchResultsPage() {
  // The fallback is the screen without a query: what the export prerenders,
  // and what shows for the moment before the URL is read.
  return (
    <Suspense fallback={<SearchScreen />}>
      <SearchQueryResults />
    </Suspense>
  );
}
