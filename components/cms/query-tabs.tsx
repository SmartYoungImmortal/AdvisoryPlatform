"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type CmsQueryTab<Value extends string> = {
  readonly value: Value;
  readonly label: string;
};

/**
 * Nexus's `CmsQueryTabs`: Nuxt UI link tabs that share the row equally
 * (`trigger: grow`), a hairline under the row and the active label's underline
 * in the primary. The active tab lives in `?tab=`, so a queue view is linkable
 * and survives a reload; switching drops the previous tab's page and selection.
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
      <TabsList
        className="-mb-px h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-border bg-transparent p-1 pb-1.5"
        variant="line"
      >
        {items.map((item) => (
          <TabsTrigger
            className="h-auto shrink-0 grow justify-center gap-1.5 rounded-md border-0 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-none after:rounded-full after:bg-primary group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-px hover:text-foreground data-active:text-primary"
            key={item.value}
            value={item.value}
          >
            {item.label}
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
