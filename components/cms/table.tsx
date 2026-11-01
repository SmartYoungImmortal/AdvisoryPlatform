"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Inbox,
  Search,
  SearchX,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, type ReactNode } from "react";

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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  /**
   * Said with its header before it in the row's grey line ("สมัครเมื่อ 24 ต.ค.
   * 69"): a date, or who did something, which mean nothing without it.
   */
  readonly labelled?: boolean;
  readonly render: (row: Row) => ReactNode;
};

/** A sortable date and time, printed in Thai the way the site prints dates, with its header before it. */
export function dateColumn<Row>(
  id: string,
  header: string,
  read: (row: Row) => string | null,
): CmsColumn<Row> {
  return {
    id,
    header,
    sortable: true,
    labelled: true,
    render: (row) => formatDateTime(read(row)),
  };
}

/** The status: sortable, and printed at the row's right under any figure there. */
export function statusColumn<Row>(
  header: string,
  render: (row: Row) => ReactNode,
): CmsColumn<Row> {
  return { id: "status", header, sortable: true, render };
}

/** Whether a cell printed anything worth a place in the grey line. */
function said(node: ReactNode): boolean {
  return !(node === null || node === undefined || node === false || node === "" || node === "-");
}

/** The row's grey line: every other column's value, joined with a middle dot. */
function MetaLine<Row>({ columns, row }: { readonly columns: ReadonlyArray<CmsColumn<Row>>; readonly row: Row }) {
  const parts = columns.map((column) => ({ column, value: column.render(row) })).filter((part) => said(part.value));
  if (parts.length === 0) return null;
  return (
    <p className="truncate text-sm text-muted-foreground">
      {parts.map(({ column, value }, i) => (
        <Fragment key={column.id}>
          {i > 0 ? " · " : null}
          <span className={column.className}>
            {column.labelled ? `${column.header} ` : null}
            {value}
          </span>
        </Fragment>
      ))}
    </p>
  );
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
 * A list page, drawn as the site's transaction history draws its rows rather
 * than as a table: no head and no rules, each record a row with a round
 * portrait or glyph, its name in body type over a grey line of everything else
 * (`MetaLine`), and at the right any figure over its status in colour.
 *
 * - The **primary** column is the name, and the link to the record when the
 *   table has `rowHref`, so a keyboard reaches every row.
 * - The **status** column (`statusColumn`) and any **end**-aligned column sit
 *   at the right; **interactive** columns after them, out of the row's click.
 * - Every other column joins the grey line, its header before it when it is
 *   `labelled`.
 *
 * Above it, the toolbar: the status capsules on the left (`chips`), the
 * search capsule, any other filters and the order (`SortMenu`) on the right.
 * When rows are selected a grey strip under the toolbar says how many and
 * carries the bulk actions. Under it, the range, the rows per page and the
 * pages. Selection persists across pages.
 */
export function CmsTable<Row extends { readonly id: string }>({
  list,
  columns,
  searchPlaceholder,
  chips,
  filters,
  renderBulkActions,
  rowHref,
  leading,
  leadingIcon: LeadingIcon,
  empty,
}: {
  readonly list: CmsListState<Row>;
  readonly columns: ReadonlyArray<CmsColumn<Row>>;
  /** The row's round portrait, 40 across (`CmsAvatar size="row"`). */
  readonly leading?: (row: Row) => ReactNode;
  /** With no portrait, the list's glyph in a soft grey circle, as the site's rows draw theirs. */
  readonly leadingIcon?: LucideIcon;
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

  const title = columns.find((column) => column.primary) ?? columns[0];
  const status = columns.find((column) => column.id === "status");
  const figures = columns.filter(
    (column) => column !== title && column !== status && column.align === "end" && !column.interactive,
  );
  const controls = columns.filter((column) => column !== title && column.interactive);
  const meta = columns.filter(
    (column) => column !== title && column !== status && !figures.includes(column) && !controls.includes(column),
  );

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
          <SortMenu columns={columns} list={list} />
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

      {selectable && rows.length > 0 ? (
        <label className="mt-4 flex h-8 w-fit items-center gap-3 text-sm text-muted-foreground">
          <Checkbox
            checked={allOnPage}
            indeterminate={selectedOnPage > 0 && !allOnPage}
            onCheckedChange={(checked) => toggle(pageIds, checked)}
          />
          {t("selectAll")}
        </label>
      ) : null}

      {rows.length === 0 ? (
        <TableEmpty empty={empty} filtered={filtered} onClearSearch={() => list.setSearch("")} search={list.search} />
      ) : (
        // Pulled out by the rows' own inset, so their portraits line up with
        // the page title while the grey under the pointer reaches past them.
        <ul className={cn("-mx-3 flex flex-col", selectable ? "mt-1" : "mt-4")}>
          {rows.map((row) => {
            const href = rowHref?.(row);
            const name = title.render(row);
            return (
              <li
                className={cn(
                  "flex min-h-16 items-center gap-4 rounded-2xl px-3 py-2.5 transition-colors",
                  href && "cursor-pointer hover:bg-muted/60",
                  selected.has(row.id) && "bg-muted/60",
                )}
                key={row.id}
                onClick={href ? () => router.push(href) : undefined}
              >
                {selectable ? (
                  <Checkbox
                    aria-label={t("selectRow")}
                    checked={selected.has(row.id)}
                    onCheckedChange={(checked) => toggle([row.id], checked)}
                    onClick={(event) => event.stopPropagation()}
                  />
                ) : null}
                {leading ? leading(row) : null}
                {!leading && LeadingIcon ? (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <LeadingIcon aria-hidden className="size-4.5 text-foreground" strokeWidth={1.75} />
                  </span>
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className={cn("truncate text-base font-medium text-foreground", title.className)}>
                    {href ? (
                      <Link
                        className="rounded-sm outline-none hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50"
                        href={href}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {name}
                      </Link>
                    ) : (
                      name
                    )}
                  </p>
                  <MetaLine columns={meta} row={row} />
                </div>
                {figures.length > 0 || status ? (
                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-end">
                    {figures.map((column) => (
                      <span className={cn("text-sm font-semibold text-foreground", column.className)} key={column.id}>
                        {column.labelled ? `${column.header} ` : null}
                        {column.render(row)}
                      </span>
                    ))}
                    {status ? status.render(row) : null}
                  </div>
                ) : null}
                {controls.map((column) => (
                  // Its own controls: a press there is not the row's.
                  <div className="shrink-0 text-sm" key={column.id} onClick={(event) => event.stopPropagation()}>
                    {column.render(row)}
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      )}

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

/** The order the rows are in, now the list has no head to click: a white capsule after the filters. */
function SortMenu<Row extends { readonly id: string }>({
  columns,
  list,
}: {
  readonly columns: ReadonlyArray<CmsColumn<Row>>;
  readonly list: CmsListState<Row>;
}) {
  const t = useTranslations("cms.table");
  const sortable = columns.filter((column) => column.sortable);
  if (sortable.length === 0) return null;
  const current = list.sort ? sortable.find((column) => column.id === list.sort?.id) : undefined;
  const value = list.sort ? `${list.sort.id}:${list.sort.desc ? "desc" : "asc"}` : "";
  let directionIcon: LucideIcon = ChevronDown;
  if (current) directionIcon = list.sort?.desc ? ArrowDown : ArrowUp;
  const item = "h-9 gap-2 rounded-lg px-2.5 text-sm text-foreground focus:bg-muted";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<CmsButton trailingIcon={directionIcon} variant="secondary" />}>
        {current ? t("sortBy", { column: current.header }) : t("sort")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 rounded-xl bg-popover p-1 shadow-panel ring-1 ring-border">
        <DropdownMenuRadioGroup
          onValueChange={(next: string) => {
            if (!next) return list.setSort(null);
            const [id, direction] = next.split(":");
            list.setSort({ id, desc: direction === "desc" });
          }}
          value={value}
        >
          <DropdownMenuRadioItem className={item} value="">
            {t("sortDefault")}
          </DropdownMenuRadioItem>
          {sortable.flatMap((column) =>
            (["asc", "desc"] as const).map((direction) => (
              <DropdownMenuRadioItem className={item} key={`${column.id}:${direction}`} value={`${column.id}:${direction}`}>
                {column.header}
                <span className="text-muted-foreground">{t(direction === "asc" ? "ascending" : "descending")}</span>
              </DropdownMenuRadioItem>
            )),
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
