"use client";

import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
  ChevronDown,
  Inbox,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { CmsButton } from "@/components/cms/button";
import { CmsInput, CmsSelect } from "@/components/cms/fields";
import { CmsPagination } from "@/components/cms/pagination";
import {
  PER_PAGE_OPTIONS,
  type CmsListState,
} from "@/components/cms/use-cms-list";
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
import { cn } from "@/lib/utils";

export type CmsColumn<Row> = {
  readonly id: string;
  readonly header: string;
  readonly sortable?: boolean;
  readonly align?: "start" | "center" | "end";
  readonly className?: string;
  /** The cell holds its own controls, so a click there is not a row click. */
  readonly interactive?: boolean;
  readonly cell: (row: Row) => ReactNode;
};

const ALIGN = { start: "text-start", center: "text-center", end: "text-end" } as const;

/**
 * Nexus's `CmsTable`: a white card with a toolbar band (search on the left,
 * bulk action and filters on the right), the table, and a footer band (rows per
 * page, range, pagination). Selection persists across pages the way Nexus's
 * `selectedIds` does.
 */
export function CmsTable<Row extends { readonly id: string }>({
  list,
  columns,
  searchPlaceholder,
  filters,
  bulkActions,
  onRowClick,
  selectable = true,
  empty,
}: {
  readonly list: CmsListState<Row>;
  readonly columns: ReadonlyArray<CmsColumn<Row>>;
  readonly searchPlaceholder?: string;
  readonly filters?: ReactNode;
  /** Rendered in the toolbar while rows are selected. */
  readonly bulkActions?: (ids: readonly string[]) => ReactNode;
  readonly onRowClick?: (row: Row) => void;
  readonly selectable?: boolean;
  readonly empty?: ReactNode;
}) {
  const t = useTranslations("cms.table");
  const { rows, selected } = list;
  const pageIds = rows.map((row) => row.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allOnPage = pageIds.length > 0 && selectedOnPage === pageIds.length;

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

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col items-center justify-between gap-4 border-b border-border p-4 sm:flex-row">
        <div className="flex w-full items-center gap-4 sm:max-w-md">
          <CmsInput
            aria-label={searchPlaceholder ?? t("search")}
            className="max-w-xs"
            icon={Search}
            onChange={(event) => list.setSearch(event.target.value)}
            placeholder={searchPlaceholder ?? t("search")}
            trailing={
              list.search ? (
                <CmsButton
                  aria-label={t("clearSearch")}
                  className="p-0 [&_svg]:size-4"
                  color="neutral"
                  icon={X}
                  onClick={() => list.setSearch("")}
                  variant="link"
                />
              ) : undefined
            }
            value={list.search}
          />
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-4 sm:w-auto">
          {selected.size > 0 && bulkActions ? bulkActions([...selected]) : null}
          {filters}
        </div>
      </div>

      <Table className="min-w-full">
        <TableHeader className="[&_tr]:border-b-0">
          <TableRow className="border-b border-border hover:bg-transparent">
            {selectable ? (
              <TableHead className="w-5 px-4 py-4 pe-0">
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
                className={cn(
                  "h-auto px-4 py-4 text-sm font-semibold whitespace-nowrap text-highlighted",
                  ALIGN[column.align ?? "start"],
                  column.className,
                )}
                key={column.id}
              >
                {column.sortable ? (
                  <SortButton column={column} list={list} />
                ) : (
                  <span className="cursor-default">{column.header}</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                className="py-10 text-center text-sm text-muted-foreground"
                colSpan={columns.length + (selectable ? 1 : 0)}
              >
                {empty ?? (
                  <span className="flex flex-col items-center gap-2">
                    <Inbox aria-hidden className="size-8 text-dimmed" />
                    {list.search ? t("noResults", { query: list.search }) : t("empty")}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                className={cn(
                  "border-0 transition-colors duration-150 data-[state=selected]:bg-muted/50",
                  onRowClick && "cursor-pointer hover:bg-muted/50",
                )}
                data-state={selected.has(row.id) ? "selected" : undefined}
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selectable ? (
                  <TableCell
                    className="w-5 px-4 py-5 pe-0"
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
                      "px-4 py-5 text-sm whitespace-nowrap text-muted-foreground",
                      ALIGN[column.align ?? "start"],
                      column.className,
                    )}
                    key={column.id}
                    onClick={column.interactive ? (event) => event.stopPropagation() : undefined}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col items-center justify-between gap-4 border-t border-border p-4 sm:flex-row">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{t("perPage")}</span>
            <CmsSelect
              className="w-20"
              items={PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
              onValueChange={(value) => list.setPerPage(Number(value))}
              value={String(list.perPage)}
            />
          </div>
          <span className="font-latin">
            {t("range", { start, end, total: list.total })}
          </span>
          {selected.size > 0 ? (
            <span>· {t("selected", { count: selected.size })}</span>
          ) : null}
        </div>
        <CmsPagination
          onPageChange={list.setPage}
          page={list.page}
          perPage={list.perPage}
          total={list.total}
        />
      </div>
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
  const Icon =
    state === "asc" ? ArrowUpNarrowWide : state === "desc" ? ArrowDownWideNarrow : ArrowUpDown;
  return (
    <CmsButton
      className={cn("-mx-2.5 font-semibold text-highlighted", column.align === "center" && "mx-auto")}
      color="neutral"
      icon={Icon}
      onClick={() => {
        // Nexus's three-step cycle: ascending, descending, off.
        if (state === null) list.setSort({ id: column.id, desc: false });
        else if (state === "asc") list.setSort({ id: column.id, desc: true });
        else list.setSort(null);
      }}
      variant="ghost"
    >
      {column.header}
    </CmsButton>
  );
}

/**
 * `USelectMenu multiple` as the table toolbar uses it — "All statuses" until
 * something is picked, then the picked count, with a clear button.
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
    <div className={cn("relative w-40", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <CmsButton
              className={cn(
                "w-full justify-start bg-card pe-8 font-normal ring-1 ring-accented ring-inset hover:bg-card",
                values.length === 0 ? "text-dimmed" : "text-highlighted",
              )}
              color="neutral"
              trailingIcon={values.length === 0 ? ChevronDown : undefined}
              variant="ghost"
            />
          }
        >
          {summary}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44 rounded-md bg-card p-1 shadow-lg ring-1 ring-border">
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              checked={values.includes(option.value)}
              className="rounded-md p-1.5 pe-8 text-sm text-foreground focus:bg-muted/50"
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
          className="absolute inset-y-0 end-1.5 my-auto h-fit p-0.5 [&_svg]:size-4"
          color="neutral"
          icon={X}
          onClick={() => onChange([])}
          variant="link"
        />
      ) : null}
    </div>
  );
}
