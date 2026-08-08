import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/illustrations/logo.svg";
import { Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Figma "Nav Bar" — 402 x 66: 16px side padding, 4px vertical padding, a 24px menu
 * glyph, the 58px-tall Advisory lockup, and a 22px bell inside a 24px box.
 * The `before` pseudo-element widens the tap target without moving any pixels.
 */
export function TopBar({
  unreadNotifications = false,
  className,
}: {
  readonly unreadNotifications?: boolean;
  readonly className?: string;
}) {
  const trigger =
    "relative flex shrink-0 items-center justify-center before:absolute before:-inset-2 before:content-['']";

  return (
    <div
      className={cn(
        "flex h-[66px] w-full shrink-0 items-center justify-between px-4 py-1",
        className,
      )}
    >
      <button aria-label="เมนู" className={cn(trigger, "size-6")} type="button">
        <Menu className="size-6 text-muted-foreground" />
      </button>
      {/* Sized so the lockup's ink measures 114px wide, matching the Figma nav
          logo; the 66px bar height is pinned so the extra height can't grow it. */}
      <Image
        alt="Advisory Platform"
        className="h-[63px] w-auto"
        priority
        src={logo}
      />
      <Link
        aria-label="การแจ้งเตือน"
        className={cn(trigger, "size-6")}
        href="/notifications"
      >
        <Bell
          className={cn(
            "size-[22px]",
            unreadNotifications ? "text-foreground" : "text-muted-foreground",
          )}
        />
        {unreadNotifications ? (
          <span className="absolute top-px left-[15px] size-2 rounded-full bg-primary" />
        ) : null}
      </Link>
    </div>
  );
}
