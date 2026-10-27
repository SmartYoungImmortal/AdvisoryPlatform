"use client";

import { useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * A button that opens the device's file picker and hands back the chosen file,
 * which the onboarding stages hold until the application is sent.
 *
 * Its shape comes from the caller (the stages pass the white `authPill`
 * capsule): importing that here would drag the auth frame, and with it the
 * scroll machinery, into everything that only needs a picker.
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
      <Button className={className} onClick={() => input.current?.click()} type="button" variant="outline">
        {children}
      </Button>
    </>
  );
}
