import Link from "next/link";
import { PageKeys, pages } from "@/lib/navigation";
import { RoleKeys } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * `TopBar`'s frosted wash, mirrored — the same two gradients off the same token:
 * an even base layer across the width, and a fade over it that is dense at the
 * edge the bar sits on and gone by 60%. The fade runs `to top` here only because
 * this bar is anchored to the bottom instead of the top.
 */
const FROSTED = (() => {
  const white = (pct: number) =>
    `color-mix(in srgb, var(--on-media) ${pct}%, transparent)`;
  return [
    `linear-gradient(to right, ${white(45)} 0%, ${white(45)} 100%)`,
    `linear-gradient(to top, ${white(85)} 0%, ${white(6)} 60%, transparent 100%)`,
  ].join(", ");
})();

/**
 * Figma "Tab Bar" — 402 x 56 on surface with a top border, 8px vertical padding,
 * 22px glyphs and 12/18 labels. The selected tab switches to foreground + medium.
 *
 * The nav bar's glass, always on. `TopBar` fades into that surface only once
 * content scrolls under it, because at the top of a screen it has a hero to sit
 * transparently over; this bar is against content the whole time, so there is no
 * second state for it to be in.
 *
 * It overlays the scroll container instead of sitting below it as a flex
 * sibling, which is what gives `backdrop-filter` something to work on; as a
 * sibling there was nothing behind it and any blur was a no-op.
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
      // The active tab carries the accent, not just a darker grey. Figma separates
      // the two states by weight and ink alone, which on a glass bar leaves them
      // near enough to read as the same — a tab bar has to answer "which page am
      // I on" at a glance. The inactive ink is still darker than the
      // `muted-foreground` it replaces (104 against 113 over white), so the row
      // reads heavier than before without either state losing the other.
      isSelected ? "text-primary" : "text-foreground/65",
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
        // Overlays the scroll container rather than sitting below it, so content
        // passes underneath and the blur has something to work on. It also takes
        // back the 16px `MobileScreen` reserved for the home indicator, which
        // used to show as a strip of page background under the bar.
        //
        // 72px tall with symmetric padding, so the glyphs sit on the middle of
        // the bar rather than riding its top edge.
        "absolute inset-x-0 bottom-0 z-20 grid h-18 w-full items-center border-t border-on-media/20 py-2",
        "backdrop-blur-sm",
        className,
      )}
      style={{
        background: FROSTED,
        gridTemplateColumns: `repeat(${rolePages.length}, minmax(0, 1fr))`,
      }}
    >
      {pagesButton}
    </nav>
  );
}
