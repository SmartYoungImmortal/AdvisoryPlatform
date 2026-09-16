"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Nexus's `useCmsList`, for an in-memory collection: search, filters, sort and
 * paging, with the page, search, sort and filters kept in the query string the
 * way Nexus keeps them (`?page=2&q=...`) — a filtered list is linkable and
 * survives a reload.
 */
export type SortState = { readonly id: string; readonly desc: boolean } | null;

export type ListFilter<Row> = {
  readonly key: string;
  /** Row passes when the filter has no value, or when this says so. */
  readonly test: (row: Row, values: readonly string[]) => boolean;
};

export type ListOptions<Row> = {
  /** Text the search box matches against, lowercased. */
  readonly searchText: (row: Row) => string;
  readonly sortValue?: (row: Row, columnId: string) => string | number;
  readonly filters?: ReadonlyArray<ListFilter<Row>>;
  readonly defaultPerPage?: number;
  /** Query-string keys owned by the page, left alone by this hook. */
  readonly prefix?: string;
};

export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

function parseSort(raw: string | null): SortState {
  if (!raw) return null;
  const desc = raw.startsWith("-");
  return { id: desc ? raw.slice(1) : raw, desc };
}

export function useCmsList<Row extends { readonly id: string }>(
  rows: readonly Row[],
  options: ListOptions<Row>,
) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const prefix = options.prefix ?? "";
  const key = useCallback((name: string) => `${prefix}${name}`, [prefix]);

  // The box holds its own text and writes the URL once typing pauses: reading it
  // back from the URL on every keystroke dropped characters mid-word.
  const [search, setSearchText] = useState(() => params.get(key("q")) ?? "");
  const page = Math.max(1, Number(params.get(key("page")) ?? "1") || 1);
  const perPage = Number(params.get(key("perPage"))) || options.defaultPerPage || 10;
  const sort = parseSort(params.get(key("sort")));
  const filterValues = useMemo(() => {
    const values: Record<string, readonly string[]> = {};
    for (const filter of options.filters ?? []) {
      const raw = params.get(key(filter.key));
      values[filter.key] = raw ? raw.split(",") : [];
    }
    return values;
  }, [key, options.filters, params]);

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const patch = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [name, value] of Object.entries(changes)) {
        if (value === null || value === "") next.delete(key(name));
        else next.set(key(name), value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [key, params, pathname, router],
  );

  const patchRef = useRef(patch);
  useEffect(() => {
    patchRef.current = patch;
  }, [patch]);
  const searchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !options.searchText(row).toLowerCase().includes(needle)) return false;
      return (options.filters ?? []).every((filter) => {
        const values = filterValues[filter.key] ?? [];
        return values.length === 0 || filter.test(row, values);
      });
    });
  }, [filterValues, options, rows, search]);

  const sorted = useMemo(() => {
    if (!sort || !options.sortValue) return filtered;
    const valueOf = options.sortValue;
    return [...filtered].sort((a, b) => {
      const left = valueOf(a, sort.id);
      const right = valueOf(b, sort.id);
      const order =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "th");
      return sort.desc ? -order : order;
    });
  }, [filtered, options.sortValue, sort]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

  return {
    rows: pageRows,
    total,
    page: currentPage,
    perPage,
    search,
    sort,
    filterValues,
    selected,
    setSearch: (value: string) => {
      setSearchText(value);
      setSelected(new Set());
      window.clearTimeout(searchTimer.current);
      searchTimer.current = window.setTimeout(
        () => patchRef.current({ q: value, page: null }),
        300,
      );
    },
    setPage: (value: number) => patch({ page: value > 1 ? String(value) : null }),
    setPerPage: (value: number) =>
      patch({ perPage: value === (options.defaultPerPage ?? 10) ? null : String(value), page: null }),
    setSort: (value: SortState) =>
      patch({ sort: value ? `${value.desc ? "-" : ""}${value.id}` : null }),
    setFilter: (filterKey: string, values: readonly string[]) => {
      setSelected(new Set());
      patch({ [filterKey]: values.join(","), page: null });
    },
    setSelected,
    clearSelection: () => setSelected(new Set()),
  };
}

export type CmsListState<Row extends { readonly id: string }> = ReturnType<
  typeof useCmsList<Row>
>;
