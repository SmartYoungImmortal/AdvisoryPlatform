import Link from "next/link";
import { Ellipsis, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { AdminTable, type AdminColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminSearchBar } from "@/components/admin/search-toolbar";
import { AdminContent } from "@/components/admin/shell";
import {
  TableCard,
  TableCardFooter,
  TableCardToolbar,
} from "@/components/admin/table-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminServices, type AdminService } from "@/lib/admin/services";

const OWNER_HREF = "/admin/users/john-minecraft";

const cellRenderers: Record<string, (service: AdminService) => ReactNode> = {
  name: (service) => (
    <span className="font-medium text-foreground">{service.name}</span>
  ),
  owner: (service) => (
    <span className="font-latin text-muted-foreground">{service.owner}</span>
  ),
  category: (service) => (
    <Badge variant="secondary">{service.category}</Badge>
  ),
};

function ServiceRowActions({ service }: { readonly service: AdminService }) {
  const t = useTranslations("admin");

  return (
    <>
      <Button
        aria-label={t("services.actionViewOwner")}
        render={<Link href={OWNER_HREF} />}
        nativeButton={false}
        size="icon-sm"
        variant="ghost"
      >
        <UserRound className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`${t("services.menuLabel")} ${service.name}`}
              size="icon-sm"
              variant="ghost"
            >
              <Ellipsis className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={<Link href={OWNER_HREF} />}
            nativeButton={false}
          >
            {t("services.actionViewOwner")}
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href="/admin/services" />}
          nativeButton={false}
            variant="destructive"
          >
            {t("services.actionUnpublish")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/**
 * Marketplace services table (wireframe 1042:15113) recomposed onto the
 * TableCard anatomy: search in the card toolbar, name/owner/category rows
 * (category as a secondary badge), row-count footer. The no-results variant
 * keeps the card + toolbar and swaps the table band for the shared empty
 * copy — the users-screen pattern.
 */
export function ServicesScreen({
  state = "default",
}: {
  readonly state?: "default" | "no-results";
}) {
  const t = useTranslations("admin");
  const isNoResults = state === "no-results";

  const columns: ReadonlyArray<AdminColumn> = [
    { key: "name", label: t("services.colName"), sortable: true },
    { key: "owner", label: t("services.colOwner"), sortable: true },
    { key: "category", label: t("services.colCategory") },
  ];

  return (
    <AdminContent>
      <AdminPageHeader
        description={t("services.description")}
        title={t("services.title")}
      />
      <TableCard>
        <TableCardToolbar>
          <AdminSearchBar placeholder={t("services.searchPlaceholder")} />
        </TableCardToolbar>
        {isNoResults ? (
          <div className="flex w-full flex-col items-center gap-1.5 px-6 py-16 text-center">
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
              renderActions={(service) => (
                <ServiceRowActions service={service} />
              )}
              renderCell={(service, key) => cellRenderers[key]?.(service)}
              rows={adminServices}
            />
            <TableCardFooter>
              <span>
                {t("common.rowCount", { count: adminServices.length })}
              </span>
            </TableCardFooter>
          </>
        )}
      </TableCard>
    </AdminContent>
  );
}
