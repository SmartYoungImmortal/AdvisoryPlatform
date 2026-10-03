import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/spinner"

export function LoadingScreen() {
  const t = useTranslations("payment.loading");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <ScreenTopBar label={c("back")} />
      <ScreenBody>
        <div className="w-full h-full flex justify-center items-center">
          <div className="">
            <div className="w-fit mx-auto mb-2">
              <Spinner className="size-8" />
            </div>
            <p className="text-muted-foreground font-medium">{t('loading')}</p>
          </div>
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}
