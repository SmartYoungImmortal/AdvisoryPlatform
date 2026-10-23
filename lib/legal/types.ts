import type { Locale } from "next-intl";

/**
 * A legal document as data, one per language.
 *
 * Held here rather than in `messages/*.json`: a contract is long, nested
 * (clause, sub-clause, list) and read as a whole, and spelling it as hundreds
 * of numbered keys (`s7b6`) made every edit a hunt and a reorder a rename.
 * `LegalDocument` lays out whatever shape this describes.
 */

/** A sub-clause: "5.3 Payments are held until the session ends". */
export type LegalSubsection = {
  readonly title: string;
  readonly paragraphs?: readonly string[];
  readonly bullets?: readonly string[];
};

/** A numbered clause. `id` is its anchor, stable across languages. */
export type LegalSection = {
  readonly id: string;
  readonly title: string;
  readonly paragraphs?: readonly string[];
  readonly bullets?: readonly string[];
  readonly subsections?: readonly LegalSubsection[];
};

export type LegalDoc = {
  readonly title: string;
  /** "In effect from 24 October 2026". */
  readonly effective: string;
  readonly version: string;
  /** What the document is and who it binds, before the first clause. */
  readonly lead: readonly string[];
  readonly sections: readonly LegalSection[];
  readonly contact: { readonly body: string; readonly email: string };
};

export type Localised<T> = Readonly<Record<Locale, T>>;
