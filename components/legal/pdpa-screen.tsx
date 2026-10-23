"use client";

import { LegalDocument } from "@/components/legal/legal-document";
import { privacy } from "@/lib/legal/privacy";

/**
 * `/privacy-policy` — the privacy policy. The text is in `lib/legal/privacy.ts`.
 *
 * No accept button: consent is taken where it belongs, on the sign-up form's
 * required checkbox. Asking again on a public document recorded nothing.
 */
export function PdpaScreen() {
  return <LegalDocument current="privacy" document={privacy} />;
}
