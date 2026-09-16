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
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CmsButton } from "@/components/cms/button";
import { CmsFormField, CmsTextarea } from "@/components/cms/fields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Nexus's `useCmsConfirm` + `CmsConfirmModal` and its toast helper.
 *
 * `confirm()` resolves true or false; `prompt()` resolves the typed reason or
 * `null` — the reject and suspend flows need a reason on record, which Nexus's
 * modal has no field for, so the field sits under the description here.
 */
export type ConfirmType = "danger" | "warning" | "info" | "success";

const TYPE: Record<
  ConfirmType,
  { readonly icon: LucideIcon; readonly text: string; readonly button: "error" | "warning" | "action" | "success" }
> = {
  danger: { icon: TriangleAlert, text: "text-destructive", button: "error" },
  warning: { icon: CircleAlert, text: "text-warning", button: "warning" },
  info: { icon: Info, text: "text-info", button: "action" },
  success: { icon: CircleCheck, text: "text-success", button: "success" },
};

export type ConfirmOptions = {
  readonly type?: ConfirmType;
  readonly title: string;
  readonly description?: ReactNode;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
};

export type PromptOptions = ConfirmOptions & {
  readonly inputLabel: string;
  readonly placeholder?: string;
  readonly defaultValue?: string;
  readonly required?: boolean;
};

type Pending =
  | ({ readonly kind: "confirm"; readonly resolve: (value: boolean) => void } & ConfirmOptions)
  | ({ readonly kind: "prompt"; readonly resolve: (value: string | null) => void } & PromptOptions);

type ToastColor = "success" | "error" | "info" | "warning";

type FeedbackApi = {
  readonly confirm: (options: ConfirmOptions) => Promise<boolean>;
  readonly prompt: (options: PromptOptions) => Promise<string | null>;
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
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ kind: "confirm", resolve, ...options })),
    [],
  );
  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => setPending({ kind: "prompt", resolve, ...options })),
    [],
  );
  const toast = useCallback<FeedbackApi["toast"]>(
    ({ color = "success", title, description }) => {
      manager.add({ title, description, type: color });
    },
    [manager],
  );
  const api = useMemo(() => ({ confirm, prompt, toast }), [confirm, prompt, toast]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {pending ? (
        <ConfirmModal
          key={pending.title}
          onClose={(value) => {
            if (pending.kind === "confirm") pending.resolve(value !== null);
            else pending.resolve(value);
            setPending(null);
          }}
          pending={pending}
        />
      ) : null}
    </FeedbackContext.Provider>
  );
}

/**
 * `CmsConfirmModal`: centred icon, title and description, the actions centred in
 * the footer band. Only the buttons close it — Nexus turns off backdrop and
 * Escape dismissal so a destructive choice is always explicit.
 */
function ConfirmModal({
  pending,
  onClose,
}: {
  readonly pending: Pending;
  /** `null` is cancel; a string is confirm (the reason, for a prompt). */
  readonly onClose: (value: string | null) => void;
}) {
  const t = useTranslations("cms.feedback");
  const config = TYPE[pending.type ?? "info"];
  const Icon = config.icon;
  const inputId = useId();
  const [value, setValue] = useState(pending.kind === "prompt" ? (pending.defaultValue ?? "") : "");
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const needsValue = pending.kind === "prompt" && (pending.required ?? true);
  const missing = needsValue && value.trim() === "";

  return (
    <Dialog
      disablePointerDismissal
      onOpenChange={(open, details) => {
        // Escape is a dismissal Nexus switches off too.
        if (!open && details.reason === "escape-key") details.cancel();
      }}
      open
    >
      <DialogContent
        className="max-w-[calc(100vw-2rem)] gap-0 divide-y divide-border rounded-lg bg-card p-0 shadow-lg ring-1 ring-border sm:max-w-lg"
        initialFocus={pending.kind === "prompt" ? inputRef : undefined}
        showCloseButton={false}
      >
        <div className="flex flex-col items-center gap-3 p-4 py-5 text-center sm:p-6">
          <Icon aria-hidden className={cn("size-10", config.text)} />
          <DialogTitle className="text-base font-semibold text-highlighted">
            {pending.title}
          </DialogTitle>
          {pending.description !== undefined ? (
            <DialogDescription className="text-sm text-muted-foreground">
              {pending.description}
            </DialogDescription>
          ) : null}
          {pending.kind === "prompt" ? (
            <CmsFormField
              className="w-full text-start"
              error={touched && missing ? t("reasonRequired") : undefined}
              htmlFor={inputId}
              label={pending.inputLabel}
              required={needsValue}
            >
              <CmsTextarea
                id={inputId}
                invalid={touched && missing}
                onChange={(event) => setValue(event.target.value)}
                placeholder={pending.placeholder}
                ref={inputRef}
                rows={3}
                value={value}
              />
            </CmsFormField>
          ) : null}
        </div>
        <div className="flex items-center justify-center gap-1.5 p-4 sm:px-6">
          <CmsButton color="neutral" onClick={() => onClose(null)} variant="outline">
            {pending.cancelLabel ?? t("cancel")}
          </CmsButton>
          <CmsButton
            color={config.button}
            onClick={() => {
              if (missing) {
                setTouched(true);
                inputRef.current?.focus();
                return;
              }
              onClose(value.trim());
            }}
          >
            {pending.confirmLabel ?? t("confirm")}
          </CmsButton>
        </div>
      </DialogContent>
    </Dialog>
  );
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
