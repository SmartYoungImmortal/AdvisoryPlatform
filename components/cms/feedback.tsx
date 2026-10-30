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
 * The console's confirmations and toasts.
 *
 * `confirm()` resolves true or false; `prompt()` resolves the typed reason or
 * `null` — the reject and suspend flows need a reason on record, so the field
 * sits under the question.
 */
export type ConfirmType = "danger" | "warning" | "info" | "success";

/** The mark over each kind of question; only what cannot be undone is drawn in red. */
const TYPE: Record<ConfirmType, { readonly icon: LucideIcon; readonly danger: boolean }> = {
  danger: { icon: TriangleAlert, danger: true },
  warning: { icon: CircleAlert, danger: false },
  info: { icon: Info, danger: false },
  success: { icon: CircleCheck, danger: false },
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

/** How long a confirmation stays, and a refusal: the API's sentence takes longer to read. */
const TOAST_MS = 4000;
const PROBLEM_TOAST_MS = 8000;

export function CmsFeedbackProvider({ children }: { readonly children: ReactNode }) {
  return (
    <Toast.Provider timeout={TOAST_MS}>
      <FeedbackHost>{children}</FeedbackHost>
      <Toast.Portal>
        {/* Where the site's toasts stand: centred near the foot on a phone,
            24 off the bottom right corner of the screen from `lg`, outside
            the page's zoom so its sizes are the screen's. */}
        <Toast.Viewport className="group/toasts fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 outline-none lg:inset-x-auto lg:right-6 lg:bottom-6 lg:items-end lg:px-0">
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
      manager.add({
        title,
        description,
        type: color,
        timeout: color === "error" ? PROBLEM_TOAST_MS : TOAST_MS,
      });
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
 * The question, as the site's centred popup asks one (the settings' change of
 * password): a white card with 18px corners over a dimmed page, the mark in a
 * soft grey disc, the title and its line centred under it, the reason field
 * when one is needed, and the two capsules stacked full width — what is being
 * done in ink (in red when it cannot be undone), the way out in soft grey.
 * Nothing boxed inside it but the field.
 *
 * Only the buttons close it: a backdrop press or Escape could otherwise
 * dismiss a destructive choice by accident.
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
  const popup = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(pending.kind === "prompt" ? (pending.defaultValue ?? "") : "");
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const needsValue = pending.kind === "prompt" && (pending.required ?? true);
  const missing = needsValue && value.trim() === "";

  return (
    <Dialog
      disablePointerDismissal
      onOpenChange={(open, details) => {
        if (!open && details.reason === "escape-key") details.cancel();
      }}
      open
    >
      <DialogContent
        className="block w-auto max-w-[calc(100%-2rem)] gap-0 rounded-2xl bg-card p-0 text-foreground shadow-hero-card ring-0 outline-none sm:max-w-none"
        // A prompt opens on its field; a plain question on the card itself, so
        // the first button does not open showing its focus ring.
        initialFocus={pending.kind === "prompt" ? inputRef : popup}
        overlayClassName="bg-scrim/50"
        ref={popup}
        showCloseButton={false}
      >
        <div className="cms-scale flex w-[min(27.5rem,calc(100vw-2rem))] flex-col p-6 md:p-8">
          <div className="flex flex-col items-center text-center">
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-full md:size-14",
                config.danger ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground",
              )}
            >
              <Icon aria-hidden className="size-6 md:size-7" strokeWidth={1.75} />
            </span>
            <DialogTitle className="mt-3 text-lg font-semibold text-foreground">
              {pending.title}
            </DialogTitle>
            {pending.description !== undefined ? (
              <DialogDescription className="mt-1 text-sm text-balance text-muted-foreground">
                {pending.description}
              </DialogDescription>
            ) : null}
          </div>
          {pending.kind === "prompt" ? (
            <CmsFormField
              className="mt-5 w-full"
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
          <div className="mt-6 flex flex-col gap-2">
            <CmsButton
              block
              onClick={() => {
                if (missing) {
                  setTouched(true);
                  inputRef.current?.focus();
                  return;
                }
                onClose(value.trim());
              }}
              size="lg"
              variant={config.danger ? "danger" : "primary"}
            >
              {pending.confirmLabel ?? t("confirm")}
            </CmsButton>
            <CmsButton block onClick={() => onClose(null)} size="lg" variant="soft">
              {pending.cancelLabel ?? t("cancel")}
            </CmsButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TOAST_LOOK: Record<ToastColor, { readonly icon: LucideIcon; readonly ink: string; readonly bar: string }> = {
  success: { icon: CircleCheck, ink: "text-confirm", bar: "bg-confirm" },
  error: { icon: TriangleAlert, ink: "text-destructive", bar: "bg-destructive" },
  info: { icon: Info, ink: "text-muted-foreground", bar: "bg-muted-foreground" },
  warning: { icon: CircleAlert, ink: "text-warning", bar: "bg-warning" },
};

/**
 * The site's toast card: white, 356 wide from `lg`, 14px corners, a hairline
 * and a soft shadow; the icon bare at the left, what happened over a second
 * line when there is one, and the time it has left running out along its
 * foot, held while the pointer is over the toasts (as their timers are).
 */
function ToastList() {
  const t = useTranslations("cms.feedback");
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const look = TOAST_LOOK[(toast.type as ToastColor | undefined) ?? "success"];
    const Icon = look.icon;
    return (
      <Toast.Root
        className="relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-xl border border-border bg-card py-3.5 ps-4 pe-2 text-sm text-foreground shadow-panel data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 lg:w-[356px] lg:max-w-none"
        key={toast.id}
        toast={toast}
      >
        <Icon aria-hidden className={cn("size-4.5 shrink-0", look.ink)} strokeWidth={2.25} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Toast.Title className="line-clamp-3 font-medium" />
          <Toast.Description className="line-clamp-3 text-muted-foreground" />
        </div>
        <Toast.Close
          aria-label={t("dismiss")}
          render={<CmsButton icon={X} size="sm" variant="ghost" />}
        />
        <span
          aria-hidden
          className={cn(
            "animate-toast-countdown absolute inset-x-0 bottom-0 h-0.5 group-hover/toasts:[animation-play-state:paused] motion-reduce:hidden",
            look.bar,
          )}
          style={{ animationDuration: `${toast.timeout ?? TOAST_MS}ms` }}
        />
      </Toast.Root>
    );
  });
}
