"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsUpDown,
  Inbox,
  Search,
  SearchX,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { CmsButton } from "@/components/cms/button";
import { CmsEmpty } from "@/components/cms/card";
import { CmsInput, CmsSelect } from "@/components/cms/fields";
import { CmsPagination } from "@/components/cms/pagination";
import { PER_PAGE_OPTIONS, type CmsListState } from "@/components/cms/use-cms-list";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/mock-db/format";
import { cn } from "@/lib/utils";

export type CmsColumn<Row> = {
  readonly id: string;
  readonly header: string;
  readonly sortable?: boolean;
  readonly align?: "start" | "end";
  readonly className?: string;
  /**
   * The record's own name: set in medium weight, and the link to the record
   * when the table has `rowHref`, so a keyboard reaches every row.
   */
  readonly primary?: boolean;
  /** The cell holds its own controls, so a click there is not a row click. */
  readonly interactive?: boolean;
  readonly render: (row: Row) => ReactNode;
};

/** A sortable date and time column, printed in Thai the way the site prints dates. */
export function dateColumn<Row>(
  id: string,
  header: string,
  read: (row: Row) => string | null,
): CmsColumn<Row> {
  return {
    id,
    header,
    sortable: true,
    className: "w-px text-muted-foreground",
    render: (row) => formatDateTime(read(row)),
  };
}

/** The status pill's column: sortable, as narrow as its widest pill. */
export function statusColumn<Row>(
  header: string,
  render: (row: Row) => ReactNode,
): CmsColumn<Row> {
  return { id: "status", header, sortable: true, className: "w-px", render };
}

/** The empty state a screen asks for when its queue has nothing in it. */
export type CmsTableEmpty = {
  readonly icon?: LucideIcon;
  readonly title: string;
  readonly body?: string;
};

/**
 * What an empty page of the table says: nothing for this search (with the way
 * to clear it), nothing for these filters, or nothing yet at all.
 */
function TableEmpty({
  search,
  filtered,
  empty,
  onClearSearch,
}: {
  readonly search: string;
  readonly filtered: boolean;
  readonly empty?: CmsTableEmpty;
  readonly onClearSearch: () => void;
}) {
  const t = useTranslations("cms.table");
  if (search)
    return (
      <CmsEmpty
        action={
          <CmsButton onClick={onClearSearch} size="sm" variant="secondary">
            {t("clearSearch")}
          </CmsButton>
        }
        body={t("noResultsBody")}
        icon={SearchX}
        title={t("noResults", { query: search })}
      />
    );
  if (filtered) return <CmsEmpty body={t("filteredEmptyBody")} icon={SearchX} title={t("filteredEmpty")} />;
  return <CmsEmpty body={empty?.body} icon={empty?.icon ?? Inbox} title={empty?.title ?? t("empty")} />;
}

/**
 * A list page's table, in the pattern the references share and the site's
 * own rows already follow: no box round it, a hairline under the head and
 * between rows, 52px rows of 14px type, the record's name in medium weight.
 *
 * Above it, the toolbar: the status capsules on the left (`chips`), the
 * search capsule and any other filters on the right. When rows are selected a
 * grey strip under the toolbar says how many and carries the bulk actions.
 * Under it, the range, the rows per page and the pages. Selection persists
 * across pages.
 */
