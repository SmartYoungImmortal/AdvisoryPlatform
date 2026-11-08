"use client";

import { createContext, useContext } from "react";

/**
 * Which way the page around a part is laid out (`CmsPage`): the console's own
 * layout (a head bar across the panel, the body at its full width, each
 * section a card), or the centred column the overview keeps.
 */
export type CmsPageKind = "console" | "column";

export const CmsPageKindContext = createContext<CmsPageKind>("column");

export function useCmsPageKind(): CmsPageKind {
  return useContext(CmsPageKindContext);
}
