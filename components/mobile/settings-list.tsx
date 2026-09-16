import Link from "next/link";
import { ChevronRight, Plus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * Figma "Section" — 24px side padding, 20px top padding and an 8px gap between the
 * muted section label and its card.
 */
export function SettingsSection({
  label,
  children,
  className,
}: {
  readonly label?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start gap-2 overflow-clip px-6 pt-5",
        className,
      )}
    >
      {label ? (
        <p className="w-full text-sm font-medium text-muted-foreground">{label}</p>
      ) : null}
      {children}
    </div>
  );
}

/**
 * Figma "Card" — surface, 14px radius, rows stacked flush against each other.
 * `--card-spacing` is the card's own knob for its padding and row gap, so zeroing
 * it is all it takes to get the edge-to-edge list the design draws.
 */
export function SettingsCard({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <Card className={cn("w-full shadow-none ring-0 [--card-spacing:0]", className)}>
      {children}
    </Card>
  );
}

/** Figma "Divider" — 1px of surface-muted between card rows. */
export function SettingsDivider() {
  return <Separator className="bg-muted" />;
}

/**
 * Figma "Add …" row — the last row of an editable card list: a 48px line whose
 * glyph and label both take the accent. Shares SettingsRow's metrics.
 */
export function AddRow({ label }: { readonly label: ReactNode }) {
  return (
    <Item
      className="gap-3 rounded-none p-3.5 text-primary"
      render={<button type="button" />}
    >
      <ItemMedia variant="icon">
        <Plus />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="w-full font-medium">{label}</ItemTitle>
      </ItemContent>
    </Item>
  );
}

/**
 * Figma settings row — 48px tall: 14px padding, 12px gaps, 16px leading glyph,
 * 14/20 medium label, optional trailing value and 16px chevron.
 *
 * `Item` brings the focus ring and hover state the hand-rolled row never had;
 * only the Figma metrics are restated here.
 */
export function SettingsRow({
  icon: Icon,
  iconClassName,
  label,
  labelClassName,
  value,
  href,
  showChevron = true,
}: {
  readonly icon: LucideIcon;
  readonly iconClassName?: string;
  readonly label: ReactNode;
  readonly labelClassName?: string;
  readonly value?: ReactNode;
  readonly href?: string;
  readonly showChevron?: boolean;
}) {
  return (
    <Item
      className="gap-3 rounded-none p-3.5"
      render={href ? <Link href={href} /> : <button type="button" />}
    >
      <ItemMedia className={cn("text-muted-foreground", iconClassName)} variant="icon">
        <Icon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className={cn("w-full", labelClassName)}>{label}</ItemTitle>
      </ItemContent>
      {value || showChevron ? (
        <ItemActions className="gap-3">
          {value ? (
            <span className="font-latin text-sm font-normal text-muted-foreground">
              {value}
            </span>
          ) : null}
          {showChevron ? <ChevronRight className="size-4 text-muted-foreground" /> : null}
        </ItemActions>
      ) : null}
    </Item>
  );
}
