"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, type FormEvent } from "react";

import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormField, CmsInput } from "@/components/cms/fields";
import { DemoAccounts } from "@/components/session/demo-accounts";
import { Checkbox } from "@/components/ui/checkbox";
import { logo } from "@/lib/assets/r2";
import { isEmail, safeNext, signIn, useSession } from "@/lib/session";

type FieldErrors = { email?: string; password?: string };

/**
 * Nexus's `/admin/login`: the `auth` layout (grey page, centred 448px column)
 * around a `UPageCard` holding `UAuthForm` — logo, "Login", email, password,
 * remember me, a full-width blue submit. Failures surface as a toast, the way
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
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12 sm:px-6 md:px-8">
      <div className="w-full max-w-md">
        <div className="relative flex rounded-lg bg-card shadow-xl ring-1 ring-border">
          <div className="flex flex-1 flex-col gap-y-4 p-4 sm:p-6">
            <form
              className="w-full space-y-6"
              noValidate
              onSubmit={(event) => void submit(event)}
            >
              <div className="flex flex-col text-center">
                <div className="mb-2">
                  <Image
                    alt="Advisory Platform"
                    className="mx-auto block h-auto w-28"
                    priority
                    src={logo}
                  />
                </div>
                <h1 className="text-xl font-semibold text-pretty text-highlighted">{t("title")}</h1>
              </div>
              <div className="space-y-5">
                <CmsFormField error={errors.email} htmlFor={emailId} label={t("email")} required>
                  <CmsInput
                    autoComplete="username"
                    className="w-full"
                    id={emailId}
                    invalid={Boolean(errors.email)}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("emailPlaceholder")}
                    type="email"
                    value={email}
                  />
                </CmsFormField>
                <CmsFormField
                  error={errors.password}
                  htmlFor={passwordId}
                  label={t("password")}
                  required
                >
                  <CmsInput
                    autoComplete="current-password"
                    id={passwordId}
                    invalid={Boolean(errors.password)}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t("passwordPlaceholder")}
                    trailing={
                      <CmsButton
                        aria-label={revealed ? t("hidePassword") : t("showPassword")}
                        aria-pressed={revealed}
                        className="p-0 text-dimmed [&_svg]:size-5"
                        color="neutral"
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
                <CmsButton block className="py-2" color="action" loading={loading} type="submit">
                  {t("submit")}
                </CmsButton>
              </div>
            </form>
            <DemoAccounts
              only={["admin"]}
              onPick={(account) => {
                setEmail(account.email);
                setPassword(account.password);
                setErrors({});
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
