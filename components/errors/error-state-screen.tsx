import Image from "next/image";
import { useTranslations } from "next-intl";

import { errorNoConnection as noConnection, errorNotFound as notFound, errorSearch as serverError } from "@/lib/assets/r2";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";

type ErrorKind = "no-connection" | "not-found" | "server";

/**
 * Figma "Error states (Light) Thai" — no-connection (995:5919), not-found
 * (995:5980) and server (995:6055). Each frame pads the illustration block with
 * equal top/bottom spacers, so the group is optically centred between the top bar
 * and the action stack; an 18px gap sits under the artwork.
 *
 * "Desktop - Error states (Light) Thai" (1594:33779) keeps that shape and only
 * changes its scale: the app nav replaces the bare back chevron, the artwork is
 * redrawn 280px tall, the copy is held to a 560px column at the next two steps
 * of the type scale, and the two actions sit side by side over the site footer.
 * Same file, same route — everything below is a `lg:` variant of the phone frame.
 */
export function ErrorStateScreen({ kind }: { readonly kind: ErrorKind }) {
  const t = useTranslations("errorStates");
  const c = useTranslations("common");

  const spec = {
    "no-connection": {
      art: noConnection,
      // Figma: 302.88 x 242.15 on the phone, 350.23 x 280 at 1440.
      size: "h-[242px] w-[303px] lg:h-70 lg:w-[350px]",
      title: t("offlineTitle"),
      body: t("offlineBody"),
      primary: t("retry"),
      secondary: t("goHome"),
    },
    "not-found": {
      art: notFound,
      // Figma: 271 x 263.80 on the phone, 287.64 x 280 at 1440.
      size: "h-[264px] w-[271px] lg:h-70 lg:w-[288px]",
      title: t("notFoundTitle"),
      body: t("notFoundBody"),
      primary: t("goHome"),
      secondary: t("helpCentre"),
    },
    server: {
      art: serverError,
      // Figma: 245.64 x 236.85 on the phone, 290.39 x 280 at 1440 — the same
      // artwork the matching empty state uses.
      size: "h-[237px] w-[246px] lg:h-70 lg:w-[290px]",
      title: t("serverTitle"),
      body: t("serverBody"),
      primary: t("retry"),
      secondary: t("helpCentre"),
    },
  }[kind];

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/" label={c("back")} />
      <ScreenBody>
        {/* The desktop frames open on the app's own nav; the phone frame has
            only the back chevron above, which is why this starts at `lg`. */}
        <div className="hidden w-full lg:block">
          <TopBar />
        </div>

        <div className="w-full min-h-px flex-1" />
        <div className="flex w-full shrink-0 flex-col items-center px-6 lg:pt-14">
          <Image alt="" className={`shrink-0 ${spec.size}`} src={spec.art} />
          {/* Figma "Error Text": 18px under the artwork, 40px title, 8px gap.
              The 1440 frame gives the same block a 560px column, 24px of air
              under the artwork and the 32/44 and 18/28 steps. */}
          <p className="mt-4.5 w-full text-center text-heading font-semibold text-foreground lg:mt-6 lg:max-w-140 lg:text-heading-lg">
            {spec.title}
          </p>
          <p className="mt-2 w-full text-center text-sm font-normal text-muted-foreground lg:mt-2.5 lg:max-w-140 lg:text-lg">
            {spec.body}
          </p>
        </div>
        {/* The phone stacks the actions against the bottom edge; the desktop
            frame sets them 24px under the copy as one row, so the lower spacer
            goes with the phone and a new one carries the footer down. */}
        <div className="w-full min-h-px flex-1 lg:hidden" />
        <ScreenActions className="lg:flex-row lg:justify-center lg:pt-6 lg:pb-0">
          <PrimaryButton className="lg:h-11 lg:w-45">{spec.primary}</PrimaryButton>
          <NeutralButton className="lg:h-11 lg:w-45">{spec.secondary}</NeutralButton>
        </ScreenActions>
        <div className="hidden w-full min-h-px flex-1 lg:block" />

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
