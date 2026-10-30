"use client";

import { Check, X } from "lucide-react";
import { useId, useState } from "react";

import { CmsButton } from "@/components/cms/button";
import { CmsFormField, CmsTextarea } from "@/components/cms/fields";

/**
 * A two-way decision in the column beside a record — an identity check, a
 * skill document, a refund: approve, filled in ink, on top; under a hairline,
 * the reason a rejection needs and the reject button right under it, so the
 * field and the press that checks it are never apart.
 */
export function RulingDecision({
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
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();

  return (
    <div className="flex flex-col">
      <CmsButton block icon={Check} onClick={onApprove} size="lg">
        {approveLabel}
      </CmsButton>
      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
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
      </div>
    </div>
  );
}
