"use client";

import { useTranslations } from "next-intl";
import type { FormEvent, ReactNode } from "react";

import { CmsButton } from "@/components/cms/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * A `UModal` holding a small form — header, body, footer bands split by
 * hairlines, the primary action on the right. For records too small to deserve
 * an edit page of their own (a category, a skill).
 */
export function CmsFormDialog({
  open,
  title,
  description,
  submitLabel,
  submitting = false,
  onSubmit,
  onClose,
  children,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly submitLabel: string;
  /** A save that has gone to the API and not answered yet. */
  readonly submitting?: boolean;
  readonly onSubmit: () => void;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  const t = useTranslations("cms.feedback");
  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogContent
        className="max-w-[calc(100vw-2rem)] gap-0 rounded-lg bg-card p-0 shadow-lg ring-1 ring-border sm:max-w-lg"
        showCloseButton={false}
      >
        <form
          noValidate
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex min-h-16 flex-col justify-center gap-1 p-4 sm:px-6">
            <DialogTitle className="text-base font-semibold text-highlighted">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            ) : null}
          </div>
          <div className="flex flex-col gap-4 border-y border-border p-4 sm:p-6">{children}</div>
          <div className="flex items-center justify-end gap-1.5 p-4 sm:px-6">
            <CmsButton
              color="neutral"
              disabled={submitting}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              {t("cancel")}
            </CmsButton>
            <CmsButton color="action" loading={submitting} type="submit">
              {submitLabel}
            </CmsButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
