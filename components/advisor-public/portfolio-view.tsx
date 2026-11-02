"use client";

import { ExternalLink, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ApiPortfolioItem } from "@/lib/api/types";

/**
 * The work an advisor has done, on their profile's About tab: a grid of
 * pieces, each its cover with its title and a line of it under, and a dialog
 * that opens one: its words and link first, then every picture full width.
 */

function PortfolioViewer({ item, onClose }: { readonly item: ApiPortfolioItem; readonly onClose: () => void }) {
  const t = useTranslations("advisorProfile");
  return (
    <Dialog onOpenChange={(open) => (open ? null : onClose())} open>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl p-5 sm:max-w-[720px] md:p-6"
        overlayClassName="bg-scrim/40 supports-backdrop-filter:backdrop-blur-none"
        showCloseButton={false}
      >
        <DialogTitle className="text-lg font-semibold text-foreground lg:text-frame-heading">{item.title}</DialogTitle>
        {item.description ? (
          <DialogDescription className="mt-2 text-base leading-7 whitespace-pre-line text-muted-foreground">{item.description}</DialogDescription>
        ) : null}
        {item.link ? (
          <Button
            className="mt-4 h-10 w-fit justify-self-start rounded-full border-border px-4 text-sm font-medium"
            nativeButton={false}
            render={<a href={item.link} rel="noopener noreferrer nofollow" target="_blank" />}
            variant="outline"
          >
            {t("openWork")}
            <ExternalLink aria-hidden className="size-4" />
          </Button>
        ) : null}
        {item.images.length > 0 ? (
          <ul className="mt-5 flex flex-col gap-3">
            {item.images.map((src, index) => (
              <li key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element -- presigned storage URLs change per read */}
                <img alt={t("workPicture", { title: item.title, n: index + 1 })} className="w-full rounded-2xl bg-muted" src={src} />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex justify-end">
          <Button className="h-11 px-4 text-sm font-medium" onClick={onClose} type="button" variant="ghost">
            {t("closeWork")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PortfolioGrid({ items }: { readonly items: readonly ApiPortfolioItem[] }) {
  const t = useTranslations("advisorProfile");
  const [open, setOpen] = useState<ApiPortfolioItem | null>(null);
  return (
    <>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3 lg:gap-x-[19px] lg:gap-y-[28.5px]">
        {items.map((item) => {
          const cover = item.images[0];
          return (
            <li key={item.id}>
              <button
                aria-label={t("viewWork", { title: item.title })}
                className="group flex w-full flex-col gap-2.5 rounded-2xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:gap-3"
                onClick={() => setOpen(item)}
                type="button"
              >
                <span className="block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- presigned storage URLs change per read
                    <img alt="" className="size-full object-cover transition-opacity group-hover:opacity-90" src={cover} />
                  ) : (
                    <span className="flex size-full items-center justify-center text-muted-foreground">
                      <ImageIcon aria-hidden className="size-6" />
                    </span>
                  )}
                </span>
                <span className="flex flex-col gap-0.5 px-0.5">
                  <span className="line-clamp-1 text-base font-medium text-foreground lg:text-frame-body">{item.title}</span>
                  {item.description ? (
                    <span className="line-clamp-2 text-sm leading-[1.47] text-muted-foreground lg:text-frame-meta">{item.description}</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {open ? <PortfolioViewer item={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
