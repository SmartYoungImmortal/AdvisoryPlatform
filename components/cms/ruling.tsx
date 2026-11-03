"use client";

import { Check, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { CmsButton } from "@/components/cms/button";
import { CmsFormField, CmsTextarea } from "@/components/cms/fields";

/**
 * A two-way decision in the column beside a record — an identity check, a
 * skill document, a refund — in the two places the console's side panel
 * keeps a record's controls (`CmsSidebarOptions`): the reason a rejection
 * needs is its form (`field`, in the card at the top), and approve, filled in
 * ink, and reject, on red's tint, are its full-width actions at the foot.
 * Reject pressed with no reason says so under the field.
 */
export function useRulingDecision({
  approveLabel,
  rejectLabel,
  reasonLabel,
  reasonPlaceholder,
  reasonHelp,
  reasonRequired,
  onApprove,
  onReject,
}: {
  readonly approveLabel: string;
  readonly rejectLabel: string;
  readonly reasonLabel: string;
  readonly reasonPlaceholder?: string;
  /** Who will read the reason. */
  readonly reasonHelp?: string;
  /** Said under the field when reject is pressed with it empty. */
  readonly reasonRequired: string;
  readonly onApprove: () => void;
  /** Called with the trimmed reason, never an empty one. */
  readonly onReject: (reason: string) => void;
}): { readonly field: ReactNode; readonly actions: ReactNode } {
  const id = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();

  const field = (
    <CmsFormField error={error} help={reasonHelp} htmlFor={id} label={reasonLabel}>
      <CmsTextarea
        id={id}
        invalid={Boolean(error)}
        onChange={(event) => {
          setReason(event.target.value);
          setError(undefined);
        }}
        placeholder={reasonPlaceholder}
        value={reason}
      />
    </CmsFormField>
  );

  const actions = (
    <>
      <CmsButton block icon={Check} onClick={onApprove} size="lg">
        {approveLabel}
      </CmsButton>
      <CmsButton
        block
        icon={X}
        onClick={() => {
          const note = reason.trim();
          if (!note) {
            setError(reasonRequired);
            return;
          }
          onReject(note);
        }}
        size="lg"
        variant="danger-soft"
      >
        {rejectLabel}
      </CmsButton>
    </>
  );

  return { field, actions };
}
