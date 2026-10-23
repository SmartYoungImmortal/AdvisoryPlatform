"use client";

import Image, { type StaticImageData } from "next/image";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { CmsButton } from "@/components/cms/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Nexus's `CmsLightbox`: one image over a dark scrim, its name as the caption.
 * The fixtures carry file names, not files, so every document opens the same
 * preview image — the review flow is what is being exercised.
 */
export function CmsLightbox({
  image,
  title,
  onClose,
}: {
  readonly image: StaticImageData | null;
  readonly title: string;
  readonly onClose: () => void;
}) {
  const t = useTranslations("cms.feedback");
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={image !== null}>
      <DialogContent
        className="max-w-[calc(100vw-2rem)] gap-3 rounded-lg bg-card p-3 shadow-lg ring-1 ring-border sm:max-w-3xl"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between gap-3 ps-1">
          <DialogTitle className="truncate font-latin text-sm font-medium text-highlighted">
            {title}
          </DialogTitle>
          <CmsButton
            aria-label={t("close")}
            color="neutral"
            icon={X}
            onClick={onClose}
            variant="ghost"
          />
        </div>
        {image ? (
          <Image
            alt={title}
            className="max-h-[80vh] w-full rounded-md bg-muted object-contain"
            src={image}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
