import Link from "next/link";
import { Ban, Eye, Pencil, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminTable, type AdminColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminSearchBar } from "@/components/admin/search-toolbar";
import { AdminContent } from "@/components/admin/shell";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  TableCard,
  TableCardFooter,
  TableCardToolbar,
} from "@/components/admin/table-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { adminUsers, type AdminUser } from "@/lib/admin/users";

/** "John Minecraft" → "JM"; single-word names keep one letter. */
function initials(displayName: string): string {
  return displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function NameCell({ user }: { readonly user: AdminUser }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback className="font-latin text-xs font-medium">
          {initials(user.displayName)}
        </AvatarFallback>
      </Avatar>
      <span className="font-latin text-sm font-medium text-foreground">
        {user.displayName}
      </span>
    </div>
  );
}

function renderUserCell(user: AdminUser, key: string) {
  if (key === "name") {
    return <NameCell user={user} />;
  }
  if (key === "status") {
    return <StatusBadge status={user.status} />;
  }
  return null;
}

function UserRowActions({ user }: { readonly user: AdminUser }) {
  const t = useTranslations("admin");

  return (
    <>
      <Button
        aria-label={t("users.actionView")}
        render={<Link href={`/admin/users/${user.id}`} />}
          nativeButton={false}
        size="icon-sm"
        variant="ghost"
      >
        <Eye />
      </Button>
      <Button
        aria-label={t("users.actionSuspend")}
        render={<Link href={`/admin/users/${user.id}/suspend`} />}
          nativeButton={false}
        size="icon-sm"
        variant="ghost"
      >
        <Ban />
      </Button>
      <Button
        aria-label={t("users.actionEdit")}
        render={<Link href={`/admin/users/${user.id}`} />}
          nativeButton={false}
        size="icon-sm"
        variant="ghost"
      >
        <Pencil />
      </Button>
    </>
  );
}

/**
 * Figma "Users" (1042:15078): searchable user table — avatar-initials name
 * column, account-status badge column, per-row view/suspend/edit actions —
 * composed as a TableCard (toolbar search band, table body, row-count footer).
 * `no-results` keeps the toolbar band and swaps table+footer for a centered
 * empty block inside the card (sibling route pattern — see AdminSearchBar).
 */
export function UsersScreen({
  state = "default",
}: {
  readonly state?: "default" | "no-results";
}) {
  const t = useTranslations("admin");

  const columns: ReadonlyArray<AdminColumn> = [
    { key: "name", label: t("users.colName"), sortable: true },
    { key: "status", label: t("users.colStatus"), sortable: true },
  ];

  return (
    <AdminContent>
      <AdminPageHeader
        description={t("users.description")}
        title={<span className="font-latin">{t("users.title")}</span>}
      />
      <TableCard>
        <TableCardToolbar>
          <div className="flex-1 sm:max-w-sm">
            <AdminSearchBar placeholder={t("users.searchPlaceholder")} />
          </div>
        </TableCardToolbar>
        {state === "no-results" ? (
          <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-16 text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <SearchX className="size-6" />
            </div>
            <p className="text-base font-medium text-foreground">
              {t("common.noResultsTitle")}
            </p>
            <p className="text-sm font-normal text-muted-foreground">
              {t("common.noResultsBody")}
            </p>
          </div>
        ) : (
          <>
            <AdminTable
              columns={columns}
              renderActions={(user) => <UserRowActions user={user} />}
              renderCell={renderUserCell}
              rows={adminUsers}
            />
            <TableCardFooter>
              <span>{t("common.rowCount", { count: adminUsers.length })}</span>
            </TableCardFooter>
          </>
        )}
      </TableCard>
    </AdminContent>
  );
}
