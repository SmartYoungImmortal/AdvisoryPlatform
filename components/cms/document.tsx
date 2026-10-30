"use client";

import { ExternalLink, FileText, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { CmsEmpty } from "@/components/cms/card";
import type { DocumentDownloadUrl } from "@/lib/api/admin";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/** Whether a document is a PDF, by its MIME type when there is one, else its name. */
function isPdf(url: string, mimeType?: string): boolean {
  if (mimeType) return mimeType === "application/pdf";
  return /\.pdf($|[?#])/i.test(url);
}

function OpenLink({ url }: { readonly url: string }) {
  const t = useTranslations("cms.document");
  return (
    <a
      className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      <ExternalLink aria-hidden className="size-4" />
      {t("open")}
    </a>
  );
}

/**
 * One uploaded document, shown where it is reviewed. A PDF opens in the
 * browser's own viewer inside the page, in a 9:16 frame 520 tall — zoom, page
 * and download come with it — and an image is drawn at the column's width.
 * Either way the file also opens in a tab of its own.
 */
export function CmsDocument({
  url,
  name,
  mimeType,
  className,
}: {
  readonly url: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly className?: string;
}) {
  return (
    <figure className={cn("flex w-full flex-col gap-3", className)}>
      {isPdf(url, mimeType) ? (
        <iframe
          className="aspect-9/16 h-130 w-auto max-w-full self-start rounded-2xl border border-border bg-muted"
          // No thumbnail pane: on a one-page certificate it only halves the zoom.
          src={`${url}#navpanes=0&view=FitH`}
          title={name}
        />
      ) : (
        <a
          className="block overflow-hidden rounded-2xl border border-border transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded document, drawn as-is. */}
          <img alt={name} className="block h-auto w-full" loading="lazy" src={url} />
        </a>
      )}
      <figcaption>
        <OpenLink url={url} />
      </figcaption>
    </figure>
  );
}

/**
 * A stored document the API keeps behind a short-lived URL (an ID card, a
 * skill document): asked for when the page opens, shown as `CmsDocument`
 * once it lands. When it cannot be had — nothing on file, or the object store
 * down — the place says so with the API's own sentence, in the shape of the
 * site's empty states.
 *
 * The URL expires in minutes, so it is dropped from the cache when the page
 * leaves rather than kept for the life of the tab.
 */
export function CmsStoredDocument({
  requestKey,
  read,
  name,
  icon,
  emptyTitle,
  className,
}: {
  readonly requestKey: string;
  readonly read: (signal: AbortSignal) => Promise<DocumentDownloadUrl>;
  readonly name: string;
  readonly icon: LucideIcon;
  readonly emptyTitle: string;
  readonly className?: string;
}) {
  const signed = useResource<DocumentDownloadUrl>(requestKey, read);
  useEffect(() => () => invalidate(requestKey), [requestKey]);

  if (signed.loading) {
    return (
      <span
        aria-hidden
        className={cn("block aspect-9/16 h-130 max-w-full rounded-2xl bg-muted", className)}
      />
    );
  }
  if (!signed.data) {
    return (
      <CmsEmpty
        body={signed.error?.message}
        className="rounded-2xl border border-border py-10"
        icon={icon}
        title={emptyTitle}
      />
    );
  }
  return <CmsDocument className={className} name={name} url={signed.data.url} />;
}

/**
 * Several attachments — a refund's evidence — as a grid of tiles: an image as
 * its own thumbnail, a PDF as a file tile, each opening the file in a new tab.
 * Files with no URL to open (a real upload's storage key) are named only.
 */
export function CmsDocumentGrid({
  files,
}: {
  readonly files: readonly {
    readonly key: string;
    readonly url: string | null;
    readonly name: string;
    readonly mimeType?: string;
  }[];
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {files.map((file) => {
        const tile = (
          <>
            <span className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
              {file.url && !isPdf(file.url, file.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element -- an uploaded document, drawn as-is.
                <img alt="" className="size-full object-cover object-top" loading="lazy" src={file.url} />
              ) : (
                <FileText aria-hidden className="size-8 text-muted-foreground" strokeWidth={1.5} />
              )}
            </span>
            <span className="truncate border-t border-border px-3 py-2 font-latin text-xs text-foreground">
              {file.name}
            </span>
          </>
        );
        return (
          <li className="min-w-0" key={file.key}>
            {file.url ? (
              <a
                className="flex flex-col overflow-hidden rounded-xl border border-border transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
                href={file.url}
                rel="noreferrer"
                target="_blank"
                title={file.name}
              >
                {tile}
              </a>
            ) : (
              <span className="flex flex-col overflow-hidden rounded-xl border border-border" title={file.name}>
                {tile}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
