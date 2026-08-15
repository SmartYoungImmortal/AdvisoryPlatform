import Image from "next/image";
import Link from "next/link";
import { UserRoundCog } from "lucide-react";

import { arayaS as araya } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

type Stat = { readonly value: string; readonly label: string };

/**
 * Figma "Identity Card" — surface, 14px radius, 14px padding, 12px gaps: a 56px
 * avatar row with a 36px edit affordance, a hairline divider, then evenly split stats.
 */
export function IdentityCard({
  name,
  subtitle,
  stats,
  editHref,
  editLabel,
  className,
}: {
  readonly name: string;
  readonly subtitle: string;
  readonly stats: readonly Stat[];
  readonly editHref: string;
  readonly editLabel: string;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5",
        className,
      )}
    >
      <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
        <Image
          alt=""
          className="size-14 shrink-0 rounded-full object-cover"
          height={56}
          src={araya}
          width={56}
        />
        <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
          <p className="w-full text-base font-medium text-foreground">
            {name}
          </p>
          <p className="w-full text-xs font-normal text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <Link
          aria-label={editLabel}
          className="flex size-9 shrink-0 items-center justify-center overflow-clip rounded-md bg-muted"
          href={editHref}
        >
          <UserRoundCog className="size-4.5 text-muted-foreground" />
        </Link>
      </div>
      <div className="h-px w-full shrink-0 bg-muted" />
      <div className="flex w-full shrink-0 items-start overflow-clip text-center">
        {stats.map((stat) => (
          <div
            className="flex min-w-px flex-1 flex-col items-center gap-0.5 overflow-clip"
            key={stat.label}
          >
            <p className="font-latin w-full text-base font-medium text-foreground">
              {stat.value}
            </p>
            <p className="w-full text-xs font-normal text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
