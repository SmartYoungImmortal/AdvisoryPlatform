import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { AppFrame } from "@/components/account/app-frame";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";

export function AccountFormPage({ title, description, children }: { readonly title: string; readonly description?: ReactNode; readonly children: ReactNode }) {
  const c = useTranslations("common");
  return (
    <MobileScreen className="bg-background pb-0" wide="md">
      <ScreenTopBar href="/settings" label={c("back")} className="lg:hidden" />
      <AppFrame active="settings">
        <ScreenBody className="bg-background">
          <div className="mx-auto flex w-full max-w-[848px] flex-col px-6 lg:pt-12 lg:pb-22">
            <h1 className="pt-4 text-heading font-semibold lg:pt-0">{title}</h1>
            {description ? <p className="pt-2 text-sm text-muted-foreground">{description}</p> : null}
            {children}
          </div>
        </ScreenBody>
      </AppFrame>
    </MobileScreen>
  );
}

export const ACCOUNT_FORM_CLASS = "flex min-h-[calc(100dvh-156px)] w-full flex-col gap-4 pt-6 lg:mt-12 lg:min-h-0 lg:gap-6 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-9.75";
export const ACCOUNT_FORM_ACTIONS = "mt-auto flex flex-col gap-3 pt-12 pb-4 lg:mt-0 lg:flex-row lg:items-center lg:justify-end lg:pt-2 lg:pb-0";
export const ACCOUNT_FORM_SUBMIT = "h-9 w-full rounded-md bg-info text-sm text-primary-foreground hover:bg-info/90 lg:order-2 lg:h-11 lg:w-52.5";
export const ACCOUNT_FORM_CANCEL = "hidden h-11 rounded-md bg-card text-sm shadow-none lg:order-1 lg:inline-flex lg:w-30";
