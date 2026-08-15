import { cn } from "@/lib/utils";

/** iOS home indicator from the Figma frames (402 x 34, 134 x 5 pill at 90% opacity). */
export function HomeIndicator({ className }: { readonly className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-8.5 w-full shrink-0 items-center justify-center overflow-clip py-2",
        className,
      )}
    >
      <div className="h-[5px] w-[134px] shrink-0 rounded-full bg-foreground opacity-90" />
    </div>
  );
}
