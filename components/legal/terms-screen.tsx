"use client";

import { LegalDocument } from "@/components/legal/legal-document";
import { terms } from "@/lib/legal/terms";

/** `/terms` — the terms of service. The text is in `lib/legal/terms.ts`. */
export function TermsScreen() {
  return <LegalDocument current="terms" document={terms} />;
}
