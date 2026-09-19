"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { resetDatabase } from "@/lib/mock-db/store";
import { signOut } from "@/lib/session";
import { demoAccounts, type DemoAccount } from "@/lib/session/demo";
import { cn } from "@/lib/utils";

/**
 * The seeded logins, one tap from the form. Not a Figma element — the prototype
 * has no other way to tell a tester what to type. `only` narrows the list for a
 * door that admits one role (the admin console).
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
            key={account.key}
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
      <Button
        className="h-auto self-start px-2 py-1 text-xs text-muted-foreground"
        onClick={() => {
          signOut();
          resetDatabase();
        }}
        type="button"
        variant="link"
      >
        {t("reset")}
      </Button>
    </div>
  );
}
