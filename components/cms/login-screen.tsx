"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, type FormEvent } from "react";

import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormField, CmsInput } from "@/components/cms/fields";
import { Checkbox } from "@/components/ui/checkbox";
import { logo } from "@/lib/assets/r2";
import { isEmail, safeNext, signIn, useSession } from "@/lib/session";

type FieldErrors = { email?: string; password?: string };

/**
 * Nexus's login pins both inputs' ring to `#e2e8f0` — the border slate, a step
 * lighter than every other console control — and keeps it there on focus. The
 * console's own fields have since grown to the site's 40px rounded control;
 * these keep Nexus's 32px one with its small corners.
 */
const LOGIN_INPUT =
  "h-8 rounded-md border-0 px-2.5 py-1.5 text-sm text-highlighted ring-1 ring-border ring-inset placeholder:text-dimmed focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-inset aria-invalid:ring-1 aria-invalid:ring-destructive md:h-8 md:text-sm";

/** The console's labels are muted now; Nexus's sat in full ink. */
function Label({ children }: { readonly children: string }) {
  return <span className="text-foreground">{children}</span>;
}

/**
 * Nexus's `/admin/login`: the `auth` layout (grey page, centred 448px column)
 * around a `UPageCard` holding `UAuthForm` — the logo (no visible title), email,
 * password, remember me, a full-width blue submit, in English as Nexus has
 * them, and no demo-account picker. Failures surface as a toast, the way
 * Nexus's `cmsFormatAuthError` reports them.
 */
export function CmsLoginScreen({ preset = "default" }: { readonly preset?: "default" | "error" }) {
  const t = useTranslations("cms.login");
  const s = useTranslations("errorStates");
  const router = useRouter();
  const session = useSession();
  const { toast } = useCmsFeedback();
  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();

  const [email, setEmail] = useState(preset === "error" ? "admin@advisory.test" : "");
  const [password, setPassword] = useState(preset === "error" ? "wrong-password" : "");
  const [remember, setRemember] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  // Already signed in as an admin: Nexus sends a valid session straight in.
  const signedInAdmin =
    session.status === "authenticated" && session.account.role === "admin";
  useEffect(() => {
    if (signedInAdmin) router.replace("/admin/dashboard");
  }, [router, signedInAdmin]);

  useEffect(() => {
    if (preset !== "error") return;
    toast({ color: "error", title: t("invalidTitle"), description: t("invalidBody") });
  }, [preset, t, toast]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const next: FieldErrors = {};
    if (!isEmail(email)) next.email = t("emailError");
    if (password.length < 6) next.password = t("passwordError");
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    const result = await signIn(email, password, { allow: ["admin"] });
    if (result.ok) {
      // Left loading: the redirect is in flight and the session already exists.
      const redirect = safeNext(new URLSearchParams(window.location.search).get("next"));
      router.replace(redirect?.startsWith("/admin") ? redirect : "/admin/dashboard");
      return;
    }
    setLoading(false);
    // `failed` and `unreachable` are new reasons the mock database had no way to
    // produce. They take the shared `errorStates` pair rather than the console's
    // own copy: a 500 and a build with no API to talk to are neither of them a
    // wrong password, and `forbidden` — a real password at the admin door — is
    // still the one that has to be said plainly.
    const copy = {
      invalid: { title: t("invalidTitle"), description: t("invalidBody") },
      locked: { title: t("lockedTitle"), description: t("lockedBody") },
      suspended: { title: t("suspendedTitle"), description: t("suspendedBody") },
      forbidden: { title: t("forbiddenTitle"), description: t("forbiddenBody") },
      failed: { title: s("serverTitle"), description: result.message ?? s("serverBody") },
      unreachable: { title: s("offlineTitle"), description: s("offlineBody") },
    }[result.reason];
    toast({ color: "error", ...copy });
  }

  return (
    // Nexus's `auth` layout grounds the card on `bg-gray-50`; half the console's
    // muted slate over white lands on the same near-white.
    <div className="flex min-h-dvh items-center justify-center bg-muted/50 px-4 py-12 sm:px-6 md:px-8">
      <div className="w-full max-w-md">
        {/* The card is all English, so it sets in the Latin face: Nexus's Outfit
            is not loaded here, and Geist's strokes sit at Outfit's weight where
            Noto Sans Thai's Latin reads a step heavier at the same numbers. */}
        <div className="relative flex rounded-lg bg-card font-latin shadow-xl ring-1 ring-border">
          <div className="flex flex-1 flex-col gap-y-4 p-4 sm:p-6">
            <form
              className="w-full space-y-6"
              noValidate
              onSubmit={(event) => void submit(event)}
            >
              <div className="flex flex-col text-center">
                <div className="my-2">
                  <Image
                    alt="Advisory Platform"
                    className="mx-auto block h-9 w-auto"
                    priority
                    src={logo}
                  />
                </div>
                {/* The logo heads the card; the title stays for screen readers. */}
                <h1 className="sr-only">{t("title")}</h1>
              </div>
              <div className="space-y-5">
                <CmsFormField
                  className="gap-1"
                  error={errors.email}
                  htmlFor={emailId}
                  label={<Label>{t("email")}</Label>}
                  required
                >
                  <CmsInput
                    autoComplete="username"
                    className="w-full"
                    id={emailId}
                    inputClassName={LOGIN_INPUT}
                    invalid={Boolean(errors.email)}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("emailPlaceholder")}
                    type="email"
                    value={email}
                  />
                </CmsFormField>
                <CmsFormField
                  className="gap-1"
                  error={errors.password}
                  htmlFor={passwordId}
                  label={<Label>{t("password")}</Label>}
                  required
                >
                  <CmsInput
                    autoComplete="current-password"
                    id={passwordId}
                    inputClassName={LOGIN_INPUT}
                    invalid={Boolean(errors.password)}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t("passwordPlaceholder")}
                    trailing={
                      <CmsButton
                        aria-label={revealed ? t("hidePassword") : t("showPassword")}
                        aria-pressed={revealed}
                        className="p-0 text-dimmed hover:text-foreground [&_svg]:size-5"
                        icon={revealed ? EyeOff : Eye}
                        onClick={() => setRevealed((value) => !value)}
                        type="button"
                        variant="link"
                      />
                    }
                    type={revealed ? "text" : "password"}
                    value={password}
                  />
                </CmsFormField>
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={remember}
                    id={rememberId}
                    onCheckedChange={(checked) => setRemember(checked)}
                  />
                  <label className="font-medium text-foreground" htmlFor={rememberId}>
                    {t("remember")}
                  </label>
                </div>
                {/* Nexus's submit is `#2B7FFF` — Tailwind's own blue-500, a shade
                    brighter than the console's secondary — with a 300ms fade,
                    square-cornered where the console's buttons are now round. */}
                <CmsButton
                  block
                  className="h-auto rounded-md bg-blue-500 py-2 text-action-foreground transition-all duration-300 hover:bg-blue-500/90 disabled:bg-blue-500 disabled:opacity-80 md:h-auto"
                  loading={loading}
                  type="submit"
                >
                  {t("submit")}
                </CmsButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
