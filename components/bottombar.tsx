import Link from "next/link";
import { PageKeys, pages } from "@/lib/navigation";
import { RoleKeys } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * Figma "Tab Bar" — 402 x 56 on surface with a top border, 8px vertical padding,
 * 22px glyphs and 12/18 labels. The selected tab switches to foreground + medium.
 */
export function BottomBar({
  selected,
  role = "anon",
  className = "",
}: {
  readonly selected: PageKeys | null;
  readonly role: RoleKeys;
  readonly className?: string;
}) {
  const t = useTranslations("navigation");
  const rolePages = Object.entries(pages[role]);
  const pagesButton = rolePages.map(([key, value]) => {
    const isSelected = selected === key;
    const className = cn(
      "flex min-w-px flex-1 flex-col items-center justify-center gap-1 overflow-clip",
      isSelected ? "text-foreground" : "text-muted-foreground",
    );
    const content = (
      <>
        <value.icon className="size-5.5" />
        <span
          className={cn(
            "w-full text-center text-xs",
            isSelected ? "font-medium" : "font-normal",
          )}
        >
          {t(key as PageKeys)}
        </span>
      </>
    );

    return value.href ? (
      <Link
        aria-current={isSelected ? "page" : undefined}
        className={className}
        href={value.href}
        key={key}
      >
        {content}
      </Link>
    ) : (
      <span className={className} key={key}>
        {content}
      </span>
    );
  });

  return (
    <nav
      className={cn(
        "grid h-14 w-full shrink-0 items-center border-t border-border bg-card py-2",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${rolePages.length}, minmax(0, 1fr))`,
      }}
    >
      {pagesButton}
    </nav>
  );
}
