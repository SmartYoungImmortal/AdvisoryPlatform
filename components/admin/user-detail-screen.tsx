import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { adminUsers, type AdminUser } from "@/lib/admin/users";
import { AdminContent } from "@/components/admin/shell";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminConfirmDialog } from "@/components/admin/confirm-dialog";
import { CaseSection } from "@/components/admin/case-layout";
import { DataField, DataFieldGroup } from "@/components/admin/data-field";
import { StatusBadge } from "@/components/admin/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * User detail + suspend/reinstate. No dedicated wireframe — implied by the
 * Users list (Figma 1042:15081) whose "ระงับบัญชี" action and the reports
 * desk's suspend outcome need a landing. Built to the shadcn-admin detail-page
 * idiom: header with back + destructive action, read-only account fields,
 * route-driven confirm dialog (`/suspend`), suspended banner state.
 */
export function UserDetailScreen({
  userId,
  state = "default",
}: {
  readonly userId: string;
  readonly state?: "default" | "suspend" | "suspended";
}) {
  const t = useTranslations("admin");
  const format = useFormatter();
  const user = adminUsers.find((candidate) => candidate.id === userId);
  if (!user) return null;

  const roleLabels: Record<AdminUser["role"], string> = {
    user: t("userDetail.roleUser"),
    advisor: t("userDetail.roleAdvisor"),
  };
  const durationItems = [
    { value: "7", label: t("userDetail.duration7") },
    { value: "30", label: t("userDetail.duration30") },
    { value: "forever", label: t("userDetail.durationForever") },
  ];

  // The /suspended route force-displays the suspended presentation even for
  // fixtures whose status is ACTIVE (the outcome of the confirm dialog).
  const isSuspended = state === "suspended" || user.status === "SUSPENDED";
  const status = isSuspended ? "SUSPENDED" : "ACTIVE";
  const joinedAt = format.dateTime(new Date(user.joinedAt), "short");

  const headerAction = isSuspended ? (
    <Button render={<Link href={`/admin/users/${user.id}`} />}
          nativeButton={false} variant="outline">
      {t("userDetail.reinstate")}
    </Button>
  ) : (
    <Button
      render={<Link href={`/admin/users/${user.id}/suspend`} />}
          nativeButton={false}
      variant="destructive"
    >
      {t("userDetail.suspend")}
    </Button>
  );

  return (
    <AdminContent>
      <AdminPageHeader
        actions={headerAction}
        backHref="/admin/users"
        description={t("userDetail.title")}
        title={<span className="font-latin">{user.displayName}</span>}
      />

      {isSuspended ? (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>{t("userDetail.suspendedBanner")}</AlertTitle>
          {user.suspension ? (
            <AlertDescription>{user.suspension.reason}</AlertDescription>
          ) : null}
        </Alert>
      ) : null}

      <CaseSection title={t("userDetail.sectionAccount")}>
        <Card className="w-full max-w-2xl p-6">
          <DataFieldGroup>
            <DataField label={t("userDetail.fullName")} value={user.fullName} />
            <DataField
              label={t("userDetail.email")}
              value={<span className="font-latin">{user.email}</span>}
            />
            <DataField
              label={t("userDetail.role")}
              value={roleLabels[user.role]}
            />
            <DataField label={t("userDetail.joinedAt")} value={joinedAt} />
            <DataField
              label={t("users.colStatus")}
              value={<StatusBadge status={status} />}
            />
          </DataFieldGroup>
        </Card>
      </CaseSection>

      {state === "suspend" ? (
        <AdminConfirmDialog
          destructive
          body={t("userDetail.suspendDialogBody")}
          cancelHref={`/admin/users/${user.id}`}
          cancelLabel={t("common.cancel")}
          confirmHref={`/admin/users/${user.id}/suspended`}
          confirmLabel={t("userDetail.suspend")}
          title={t("userDetail.suspendDialogTitle")}
        >
          <Field>
            <FieldLabel htmlFor="suspend-reason">
              {t("common.reasonLabel")}
            </FieldLabel>
            <Textarea
              id="suspend-reason"
              placeholder={t("common.reasonPlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="suspend-duration">
              {t("userDetail.durationLabel")}
            </FieldLabel>
            <Select defaultValue="7" items={durationItems}>
              <SelectTrigger className="w-full" id="suspend-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </AdminConfirmDialog>
      ) : null}
    </AdminContent>
  );
}
