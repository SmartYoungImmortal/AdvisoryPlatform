import { Button } from "@/components/ui/button";
import { PageKeys, pages } from "@/lib/navigation";
import { RoleKeys } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function BottomBar({
  selected,
  role = "anon",
  className = ""
}: {
  selected: PageKeys | null;
  role: RoleKeys;
  className?: string;
}) {
  const t = useTranslations("navigation");
  const rolePages = Object.entries(pages[role]);
  const pagesButton = rolePages.map(([key, value]) => (
    <Button
      variant="ghost"
      key={key}
      className={cn(
        "flex flex-col gap-y-1 h-full rounded-none",
        selected === key ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <value.icon className="size-5" />
      <span>{t(key as PageKeys)}</span>
    </Button>
  ));
  return (
    <nav
      className={cn("w-full grid grid-cols-[repeat(${rolePages.length}, minmax(0, 1fr))] h-14 items-center bg-background border-t", className)}
      style={{
        gridTemplateColumns: `repeat(${rolePages.length}, minmax(0, 1fr))`,
      }}
    >
      {pagesButton}
    </nav>
  );
}
