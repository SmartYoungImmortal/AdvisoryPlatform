"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { CmsButton } from "@/components/cms/button";

type Token = number | "gap-start" | "gap-end";

/** Reka's pagination window with `sibling-count` 1 and edges shown. */
function pageTokens(page: number, pageCount: number): Token[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  const tokens: Token[] = [1];
  if (start > 2) tokens.push("gap-start");
  for (let value = start; value <= end; value += 1) tokens.push(value);
  if (end < pageCount - 1) tokens.push("gap-end");
  tokens.push(pageCount);
  return tokens;
}

/**
 * Nuxt UI's `UPagination` as Nexus sets it (`show-edges`, `sibling-count` 1):
 * outline neutral squares, the current page solid primary, first/prev/next/last
 * at the ends.
 */
export function CmsPagination({
  page,
  total,
  perPage,
  onPageChange,
}: {
  readonly page: number;
  readonly total: number;
  readonly perPage: number;
  readonly onPageChange: (page: number) => void;
}) {
  const t = useTranslations("cms.table");
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const edge = (label: string, target: number, icon: typeof ChevronLeft, disabled: boolean) => (
    <CmsButton
      aria-label={label}
      color="neutral"
      disabled={disabled}
      icon={icon}
      onClick={() => onPageChange(target)}
      variant="outline"
    />
  );

  return (
    <nav aria-label={t("pagination")} className="flex items-center gap-1">
      {edge(t("first"), 1, ChevronsLeft, page <= 1)}
      {edge(t("previous"), page - 1, ChevronLeft, page <= 1)}
      {pageTokens(page, pageCount).map((token) =>
        typeof token === "number" ? (
          <CmsButton
            aria-current={token === page ? "page" : undefined}
            className="min-w-8 justify-center px-1.5 font-latin"
            color={token === page ? "primary" : "neutral"}
            key={token}
            onClick={() => onPageChange(token)}
            variant={token === page ? "solid" : "outline"}
          >
            {token}
          </CmsButton>
        ) : (
          <span
            aria-hidden
            className="flex min-w-8 items-center justify-center text-sm text-muted-foreground"
            key={token}
          >
            …
          </span>
        ),
      )}
      {edge(t("next"), page + 1, ChevronRight, page >= pageCount)}
      {edge(t("last"), pageCount, ChevronsRight, page >= pageCount)}
    </nav>
  );
}
