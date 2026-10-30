"use client";

import { FileQuestion } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { CmsEmpty } from "@/components/cms/card";
import { CmsLinkButton } from "@/components/cms/fields";
import { formatDateTime } from "@/lib/mock-db/format";
import { cn } from "@/lib/utils";

/**
 * The column beside a record: when it arrived and when it was decided (and by
 * whom), then what can be done with it. Flat, the two parts ruled off by a
 * hairline, so the decision sits beside the record it is about rather than at
 * the foot of a long page. The record's status is the pill beside its title.
 */
export function CmsSidebarOptions({
  info,
  children,
  actions,
}: {
  readonly info?: ReadonlyArray<{
    readonly label: string;
    readonly by?: string | null;
    readonly at: string | null;
  }>;
  /** Anything else the decision needs (a reason field), above the actions. */
  readonly children?: ReactNode;
  readonly actions?: ReactNode;
}) {
  const t = useTranslations("cms.options");
  const blocks = "border-t border-border py-5 first:border-t-0 first:pt-0";
  return (
    <div className="flex flex-col">
      {info && info.length > 0 ? (
        <dl className={cn(blocks, "flex flex-col gap-3")}>
          {info.map((row) => (
            <div className="flex flex-col gap-0.5" key={row.label}>
              <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
              <dd className="text-sm text-foreground">
                {formatDateTime(row.at)}
                {row.by ? (
                  <span className="block text-muted-foreground">{t("by", { name: row.by })}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children !== undefined || actions !== undefined ? (
        <div className={cn(blocks, "flex flex-col gap-4")}>
          {children}
          {actions ? <div className="flex flex-col gap-2">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Label and value rows on hairlines: the facts of a record. */
export function CmsDataList({ children }: { readonly children: ReactNode }) {
  return <dl className="border-b border-border">{children}</dl>;
}

export function CmsDataRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-t border-border py-3.5 text-sm sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

/** Shown when `?id=` names nothing — a stale link or a record since removed. */
export function CmsMissing({ backHref }: { readonly backHref: string }) {
  const t = useTranslations("cms.options");
  return (
    <CmsEmpty
      action={
        <CmsLinkButton href={backHref} variant="secondary">
          {t("backToList")}
        </CmsLinkButton>
      }
      body={t("missingBody")}
      icon={FileQuestion}
      title={t("missingTitle")}
    />
  );
}
