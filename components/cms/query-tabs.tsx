"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CmsBadge } from "@/components/cms/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type CmsQueryTab<Value extends string> = {
  readonly value: Value;
  readonly label: string;
  /** A count beside the label. */
  readonly count?: number;
  /** The count is work waiting — shown in the error colour while above zero. */
  readonly alert?: boolean;
};

/**
 * Nexus's `CmsQueryTabs`: Nuxt UI link tabs (a hairline under the row, the
 * active label and its underline in the primary) that keep the active tab in
 * `?tab=`, so a queue view is linkable and survives a reload. Switching tabs
 * drops the list's page and selection, which belong to the previous tab.
 */
export function CmsQueryTabs<Value extends string>({
  items,
  param = "tab",
  className,
}: {
  readonly items: ReadonlyArray<CmsQueryTab<Value>>;
  readonly param?: string;
  readonly className?: string;
}) {
  const active = useQueryTab(items, param);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Tabs
      className={cn("w-full", className)}
      onValueChange={(value) => {
        const next = new URLSearchParams();
        if (value !== items[0]?.value) next.set(param, String(value));
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }}
      value={active}
    >
      {/* Nexus's `ui` overrides: `list: pb-1.5`, `trigger: grow shrink-0`,
          `indicator: bottom-1.5` — the tabs share the full width and the
          underline sits on the tab, 6px above the row's hairline.
          `group-data-horizontal/tabs:h-auto` beats the primitive's 36px row,
          which clipped the 38px triggers under `overflow-x-auto` and took the
          active underline with them. */}
      <TabsList
        className="h-auto w-full group-data-horizontal/tabs:h-auto justify-start gap-0 overflow-x-auto rounded-none border-b border-border bg-transparent p-1 pb-1.5"
        variant="line"
      >
        {items.map((item) => (
          <TabsTrigger
            className="h-auto flex-1 shrink-0 gap-1.5 rounded-md border-0 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-none after:rounded-full after:bg-primary group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-px hover:text-foreground data-active:text-primary"
            key={item.value}
            value={item.value}
          >
            {item.label}
            {item.count !== undefined ? (
              <CmsBadge
                className="font-latin"
                color={item.alert && item.count > 0 ? "error" : "neutral"}
              >
                {item.count}
              </CmsBadge>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** The active tab from the query string, falling back to the first. */
export function useQueryTab<Value extends string>(
  items: ReadonlyArray<CmsQueryTab<Value>>,
  param = "tab",
): Value {
  const params = useSearchParams();
  const raw = params.get(param);
  const match = items.find((item) => item.value === raw);
  return (match ?? items[0])?.value as Value;
}
