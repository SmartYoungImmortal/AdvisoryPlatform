"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { CmsCard } from "@/components/cms/card";
import { formatDateTime } from "@/lib/mock-db/format";

/**
 * Nexus's `CmsSidebarOptions`, the right-hand column of every edit page: a card
 * of state controls, an Information card (created/updated), then the stacked
 * full-width actions.
 */
export function CmsSidebarOptions({
  children,
  info,
  actions,
}: {
  readonly children?: ReactNode;
  readonly info?: ReadonlyArray<{
    readonly label: string;
    readonly by?: string;
    readonly at: string | null;
  }>;
  readonly actions?: ReactNode;
}) {
  const t = useTranslations("cms.options");
  return (
    <div className="space-y-4">
      {children ? <CmsCard bodyClassName="flex flex-col gap-4">{children}</CmsCard> : null}
      {info && info.length > 0 ? (
        <CmsCard>
          <p className="mb-3 text-sm font-semibold text-highlighted">{t("information")}</p>
          <div className="space-y-2 text-sm">
            {info.map((row) => (
              <div key={row.label}>
                <span className="block font-medium text-foreground">{row.label}</span>
                <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{row.by ?? ""}</span>
                  <span className="shrink-0">{formatDateTime(row.at)}</span>
                </div>
              </div>
            ))}
          </div>
        </CmsCard>
      ) : null}
      {actions ? <div className="space-y-2">{actions}</div> : null}
    </div>
  );
}

/** A label/value pair — the read-only rows on a review page. */
export function CmsDataRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium break-words text-highlighted">{children}</dd>
    </div>
  );
}

/** Shown when `?id=` names nothing — a stale link or a reset database. */
export function CmsMissing({ backHref }: { readonly backHref: string }) {
  const t = useTranslations("cms.options");
  return (
    <CmsCard>
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-base font-semibold text-highlighted">{t("missingTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("missingBody")}</p>
        <Link className="text-sm font-medium text-action hover:text-action/75" href={backHref}>
          {t("backToList")}
        </Link>
      </div>
    </CmsCard>
  );
}
