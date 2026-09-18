import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { logo } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

/**
 * Figma "Top Nav (guest)" (1787:23716) — the bar the auth frames wear at 1440:
 * an 84px row on the card surface, the lockup at the 120px page inset, three
 * pre-sale links, and the sign-up button holding the right edge.
 *
 * It is not `TopBar`. That bar is the signed-in app's: a menu glyph, a bell and
 * a portrait, none of which exist before an account does. Both are `lg`-only
 * chrome for the same screens, which is why this one lives beside the auth
 * screens rather than inside the app's nav.
 */
export function AuthTopNav({ className }: { readonly className?: string }) {
  const t = useTranslations("common");

  const links = [
    { label: t("howToUse"), href: "/landing#how-it-works" },
    { label: t("goodToKnow"), href: "/landing#good-to-know" },
    { label: t("faq"), href: "/landing#faq" },
  ];

  return (
    <div
      className={cn(
        "hidden w-full shrink-0 border-b border-border bg-card shadow-xs lg:flex lg:h-21 lg:items-center lg:px-10 xl:px-30",
        className,
      )}
    >
      <Link className="shrink-0" href="/">
        <Image alt="Advisory Platform" className="h-9 w-auto" priority src={logo} />
      </Link>
      <nav className="flex min-w-px flex-1 items-center gap-7 pl-12">
        {links.map(({ label, href }) => (
          <Link
            className="text-sm leading-5 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
            href={href}
            key={label}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Link
        className="flex shrink-0 items-center rounded-lg bg-primary px-4.5 py-2.5 text-sm leading-5 font-semibold text-primary-foreground shadow-md shadow-primary/28 transition-opacity hover:opacity-90"
        href="/register"
      >
        {t("signUp")}
      </Link>
    </div>
  );
}

/**
 * Figma "Footer" (1787:23753) — the 64px rule of legal links the desktop auth
 * frames close on. The phone frames have no footer at all, so it starts at `lg`
 * like the nav above it.
 */
export function AuthFooter({ className }: { readonly className?: string }) {
  const t = useTranslations("common");

  const links = [
    { label: t("termsOfService"), href: "/terms" },
    { label: t("privacy"), href: "/pdpa" },
    { label: t("help"), href: "/landing#faq" },
  ];

  return (
    <div
      className={cn(
        "hidden w-full shrink-0 border-t border-border bg-card lg:flex lg:h-16 lg:items-center lg:justify-center lg:gap-6",
        className,
      )}
    >
      {links.map(({ label, href }) => (
        <Link
          className="text-sm leading-5 font-normal whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
          href={href}
          key={label}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Figma "Auth Card" (1787:23739) — the 448px panel the desktop frames centre in
 * the page: a 16px radius on the card surface, a hairline and a lifted shadow.
 *
 * On the phone the same form is the screen itself, edge to edge, so this is a
 * set of `lg:` classes to spread onto that form rather than a wrapper of its
 * own — the form stays one element at both sizes.
 */
export const AUTH_CARD =
  "lg:my-12 lg:w-[448px] lg:flex-none lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:px-2 lg:py-2 lg:shadow-[0_8px_24px_-4px_rgb(0_0_0/0.1),0_1px_2px_0_rgb(0_0_0/0.04)]";
