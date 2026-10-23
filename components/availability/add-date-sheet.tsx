import Link from "next/link";
import { useTranslations } from "next-intl";

import { NeutralButton } from "@/components/mobile/buttons";
import { ThaiText } from "@/components/mobile/thai-text";
import { Input } from "@/components/ui/input";

/** Figma's date sheet, with values submitted by the editor form behind it. */
export function AddDateSheet({ profileId = "" }: { readonly profileId?: string }) {
  const t = useTranslations("availability");
  const c = useTranslations("common");
  const editorHref = `/availability/profiles/edit/specific${profileId ? `?id=${encodeURIComponent(profileId)}` : ""}`;
  return <>
    <div aria-hidden className="absolute inset-0 z-10 bg-scrim/40" />
    <div aria-label={t("addSheet.title")} className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-4 rounded-t-2xl bg-card px-6 pt-3 pb-5 lg:inset-0 lg:m-auto lg:h-fit lg:w-[420px] lg:rounded-2xl lg:border lg:border-border lg:p-6 lg:shadow-lg" role="dialog">
      <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border lg:hidden" />
      <div className="flex w-full shrink-0 flex-col items-start gap-1.5"><h2 className="w-full text-xl leading-7 font-semibold text-foreground">{t("addSheet.title")}</h2><p className="w-full text-sm text-muted-foreground"><ThaiText>{t("addSheet.subtitle")}</ThaiText></p></div>
      <label className="grid w-full shrink-0 gap-1.5 text-sm font-medium">{t("addSheet.dateLabel")}<Input name="newSpecificDate" type="date" required /></label>
      <div className="flex w-full shrink-0 flex-col items-start gap-1.5"><p className="w-full text-sm font-medium">{t("addSheet.rangeLabel")}</p><div className="flex w-full items-center gap-2"><Input aria-label={`${t("addSheet.rangeLabel")} เริ่ม`} className="h-10" name="newSpecificStart" type="time" required/><span className="text-muted-foreground">–</span><Input aria-label={`${t("addSheet.rangeLabel")} สิ้นสุด`} className="h-10" name="newSpecificEnd" type="time" required/></div><Link className="w-full text-sm font-medium text-primary" href={editorHref}>{t("addSheet.addAnother")}</Link><p className="w-full text-xs text-muted-foreground"><ThaiText>{t("addSheet.hint")}</ThaiText></p></div>
      <div className="flex w-full items-start gap-3"><NeutralButton className="w-30 shrink-0" href={editorHref}>{c("cancel")}</NeutralButton><button className="min-w-px flex-1 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground" type="submit">{t("addSheet.confirm")}</button></div>
    </div>
  </>;
}
