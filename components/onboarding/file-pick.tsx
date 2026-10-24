"use client";

import { useRef, type ReactNode } from "react";

import { NeutralButton } from "@/components/mobile/buttons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A button that opens the device's file picker and hands back the chosen file,
 * which the onboarding stages hold until the application is sent.
 */
export function FilePickButton({
  accept,
  onPick,
  className,
  children,
}: {
  readonly accept: string;
  readonly onPick: (file: File) => void;
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
          if (file) onPick(file);
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
