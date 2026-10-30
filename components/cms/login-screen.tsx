"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Lock, ShieldAlert, TriangleAlert, WifiOff, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";

import { AUTH_LINK, AuthHeading, AuthSplit, authPill } from "@/components/auth/auth-split";
import { AlertBanner } from "@/components/mobile/banner";
import { Field, RevealPasswordButton } from "@/components/mobile/field";
import { Button } from "@/components/ui/button";
import { isEmail, safeNext, signIn, useSession } from "@/lib/session";

type FieldErrors = { email?: string; password?: string };

type Failure = "invalid" | "locked" | "suspended" | "forbidden" | "failed" | "unreachable";

/**
 * `/admin/login`, on the site's own sign-in frame (`AuthSplit`): the home
 * hero's room on the left half from `lg`, and on the right the heading that
 * the wordmark ends, the two fields and the ink capsule, flat on white. A
 * failed sign-in is said in the site's banner over the fields, with the API's
 * own sentence when it gave one.
 *
 * Only an admin gets in: `signIn` with `allow: ["admin"]` signs anyone else
 * straight back out, and this page says the account is not an admin's.
 */
export function CmsLoginScreen() {
  const t = useTranslations("cms.login");
  const s = useTranslations("errorStates");
  const router = useRouter();
  const session = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<{ reason: Failure; message?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Already signed in as an admin: a valid session goes straight in.
  const signedInAdmin =
    session.status === "authenticated" && session.account.role === "admin";
  useEffect(() => {
    if (signedInAdmin) router.replace("/admin/dashboard");
  }, [router, signedInAdmin]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const next: FieldErrors = {};
    if (!isEmail(email)) next.email = t("emailError");
    if (password.length < 6) next.password = t("passwordError");
    setErrors(next);
    if (next.email || next.password) return;

    setFailure(null);
    setLoading(true);
    const result = await signIn(email, password, { allow: ["admin"] });
    if (result.ok) {
      // Left loading: the redirect is in flight and the session already exists.
      const redirect = safeNext(new URLSearchParams(window.location.search).get("next"));
      router.replace(redirect?.startsWith("/admin") ? redirect : "/admin/dashboard");
      return;
    }
    setLoading(false);
    setFailure({ reason: result.reason, message: result.message });
  }

  // `failed` and `unreachable` take the shared `errorStates` pair: a 500 and a
  // build with no API to talk to are neither of them a wrong password, and
  // `forbidden` — a real password at the admin door — has to be said plainly.
  const banner: Record<Failure, { icon: LucideIcon; title: string; body: string }> = {
    invalid: { icon: TriangleAlert, title: t("invalidTitle"), body: t("invalidBody") },
    locked: { icon: Lock, title: t("lockedTitle"), body: t("lockedBody") },
    suspended: { icon: Ban, title: t("suspendedTitle"), body: t("suspendedBody") },
    forbidden: { icon: ShieldAlert, title: t("forbiddenTitle"), body: t("forbiddenBody") },
    failed: {
      icon: TriangleAlert,
      title: s("serverTitle"),
      body: failure?.message ?? s("serverBody"),
    },
    unreachable: { icon: WifiOff, title: s("offlineTitle"), body: s("offlineBody") },
  };
  const shown = failure ? banner[failure.reason] : null;

  return (
    <AuthSplit>
      <AuthHeading subtitle={t("subtitle")} title={t("title")} withLogo />
      {/* `px-0 pt-0`: the banner's own inset is the phone page's gutter, and
          inside the column it left the banner narrower than the fields. */}
      {shown ? (
        <AlertBanner body={shown.body} className="px-0 pt-0" icon={shown.icon} title={shown.title} />
      ) : null}
      <form className="flex flex-col gap-5 md:gap-6" noValidate onSubmit={(event) => void submit(event)}>
        <div className="flex flex-col gap-4">
          <Field
            autoComplete="username"
            error={errors.email}
            id="admin-email"
            invalid={Boolean(errors.email) || failure?.reason === "invalid"}
            label={t("email")}
            latin
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
              setFailure(null);
            }}
            outline
            placeholder={t("emailPlaceholder")}
            type="email"
            value={email}
          />
          <Field
            autoComplete="current-password"
            error={errors.password}
            id="admin-password"
            invalid={Boolean(errors.password) || failure?.reason === "invalid"}
            label={t("password")}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: undefined }));
              setFailure(null);
            }}
            outline
            placeholder={t("passwordPlaceholder")}
            trailing={
              <RevealPasswordButton
                label={revealed ? t("hidePassword") : t("showPassword")}
                onToggle={() => setRevealed((value) => !value)}
                revealed={revealed}
              />
            }
            type={revealed ? "text" : "password"}
            value={password}
          />
        </div>
        {/* `aria-busy` says the round trip is out to a reader who is not
            looking at the button. */}
        <Button aria-busy={loading || undefined} className={authPill(true)} disabled={loading} type="submit">
          {t("submit")}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t("notAdmin")}{" "}
        <Link className={AUTH_LINK} href="/login">
          {t("siteLogin")}
        </Link>
      </p>
    </AuthSplit>
  );
}
