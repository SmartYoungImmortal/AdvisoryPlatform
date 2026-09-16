"use client";

import { useId, useState, type ReactNode } from "react";

import {
  CmsFormField,
  CmsReasonField,
  CmsSelect,
  type CmsOption,
} from "@/components/cms/fields";

/**
 * A record page's decision: the outcome picked in the options column and the
 * reason some outcomes need. Nothing is asked in a dialog — `validate` marks
 * whichever field is missing and the page shows it in place.
 */
export type CmsDecision<Outcome extends string> = {
  readonly outcome: Outcome | null;
  readonly reason: string;
  readonly outcomeError?: string;
  readonly reasonError?: string;
  readonly needsReason: (outcome: Outcome) => boolean;
  readonly setOutcome: (value: Outcome) => void;
  readonly setReason: (value: string) => void;
  /** The chosen outcome and trimmed reason, or null once the gaps are flagged. */
  readonly validate: () => { readonly outcome: Outcome; readonly reason: string } | null;
};

export function useCmsDecision<Outcome extends string>({
  needsReason,
  outcomeRequired,
  reasonRequired,
}: {
  readonly needsReason: (outcome: Outcome) => boolean;
  readonly outcomeRequired: string;
  readonly reasonRequired: string;
}): CmsDecision<Outcome> {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [reason, setReason] = useState("");
  const [outcomeError, setOutcomeError] = useState<string | undefined>();
  const [reasonError, setReasonError] = useState<string | undefined>();

  return {
    outcome,
    reason,
    outcomeError,
    reasonError,
    needsReason,
    setOutcome: (value) => {
      setOutcome(value);
      setOutcomeError(undefined);
      setReasonError(undefined);
    },
    setReason: (value) => {
      setReason(value);
      setReasonError(undefined);
    },
    validate: () => {
      if (!outcome) {
        setOutcomeError(outcomeRequired);
        return null;
      }
      if (needsReason(outcome) && !reason.trim()) {
        setReasonError(reasonRequired);
        return null;
      }
      return { outcome, reason: reason.trim() };
    },
  };
}

/** The outcome select and, when the outcome calls for one, the reason under it. */
export function CmsDecisionFields<Outcome extends string>({
  decision,
  label,
  placeholder,
  help,
  items,
  reasonLabel,
  reasonPlaceholder,
  reasonHelp,
}: {
  readonly decision: CmsDecision<Outcome>;
  readonly label: ReactNode;
  readonly placeholder: string;
  readonly help?: ReactNode;
  readonly items: ReadonlyArray<CmsOption<Outcome>>;
  readonly reasonLabel: ReactNode;
  readonly reasonPlaceholder?: string;
  readonly reasonHelp?: ReactNode;
}) {
  const id = useId();
  return (
    <>
      <CmsFormField error={decision.outcomeError} help={help} htmlFor={id} label={label} required>
        <CmsSelect
          id={id}
          invalid={Boolean(decision.outcomeError)}
          items={items}
          onValueChange={decision.setOutcome}
          placeholder={placeholder}
          value={decision.outcome}
        />
      </CmsFormField>
      {decision.outcome && decision.needsReason(decision.outcome) ? (
        <CmsReasonField
          error={decision.reasonError}
          help={reasonHelp}
          label={reasonLabel}
          onChange={decision.setReason}
          placeholder={reasonPlaceholder}
          value={decision.reason}
        />
      ) : null}
    </>
  );
}
