import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThaiText } from "@/components/mobile/thai-text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** Inputs belong to the editor form even though the accessible dialog is portalled. */
export function AddDateSheet({ profileId, busy, error }: { readonly profileId: string; readonly busy: boolean; readonly error: string | null }) {
  const t = useTranslations("availability");
  const c = useTranslations("common");
  const router = useRouter();
  const [rangeCount, setRangeCount] = useState(1);
  const editorHref = `/availability/profiles/edit/specific?id=${encodeURIComponent(profileId)}`;
  const close = () => { if (!busy) router.push(editorHref); };
  const form = "availability-profile-form";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="top-auto bottom-0 left-0 flex max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-4 overflow-y-auto rounded-b-none rounded-t-2xl bg-card px-6 pt-3 pb-5 sm:max-w-none lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-105 lg:max-w-105 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:border lg:border-border lg:p-6 lg:shadow-lg" overlayClassName="bg-scrim/40" showCloseButton={false}>
        <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border lg:hidden" />
        <div className="flex w-full flex-col gap-1.5">
          <DialogTitle className="text-xl leading-7 font-semibold text-foreground">{t("addSheet.title")}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground"><ThaiText>{t("addSheet.subtitle")}</ThaiText></DialogDescription>
        </div>
        <fieldset className="contents" disabled={busy}>
          <label className="grid w-full gap-1.5 text-sm font-medium">{t("addSheet.dateLabel")}<Input form={form} name="newSpecificDate" type="date" required /></label>
          <div className="flex w-full flex-col gap-1.5">
            <p className="text-sm font-medium">{t("addSheet.rangeLabel")}</p>
            {Array.from({ length: rangeCount }, (_, index) => (
              <div key={index} className="flex w-full items-center gap-2">
                <Input aria-label={`${t("addSheet.rangeLabel")} ${index + 1} เริ่ม`} className="h-10" form={form} name="newSpecificStart" type="time" required />
                <span className="text-muted-foreground">–</span>
                <Input aria-label={`${t("addSheet.rangeLabel")} ${index + 1} สิ้นสุด`} className="h-10" form={form} name="newSpecificEnd" type="time" required />
              </div>
            ))}
            <Button className="h-auto justify-start p-0 text-sm font-medium" onClick={() => setRangeCount((count) => count + 1)} type="button" variant="link">{t("addSheet.addAnother")}</Button>
            <p className="text-xs text-muted-foreground"><ThaiText>{t("addSheet.hint")}</ThaiText></p>
          </div>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="flex w-full items-start gap-3">
            <Button className="w-30 shrink-0" onClick={close} type="button" variant="outline">{c("cancel")}</Button>
            <Button className="h-auto min-w-px flex-1 rounded-lg border-0 px-5 py-2 text-sm" form={form} type="submit">{busy ? "กำลังบันทึก…" : t("addSheet.confirm")}</Button>
          </div>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
