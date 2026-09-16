"use client";

import { Toast } from "@base-ui/react/toast";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { CmsButton } from "@/components/cms/button";
import { cn } from "@/lib/utils";

/**
 * Nexus's toast helper (`cms-toast`). The console asks nothing in a modal:
 * every decision is a field on the record's own page, and its outcome is
 * reported here.
 */
type ToastColor = "success" | "error" | "info" | "warning";

type FeedbackApi = {
  readonly toast: (options: {
    readonly color?: ToastColor;
    readonly title: string;
    readonly description?: string;
  }) => void;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useCmsFeedback(): FeedbackApi {
  const api = useContext(FeedbackContext);
  if (!api) throw new Error("useCmsFeedback needs <CmsFeedbackProvider>");
  return api;
}

export function CmsFeedbackProvider({ children }: { readonly children: ReactNode }) {
  return (
    <Toast.Provider timeout={4000}>
      <FeedbackHost>{children}</FeedbackHost>
      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2 outline-none">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function FeedbackHost({ children }: { readonly children: ReactNode }) {
  const manager = Toast.useToastManager();
  const toast = useCallback<FeedbackApi["toast"]>(
    ({ color = "success", title, description }) => {
      manager.add({ title, description, type: color });
    },
    [manager],
  );
  const api = useMemo(() => ({ toast }), [toast]);
  return <FeedbackContext.Provider value={api}>{children}</FeedbackContext.Provider>;
}

const TOAST_ICON: Record<ToastColor, { readonly icon: LucideIcon; readonly text: string; readonly bar: string }> = {
  success: { icon: CircleCheck, text: "text-success", bar: "bg-success" },
  error: { icon: TriangleAlert, text: "text-destructive", bar: "bg-destructive" },
  info: { icon: Info, text: "text-info", bar: "bg-info" },
  warning: { icon: CircleAlert, text: "text-warning", bar: "bg-warning" },
};

/** Nuxt UI's `UToast`: white card, ring, coloured icon, a close button. */
function ToastList() {
  const t = useTranslations("cms.feedback");
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const style = TOAST_ICON[(toast.type as ToastColor | undefined) ?? "success"];
    const Icon = style.icon;
    return (
      <Toast.Root
        className="relative flex gap-2.5 overflow-hidden rounded-lg bg-card p-4 shadow-lg ring-1 ring-border transition-all data-[ending-style]:translate-x-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0"
        key={toast.id}
        toast={toast}
      >
        <Icon aria-hidden className={cn("size-5 shrink-0", style.text)} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Toast.Title className="text-sm font-medium text-highlighted" />
          <Toast.Description className="text-sm text-muted-foreground" />
        </div>
        <Toast.Close
          aria-label={t("dismiss")}
          render={<CmsButton color="neutral" icon={X} size="sm" variant="link" />}
        />
        <span aria-hidden className={cn("absolute inset-x-0 bottom-0 h-1", style.bar)} />
      </Toast.Root>
    );
  });
}
