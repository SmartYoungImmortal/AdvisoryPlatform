"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { CmsButton } from "@/components/cms/button";
import { CmsFormField, CmsTextarea } from "@/components/cms/fields";

/**
 * The two halves of a verification ruling the identity and skill-proof review
 * pages share: the approve / reject pair in the options panel, and the reason
 * field at the foot of the record card that a rejection needs.
 */

/** Approve and reject, full width, for the options panel's actions. */
export function RulingActions({
  onApprove,
  onReject,
}: {
  readonly onApprove: () => void;
  readonly onReject: () => void;
}) {
  const t = useTranslations("cms.verification");
  return (
    <>
      <CmsButton block color="success" icon={Check} onClick={onApprove} size="lg">
        {t("approve")}
      </CmsButton>
      <CmsButton block color="error" icon={X} onClick={onReject} size="lg">
        {t("reject")}
      </CmsButton>
    </>
  );
}

/** Why it was rejected, ruled off from the card above; typing clears the error. */
export function RejectReasonField({
  id,
  value,
  error,
  onChange,
}: {
  readonly id: string;
  readonly value: string;
  readonly error: string | undefined;
  readonly onChange: (value: string) => void;
}) {
  const t = useTranslations("cms.verification");
  return (
    <div className="mt-6 border-t border-border pt-6">
      <CmsFormField error={error} htmlFor={id} label={t("reason")}>
        <CmsTextarea
          id={id}
          invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("rejectPlaceholder")}
          value={value}
        />
      </CmsFormField>
    </div>
  );
}
