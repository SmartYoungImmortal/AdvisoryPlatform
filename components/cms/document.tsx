"use client";

import { ExternalLink, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

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
      className="inline-flex items-center gap-1 text-sm font-medium text-action transition-colors hover:text-action/75"
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
 * browser's own viewer inside the card, in a 9:16 frame — zoom, page and
 * download come with it — and an image is drawn at the card's width. Either way the file also opens in
 * a tab of its own: there is no overlay, as there is no popup anywhere in the
 * console.
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
    <figure className={cn("flex w-full flex-col gap-2", className)}>
      {isPdf(url, mimeType) ? (
        // A 9:16 viewer at a fixed 520px height — the width follows the height.
        <iframe
          className="aspect-9/16 h-130 w-auto max-w-full self-start rounded-md bg-muted ring-1 ring-border"
          // No thumbnail pane: on a one-page certificate it only halves the zoom.
          src={`${url}#navpanes=0&view=FitH`}
          title={name}
        />
      ) : (
        <a
          className="block overflow-hidden rounded-md ring-1 ring-border transition-opacity hover:opacity-90"
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
                <FileText aria-hidden className="size-8 text-dimmed" />
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
                className="flex flex-col overflow-hidden rounded-md ring-1 ring-border transition-opacity hover:opacity-90"
                href={file.url}
                rel="noreferrer"
                target="_blank"
                title={file.name}
              >
                {tile}
              </a>
            ) : (
              <span className="flex flex-col overflow-hidden rounded-md ring-1 ring-border" title={file.name}>
                {tile}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
