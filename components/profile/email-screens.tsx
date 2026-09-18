"use client";

import { useRouter } from "next/navigation";
import { Mail, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { AlertBanner } from "@/components/mobile/banner";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import {
  ACCOUNT_FORM_PANEL,
  ACCOUNT_HEADING,
  ACCOUNT_NAV,
  AccountBackBar,
} from "@/components/profile/account-chrome";
import { useAccount } from "@/components/session/account-bits";
import { TopBar } from "@/components/topbar";
import { getDatabase } from "@/lib/mock-db/store";
import { isEmail } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Figma "Current Card" (995:7305) and "Still Card" (995:7787) — a read-only row
 * on the card surface: a 16px mail glyph, then a 12/18 muted caption over the
 * 14/20 medium address. The auth frames draw the same block as "Sent To", see
 * `ResetLinkSentScreen`.
 *
 * On the phone the card reads against the page; inside the desktop panel the
 * two surfaces are the same white, so it takes the muted tint there — the call
 * `edit-profile-screen` already made for its locked-email card.
 */
function EmailCard({
  caption,
  value,
  className,
}: {
  readonly caption: ReactNode;
  readonly value: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-center gap-2.5 overflow-clip rounded-xl bg-card p-3.5 lg:bg-muted/50",
        className,
      )}
    >
      <Mail className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-xs font-normal text-muted-foreground">{caption}</p>
        <p className="font-latin w-full text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

/** What stopped the form, at most one at a time. */
type Problem = "in-use" | "invalid-email" | "same-email" | "wrong-password";

/**
 * The pending address `ChangeEmailScreen` hands on, read straight off the URL.
 *
 * It is a browser value, so it is subscribed to rather than copied into state
 * in an effect: the static render and the hydration pass both see `null` — the
 * frame's fixture stands in there — and React re-reads it once on the client.
 * Nothing mutates it without a navigation, which remounts the screen, so the
 * subscription is empty.
 */
const subscribeNever = () => () => {};
const readPendingEmail = () => new URLSearchParams(window.location.search).get("to");
const noPendingEmail = () => null;

/**
 * Figma "Change email" (995:7287) and its already-in-use state (995:7320),
 * which adds an alert banner under the heading and an inline error under the
 * address field.
 *
 * Figma "Desktop / Change email (Light)" (1836:7823) and the same state
 * (1836:7903) put the form in an 800px panel and stand the current address
 * beside the fields instead of above them, so the reader can compare the two
 * as they type.
 *
 * The form checks the mock database: the address has to parse, has to differ
 * from the one in use, and must not belong to another account; the password
 * has to be the signed-in account's. Nothing is written — both frames say the
 * change only lands when the link in the new inbox is opened — so a pass hands
 * the pending address to the verify screen and stops there. `state` only seeds
 * the in-use frame so its route still opens on it; typing clears it.
 */
export function ChangeEmailScreen({
  state = "default",
}: {
  readonly state?: "default" | "in-use";
}) {
  const t = useTranslations("changeEmail");
  const c = useTranslations("common");
  const router = useRouter();
  const account = useAccount();
  const seeded = state === "in-use";

  const [email, setEmail] = useState(seeded ? t("inUseValue") : "");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<Problem | null>(seeded ? "in-use" : null);

  const currentEmail = account?.email ?? c("emailValue");
  const inUse = problem === "in-use";

  let emailError: string | undefined;
  if (inUse) emailError = t("inUseFieldError");
  else if (problem === "invalid-email") emailError = t("invalidEmail");
  else if (problem === "same-email") emailError = t("sameEmail");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = email.trim().toLowerCase();
    if (!isEmail(next)) {
      setProblem("invalid-email");
      return;
    }
    if (next === currentEmail.toLowerCase()) {
      setProblem("same-email");
      return;
    }
    if (getDatabase().accounts.some((a) => a.email.toLowerCase() === next)) {
      setProblem("in-use");
      return;
    }
    // A signed-out visitor has no password to check against — the exported HTML
    // is still clickable through to the frame that follows.
    if (account && password !== account.password) {
      setProblem("wrong-password");
      return;
    }
    router.push(`/settings/email/verify?to=${encodeURIComponent(next)}`);
  }

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/settings" label={c("back")} />
      <ScreenBody>
        <div className={ACCOUNT_NAV}>
          <TopBar unreadNotifications />
        </div>
        <AccountBackBar href="/settings" label={c("back")} />

        {/* Figma "Head Band" — the title on the card surface, above the page. */}
        <div className="w-full shrink-0 lg:bg-card">
          <ScreenHeading
            className={ACCOUNT_HEADING}
            subtitle={t("subtitle")}
            title={t("title")}
          />
        </div>

        {/* Figma "Form Band" — the panel the whole form moves into at 1440. */}
        <form
          className={cn("flex w-full flex-1 flex-col items-center", ACCOUNT_FORM_PANEL)}
          noValidate
          onSubmit={submit}
        >
          {inUse ? (
            <AlertBanner
              body={t("inUseBody", { email: email.trim() || t("inUseValue") })}
              className="lg:px-0"
              icon={Mail}
              title={t("inUseTitle")}
            />
          ) : null}

          {/* Figma "Split" — the current address turns the corner into its own
              column beside the fields, so it stays in view while they change. */}
          <div
            className={cn(
              "flex w-full shrink-0 flex-col items-start lg:grid lg:grid-cols-2 lg:items-start lg:gap-8",
              inUse && "lg:pt-6",
            )}
          >
            {/* Figma "Current Email": above the fields on the phone, to their
                right at 1440 — one block, moved by `order`. */}
            <div className="flex w-full shrink-0 flex-col items-start px-6 pt-4 lg:order-last lg:px-0">
              <EmailCard caption={t("currentLabel")} value={currentEmail} />
            </div>

            {/* Figma "Form Fields": 16px top padding, 16px between fields. */}
            <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-4 lg:px-0">
              <Field
                autoComplete="email"
                error={emailError}
                id="new-email"
                invalid={emailError !== undefined}
                label={t("newLabel")}
                latin
                onChange={(event) => {
                  setEmail(event.target.value);
                  setProblem(null);
                }}
                placeholder={t("newPlaceholder")}
                type="email"
                value={email}
              />
              <Field
                autoComplete="current-password"
                error={problem === "wrong-password" ? t("wrongPassword") : undefined}
                id="confirm-password"
                invalid={problem === "wrong-password"}
                label={t("passwordLabel")}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setProblem(null);
                }}
                placeholder={t("passwordPlaceholder")}
                type="password"
                value={password}
              />
            </div>
          </div>

          {/* The phone frame pins the action to the bottom edge; on the panel it
              sits under the two columns, held to the right at Figma's 210×44. */}
          <ScreenSpacer className="lg:hidden" />
          <ScreenActions className="lg:flex-row-reverse lg:justify-start lg:px-0 lg:pt-8 lg:pb-0">
            <PrimaryButton
              className="disabled:opacity-40 lg:h-11 lg:w-[210px]"
              disabled={!email.trim() || !password}
              type="submit"
            >
              {t("submit")}
            </PrimaryButton>
          </ScreenActions>
        </form>

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * Figma "Verify email" (995:7766) — where `ChangeEmailScreen` lands once the
 * link is on its way.
 *
 * Figma "Desktop / Verify email (Light)" (1836:7990) lifts the title out of the
 * hero and onto the head band, leaving the badge and the line under it in a
 * 640-ish centred column, and lays the two actions out as a row of 210px
 * buttons instead of a stack.
 *
 * The pending address rides the query string rather than a store: the change
 * form is a separate route, and nothing is written until the link is opened.
 * Until it is read — the static render, and a visitor who opened this route
 * directly — the frame's own fixture stands in, the way `account-bits` treats
 * every other value a static frame draws.
 */
