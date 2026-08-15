import { ImageIcon } from "lucide-react";

/**
 * Figma "หลักฐานที่แนบมา" strips (1042:15211, 1042:15239) — 320x240 thumbnail
 * frames. The prototype has no admin evidence assets in R2 yet, so these are
 * honest placeholder frames (the wireframes are grey boxes too); no dead
 * lightbox affordance.
 */
export function EvidenceGrid({ count }: { readonly count: number }) {
  return (
    <div className="flex w-full flex-wrap gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          className="flex aspect-[4/3] w-full max-w-64 items-center justify-center rounded-lg border border-border bg-muted"
          key={index}
        >
          <ImageIcon className="size-8 text-muted-foreground" />
        </div>
      ))}
    </div>
  );
}