export function CmsTable<Row extends { readonly id: string }>({
  list,
  columns,
  searchPlaceholder,
  chips,
  filters,
  renderBulkActions,
  rowHref,
  empty,
}: {
  readonly list: CmsListState<Row>;
  readonly columns: ReadonlyArray<CmsColumn<Row>>;
  readonly searchPlaceholder?: string;
  /** The status capsules, at the toolbar's left (`CmsChips`). */
  readonly chips?: ReactNode;
  /** Further filters, after the search box. */
  readonly filters?: ReactNode;
  /**
   * The selection strip's actions, drawn for the rows ticked; with none the
   * table has no checkboxes. A render prop (`render…`), not a component: it is
   * called with the selection each time the strip draws.
   */
  readonly renderBulkActions?: (ids: readonly string[]) => ReactNode;
  /** Where a row leads. The whole row is the pointer's target. */
  readonly rowHref?: (row: Row) => string;
  readonly empty?: CmsTableEmpty;
}) {
  const t = useTranslations("cms.table");
  const router = useRouter();
  const selectable = renderBulkActions !== undefined;
  const { rows, selected } = list;
  const pageIds = rows.map((row) => row.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allOnPage = pageIds.length > 0 && selectedOnPage === pageIds.length;
  const filtered = Object.values(list.filterValues).some((values) => values.length > 0);

  function toggle(ids: readonly string[], on: boolean) {
    const next = new Set(selected);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    list.setSelected(next);
  }

  const start = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1;
  const end = Math.min(list.page * list.perPage, list.total);
  const span = columns.length + (selectable ? 1 : 0);

  const emptyState =
    rows.length === 0 ? (
      <TableEmpty empty={empty} filtered={filtered} onClearSearch={() => list.setSearch("")} search={list.search} />
    ) : null;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="min-w-0">{chips}</div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <CmsInput
            aria-label={searchPlaceholder ?? t("search")}
            className="md:w-64"
            icon={Search}
            inputClassName="rounded-full md:h-9 [&::-webkit-search-cancel-button]:hidden"
            onChange={(event) => list.setSearch(event.target.value)}
            placeholder={searchPlaceholder ?? t("search")}
            trailing={
              list.search ? (
                <CmsButton
                  aria-label={t("clearSearch")}
                  icon={X}
                  onClick={() => list.setSearch("")}
                  size="xs"
                  variant="ghost"
                />
              ) : undefined
            }
            type="search"
            value={list.search}
          />
          {filters}
        </div>
      </div>

      {selectable && selected.size > 0 ? (
        <div className="mt-4 flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-muted px-4 py-2">
          <span className="text-sm font-medium text-foreground">
            {t("selected", { count: selected.size })}
          </span>
          <div className="flex flex-wrap items-center gap-2">{renderBulkActions([...selected])}</div>
          <CmsButton
            className="ms-auto text-muted-foreground"
            onClick={list.clearSelection}
            size="sm"
            variant="link"
          >
            {t("clearSelection")}
          </CmsButton>
        </div>
      ) : null}

      {/* The first and last cells lose their outer inset, so the columns line
          up with the page title and the search box, and the rules end where
          the page column does. */}
      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectable ? (
                <TableHead className="w-8 ps-0 pe-0">
                  <Checkbox
                    aria-label={t("selectAll")}
                    checked={allOnPage}
                    indeterminate={selectedOnPage > 0 && !allOnPage}
                    onCheckedChange={(checked) => toggle(pageIds, checked)}
                  />
                </TableHead>
              ) : null}
              {columns.map((column) => (
                <TableHead
                  aria-sort={
                    list.sort?.id === column.id
                      ? list.sort.desc
                        ? "descending"
                        : "ascending"
                      : undefined
                  }
                  className={cn(
                    "h-11 px-3 text-sm font-medium whitespace-nowrap text-muted-foreground first:ps-0 last:pe-0",
                    column.align === "end" ? "text-end" : "text-start",
                    column.className,
                  )}
                  key={column.id}
                >
                  {column.sortable ? <SortButton column={column} list={list} /> : column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell className="p-0 whitespace-normal" colSpan={span}>
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const href = rowHref?.(row);
                return (
                  <TableRow
                    className={cn(
                      "data-[state=selected]:bg-muted/60",
                      href ? "cursor-pointer hover:bg-muted/50" : "hover:bg-transparent",
                    )}
                    data-state={selected.has(row.id) ? "selected" : undefined}
                    key={row.id}
                    onClick={href ? () => router.push(href) : undefined}
                  >
                    {selectable ? (
                      <TableCell
                        className="w-8 ps-0 pe-0"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          aria-label={t("selectRow")}
                          checked={selected.has(row.id)}
                          onCheckedChange={(checked) => toggle([row.id], checked)}
                        />
                      </TableCell>
                    ) : null}
                    {columns.map((column) => (
                      <TableCell
                        className={cn(
                          "h-13 px-3 py-2 text-sm whitespace-nowrap text-foreground first:ps-0 last:pe-0",
                          column.align === "end" && "text-end",
                          column.primary && "font-medium",
                          column.className,
                        )}
                        key={column.id}
                        onClick={column.interactive ? (event) => event.stopPropagation() : undefined}
                      >
                        {column.primary && href ? (
                          <Link
                            className="rounded-sm outline-none hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50"
                            href={href}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {column.render(row)}
                          </Link>
                        ) : (
                          column.render(row)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {list.total > 0 ? (
        <div className="mt-4 flex flex-col-reverse items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>{t("range", { start, end, total: list.total })}</span>
            {list.total > PER_PAGE_OPTIONS[0] ? (
              <span className="flex items-center gap-2">
                <span>{t("perPage")}</span>
                <CmsSelect
                  aria-label={t("perPage")}
                  className="w-20 rounded-full md:data-[size=default]:h-9"
                  items={PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                  onValueChange={(value) => list.setPerPage(Number(value))}
                  value={String(list.perPage)}
                />
              </span>
            ) : null}
          </div>
          <CmsPagination
            onPageChange={list.setPage}
            page={list.page}
            perPage={list.perPage}
            total={list.total}
          />
        </div>
      ) : null}
    </div>
  );
}

function SortButton<Row extends { readonly id: string }>({
  column,
  list,
}: {
  readonly column: CmsColumn<Row>;
  readonly list: CmsListState<Row>;
}) {
  const state = list.sort?.id === column.id ? (list.sort.desc ? "desc" : "asc") : null;
  const Icon = state === "asc" ? ArrowUp : state === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <CmsButton
      className={cn(
        "-mx-2 h-8 px-2 font-medium md:h-8 [&_svg]:size-3.5",
        state ? "text-foreground" : "text-muted-foreground",
      )}
      onClick={() => {
        // Ascending, descending, then back to the list's own order.
        if (state === null) list.setSort({ id: column.id, desc: false });
        else if (state === "asc") list.setSort({ id: column.id, desc: true });
        else list.setSort(null);
      }}
      size="sm"
      trailingIcon={Icon}
      variant="ghost"
    >
      {column.header}
    </CmsButton>
  );
}

/**
 * The status filter as capsules, the chosen one filled in ink — the same
 * capsules the transaction history and the notifications filter with. One
 * choice at a time, "all" first, each with how many rows it holds.
 */
export function CmsChips({
  label,
  options,
  value,
  onChange,
}: {
  readonly label: string;
  readonly options: ReadonlyArray<{
    readonly value: string;
    readonly label: string;
    readonly count?: number;
  }>;
  /** `""` is "all". */
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    // `<fieldset>`: a group by its own semantics; reset so it lays out as a row.
    <fieldset
      aria-label={label}
      className="-mx-5 flex min-w-0 gap-2 overflow-x-auto border-0 px-5 py-0 md:mx-0 md:flex-wrap md:px-0"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <CmsButton
            aria-pressed={active}
            key={option.value || "all"}
            onClick={() => onChange(option.value)}
            variant={active ? "primary" : "secondary"}
          >
            {option.label}
            {option.count !== undefined ? (
              <span
                className={cn(
                  "font-latin tabular-nums",
                  active ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </CmsButton>
        );
      })}
    </fieldset>
  );
}

/** How many rows hold each value, for the capsules' counts. */
export function countBy<Row>(
  rows: readonly Row[],
  read: (row: Row) => string,
): (value: string) => number {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(read(row), (counts.get(read(row)) ?? 0) + 1);
  return (value) => (value === "" ? rows.length : (counts.get(value) ?? 0));
}

/**
 * A filter of several choices at once, as a white capsule after the search
 * box: its name until something is picked, then the picked one or how many,
 * with a way to clear it.
 */
export function CmsFilterMenu({
  label,
  options,
  values,
  onChange,
  className,
}: {
  readonly label: string;
  readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  readonly values: readonly string[];
  readonly onChange: (values: readonly string[]) => void;
  readonly className?: string;
}) {
  const t = useTranslations("cms.table");
  const summary =
    values.length === 0
      ? label
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? label)
        : t("picked", { count: values.length });

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <CmsButton
              className={cn("max-w-56", values.length > 0 && "pe-9")}
              trailingIcon={values.length === 0 ? ChevronDown : undefined}
              variant="secondary"
            />
          }
        >
          {summary}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-48 rounded-xl bg-popover p-1 shadow-panel ring-1 ring-border"
        >
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              checked={values.includes(option.value)}
              className="h-9 rounded-lg px-2.5 pe-8 text-sm text-foreground focus:bg-muted"
              closeOnClick={false}
              key={option.value}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...values, option.value]
                    : values.filter((value) => value !== option.value),
                )
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {values.length > 0 ? (
        <CmsButton
          aria-label={t("clearFilter")}
          className="absolute inset-y-0 end-1.5 my-auto"
          icon={X}
          onClick={() => onChange([])}
          size="xs"
          variant="ghost"
        />
      ) : null}
    </div>
  );
}
