"use client";

import { useRef, type ReactNode } from "react";

import { NeutralButton } from "@/components/mobile/buttons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A button that opens the device's file picker. The prototype keeps only the
 * chosen file's name — there is nowhere to upload to yet — which is enough for
 * the application to carry a document the console can list.
 */
export function FilePickButton({
  accept,
  onPick,
  className,
  children,
}: {
  readonly accept: string;
  readonly onPick: (fileName: string) => void;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Input
        accept={accept}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file.name);
          event.target.value = "";
        }}
        ref={input}
        tabIndex={-1}
        type="file"
      />
      <NeutralButton className={cn("w-auto", className)} onClick={() => input.current?.click()} type="button">
        {children}
      </NeutralButton>
    </>
  );
}