export function VerifyEmailScreen() {
  const t = useTranslations("verifyEmail");
  const c = useTranslations("common");
  const account = useAccount();

  const pending = useSyncExternalStore(subscribeNever, readPendingEmail, noPendingEmail);

  const email = pending ?? t("pendingFallback");
  const resend = pending
    ? `/settings/email/verify?to=${encodeURIComponent(pending)}`
    : "/settings/email/verify";

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/settings/email" label={c("back")} />
      <ScreenBody>
        <div className={ACCOUNT_NAV}>
          <TopBar unreadNotifications />
        </div>
        <AccountBackBar href="/settings/email" label={c("back")} />

        {/* Figma "Head Band" — desktop only: the phone frame keeps its title in
            the hero, under the badge, so the two are one heading drawn in the
            two places each viewport puts it and hidden where the other belongs. */}
        <div className="hidden w-full shrink-0 lg:block lg:bg-card">
          <ScreenHeading className={ACCOUNT_HEADING} title={t("title")} />
        </div>

        <div className={cn("flex w-full flex-1 flex-col items-center", ACCOUNT_FORM_PANEL)}>
          {/* Figma "Hero": 96px badge inset 56px from the top, an 18px gap, then
              the text block. */}
          <div className="flex w-full shrink-0 flex-col items-center pt-14">
            <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-muted">
              <MailCheck className="size-10 text-primary" />
            </span>
            <div className="flex w-full shrink-0 flex-col items-center gap-2.5 overflow-clip px-6 pt-4.5 text-center lg:px-0">
              <h1 className="w-full text-heading font-semibold text-foreground lg:hidden">
                {t("title")}
              </h1>
              <p className="w-full text-sm font-normal text-muted-foreground">
                {t("subtitle", { email })}
              </p>
            </div>
          </div>

          {/* Figma "Still Active" — the address the session still answers to.
              The panel shrinks the card to its content and centres it. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-6 lg:items-center lg:px-0">
            <EmailCard
              caption={t("stillLabel")}
              className="lg:w-auto"
              value={account?.email ?? c("emailValue")}
            />
          </div>

          {/* The phone frame pins the actions to the bottom edge; the panel is
              only as tall as its content, so the stack turns into Figma's
              centred row of 210px buttons. */}
          <ScreenSpacer className="lg:hidden" />
          <ScreenActions className="lg:flex-row lg:justify-center lg:px-0 lg:pt-14 lg:pb-8">
            <PrimaryButton className="lg:w-[210px]" href="/settings">
              {t("backToSettings")}
            </PrimaryButton>
            <NeutralButton className="lg:w-[210px]" href={resend}>
              {t("resend")}
            </NeutralButton>
          </ScreenActions>
        </div>

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
