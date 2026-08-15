import type { ReactNode } from "react";
import { ArrowUpDown } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type AdminColumn = {
  readonly key: string;
  readonly label: ReactNode;
  readonly sortable?: boolean;
  readonly align?: "start" | "end";
  readonly className?: string;
};

/**
 * Figma "Data Table" (1042:15083): select-all checkbox column, sortable
 * headers, a trailing row-action slot. Nexus's column-spec adapter — pages
 * declare `{key, label}` and cell renderers; the chrome renders here once.
 * Sort chevrons are presentational: state lives in routes, not client sort.
 */
export function AdminTable<T extends { readonly id: string }>({
  columns,
  rows,
  renderCell,
  renderActions,
}: {
  readonly columns: ReadonlyArray<AdminColumn>;
  readonly rows: ReadonlyArray<T>;
  readonly renderCell: (row: T, key: string) => ReactNode;
  readonly renderActions?: (row: T) => ReactNode;
}) {
  return (
    <Table>
      <TableHeader className="bg-muted/40">
        <TableRow>
          <TableHead className="w-8">
            <Checkbox aria-label="เลือกทั้งหมด" />
          </TableHead>
          {columns.map((column) => (
            <TableHead
              className={cn(
                column.align === "end" && "text-right",
                column.className,
              )}
              key={column.key}
            >
              <span className="inline-flex items-center gap-1">
                {column.label}
                {column.sortable ? (
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                ) : null}
              </span>
            </TableHead>
          ))}
          {renderActions ? <TableHead className="w-28" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Checkbox aria-label="เลือกแถวนี้" />
            </TableCell>
            {columns.map((column) => (
              <TableCell
                className={cn(
                  column.align === "end" && "text-right",
                  column.className,
                )}
                key={column.key}
              >
                {renderCell(row, column.key)}
              </TableCell>
            ))}
            {renderActions ? (
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {renderActions(row)}
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
