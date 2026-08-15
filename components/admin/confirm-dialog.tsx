import Link from "next/link";
import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Named-intent confirm (Nexus useCmsConfirm translated to routes):
 * `defaultOpen` because the /suspend, /reject, /approve routes ARE the open
 * state — same rule as LogOutDialog. Buttons navigate to the outcome route.
 * `children` hosts intent-specific fields (reason textarea, severity select).
 */
export function AdminConfirmDialog({
  title,
  body,
  confirmLabel,
  confirmHref,
  cancelLabel,
  cancelHref,
  destructive = false,
  children,
}: {
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly confirmLabel: ReactNode;
  readonly confirmHref: string;
  readonly cancelLabel: ReactNode;
  readonly cancelHref: string;
  readonly destructive?: boolean;
  readonly children?: ReactNode;
}) {
  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent className="w-md gap-4 p-5">
        <AlertDialogHeader className="place-items-start gap-2 text-left">
          <AlertDialogTitle className="text-xl leading-7 font-semibold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children ? (
          <div className="flex w-full flex-col gap-3">{children}</div>
        ) : null}
        <AlertDialogFooter className="flex-row justify-end gap-2.5">
          <Button render={<Link href={cancelHref} />}
          nativeButton={false} variant="outline">
            {cancelLabel}
          </Button>
          <Button
            render={<Link href={confirmHref} />}
          nativeButton={false}
            variant={destructive ? "destructive" : "default"}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
