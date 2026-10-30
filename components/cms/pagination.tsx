"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { CmsButton } from "@/components/cms/button";
import { cn } from "@/lib/utils";

type Token = number | "gap-start" | "gap-end";

/** The page numbers to draw: the first, the last, and one either side of the current one. */
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
 * The pages of a list as round buttons, the current one filled in ink as the
 * site's chosen filter capsule is, the previous and next arrows at the ends.
 * Nothing at all when everything fits on one page.
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
  if (pageCount <= 1) return null;

  return (
    <nav aria-label={t("pagination")} className="flex items-center gap-1">
      <CmsButton
        aria-label={t("previous")}
        disabled={page <= 1}
        icon={ChevronLeft}
        onClick={() => onPageChange(page - 1)}
        variant="ghost"
      />
      {pageTokens(page, pageCount).map((token) =>
        typeof token === "number" ? (
          <CmsButton
            aria-current={token === page ? "page" : undefined}
            className={cn("min-w-11 px-2 font-latin md:min-w-9", token !== page && "text-muted-foreground")}
            key={token}
            onClick={() => onPageChange(token)}
            variant={token === page ? "primary" : "ghost"}
          >
            {token}
          </CmsButton>
        ) : (
          <span
            aria-hidden
            className="flex min-w-6 items-center justify-center text-sm text-muted-foreground"
            key={token}
          >
            …
          </span>
        ),
      )}
      <CmsButton
        aria-label={t("next")}
        disabled={page >= pageCount}
        icon={ChevronRight}
        onClick={() => onPageChange(page + 1)}
        variant="ghost"
      />
    </nav>
  );
}
