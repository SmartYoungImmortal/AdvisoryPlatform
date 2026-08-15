import Image from "next/image";
import { useTranslations } from "next-intl";

import { errorNoConnection as noConnection, errorNotFound as notFound, errorSearch as serverError } from "@/lib/assets/r2";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";

type ErrorKind = "no-connection" | "not-found" | "server";

/**
 * Figma "Error states (Light) Thai" — no-connection (995:5919), not-found
 * (995:5980) and server (995:6055). Each frame pads the illustration block with
 * equal top/bottom spacers, so the group is optically centred between the top bar
 * and the action stack; an 18px gap sits under the artwork.
 */
export function ErrorStateScreen({ kind }: { readonly kind: ErrorKind }) {
  const t = useTranslations("errorStates");
  const c = useTranslations("common");

  const spec = {
    "no-connection": {
      art: noConnection,
      // Figma: 302.88 x 242.15
      width: 303,
      height: 242,
      title: t("offlineTitle"),
      body: t("offlineBody"),
      primary: t("retry"),
      secondary: t("goHome"),
    },
    "not-found": {
      art: notFound,
      // Figma: 271 x 263.80
      width: 271,
      height: 264,
      title: t("notFoundTitle"),
      body: t("notFoundBody"),
      primary: t("goHome"),
      secondary: t("helpCentre"),
    },
    server: {
      art: serverError,
      // Figma: 245.64 x 236.85 — the same artwork the matching empty state uses.
      width: 246,
      height: 237,
      title: t("serverTitle"),
      body: t("serverBody"),
      primary: t("retry"),
      secondary: t("helpCentre"),
    },
  }[kind];

  return (
    <MobileScreen>
      <ScreenTopBar href="/" label={c("back")} />
      <ScreenBody>
        <div className="w-full min-h-px flex-1" />
        <div className="flex w-full shrink-0 flex-col items-center px-6">
          <Image
            alt=""
            className="shrink-0"
            src={spec.art}
            style={{ width: spec.width, height: spec.height }}
          />
          {/* Figma "Error Text": 18px under the artwork, 40px title, 8px gap. */}
          <p className="mt-4.5 w-full text-center text-heading font-semibold text-foreground">
            {spec.title}
          </p>
          <p className="mt-2 w-full text-center text-sm font-normal text-muted-foreground">
            {spec.body}
          </p>
        </div>
        <div className="w-full min-h-px flex-1" />
        <ScreenActions>
          <PrimaryButton>{spec.primary}</PrimaryButton>
          <NeutralButton>{spec.secondary}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}
