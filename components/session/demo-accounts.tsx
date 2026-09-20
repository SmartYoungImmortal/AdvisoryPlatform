"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { demoAccounts, type DemoAccount } from "@/lib/session/demo";
import { cn } from "@/lib/utils";

/**
 * The seeded logins, one tap from the form. Not a Figma element — the prototype
 * has no other way to tell a tester what to type. `only` narrows the list for a
 * door that admits one role (the admin console).
 *
 * These are rows in the shared database now, so a tap fills the form and submits
 * it: the sign-in that follows is a real one against the API. The reset control
 * that used to sit at the bottom of this box went with the mock database — it
 * emptied a store in this browser, and there is no such thing to empty any more.
 *
 * Several rows share a role, so the email is the identity here and `key` is only
 * what the role label and the `only` filter read.
 */
export function DemoAccounts({
  onPick,
  only,
  className,
}: {
  readonly onPick: (account: DemoAccount) => void;
  readonly only?: ReadonlyArray<DemoAccount["key"]>;
  readonly className?: string;
}) {
  const t = useTranslations("session");
  const list = only ? demoAccounts.filter((a) => only.includes(a.key)) : demoAccounts;

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-card border border-dashed border-border bg-card p-3",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">{t("demoTitle")}</p>
      <p className="text-xs text-muted-foreground">{t("demoHint")}</p>
      <div className="flex flex-col gap-1">
        {list.map((account) => (
          <Button
            className="h-auto justify-between gap-3 px-2 py-1.5 text-left"
            key={account.email}
            onClick={() => onPick(account)}
            type="button"
            variant="ghost"
          >
            <span className="text-sm font-medium">{t(`role.${account.key}`)}</span>
            <span className="flex min-w-0 flex-col items-end font-latin text-xs font-normal text-muted-foreground">
              <span className="max-w-full truncate">{account.email}</span>
              <span>{account.password}</span>
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
