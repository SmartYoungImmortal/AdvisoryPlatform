"use client";

import { FileQuestion } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { CmsEmpty } from "@/components/cms/card";
import { CmsLinkButton } from "@/components/cms/fields";
import { formatDateTime } from "@/lib/mock-db/format";
import { cn } from "@/lib/utils";

/**
 * The column beside a record, as the console this is modelled on lays out its
 * right panel: a card of when it arrived and when it was decided (and by
 * whom), then a card of what can be done with it, so the decision sits beside
 * the record it is about rather than at the foot of a long page. No rules
 * inside either: each date is a grey label over its value. The record's
 * status is beside its title.
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
  const card = "rounded-lg border border-border bg-card p-5";
  return (
    <div className="flex flex-col gap-4">
      {info && info.length > 0 ? (
        <dl className={cn(card, "flex flex-col gap-4")}>
          {info.map((row) => (
            <div className="flex flex-col gap-1" key={row.label}>
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="text-sm font-medium text-foreground">
                {formatDateTime(row.at)}
                {row.by ? (
                  <span className="block font-normal text-muted-foreground">{t("by", { name: row.by })}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children !== undefined || actions !== undefined ? (
        <div className={cn(card, "flex flex-col gap-4")}>
          {children}
          {actions ? <div className="flex flex-col gap-2">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The facts of a record, as a form's fields are laid out but to be read: two
 * columns from `sm`, each a grey label over its value, with no rules between.
 */
export function CmsDataList({ children }: { readonly children: ReactNode }) {
  return <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{children}</dl>;
}

export function CmsDataRow({
  label,
  wide = false,
  children,
}: {
  readonly label: string;
  /** Across both columns: a long text, a reason, a description. */
  readonly wide?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", wide && "sm:col-span-2")}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-base break-words text-foreground">{children}</dd>
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
