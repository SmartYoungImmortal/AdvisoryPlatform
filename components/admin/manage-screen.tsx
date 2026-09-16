import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  EditableList,
  EditableListAddRow,
  EditableListItem,
} from "@/components/admin/editable-list";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminContent } from "@/components/admin/shell";
import { TabLinkNav } from "@/components/admin/tab-link-nav";
import { Card } from "@/components/ui/card";
import { serviceCategories, skillsTaxonomy } from "@/lib/admin/categories";

/**
 * "Manage system" — the taxonomy editor. Each tab is a sibling route; the
 * editor itself lives on a Card surface below the tab strip so the list reads
 * as a focused form, not a full-bleed page. Every row is an editable input
 * whose save icon navigates to the tab's saved/refresh route, and the add row
 * appends via the same static-prototype navigation. The saved confirmation
 * bar renders inside the card, above the list it confirms.
 */
const tabConfig = {
  categories: { items: serviceCategories, saveHref: "/admin/manage/saved" },
  skills: { items: skillsTaxonomy, saveHref: "/admin/manage/skills" },
} as const;

export function ManageScreen({
  tab,
  state = "default",
}: {
  readonly tab: "categories" | "skills";
  readonly state?: "default" | "saved";
}) {
  const t = useTranslations("admin");
  const { items, saveHref } = tabConfig[tab];

  return (
    <AdminContent>
      <AdminPageHeader
        description={t("manage.description")}
        title={t("manage.title")}
      />
      <TabLinkNav
        tabs={[
          {
            active: tab === "categories",
            href: "/admin/manage",
            label: t("manage.tabCategories"),
          },
          {
            active: tab === "skills",
            href: "/admin/manage/skills",
            label: t("manage.tabSkills"),
          },
        ]}
      />
      <Card className="w-full max-w-2xl p-6">
        {state === "saved" ? (
          <div className="flex w-full items-center gap-2 rounded-lg bg-success-surface px-4 py-3 text-sm font-medium text-success">
            <CircleCheck aria-hidden className="size-4 shrink-0" />
            {t("manage.savedNote")}
          </div>
        ) : null}
        <EditableList>
          {items.map((item) => (
            <EditableListItem
              defaultValue={item}
              key={item}
              saveHref={saveHref}
              saveLabel={t("manage.saveLabel")}
            />
          ))}
        </EditableList>
        <EditableListAddRow
          addHref={saveHref}
          addLabel={t("manage.addLabel")}
          placeholder={t("manage.addPlaceholder")}
        />
      </Card>
    </AdminContent>
  );
}
