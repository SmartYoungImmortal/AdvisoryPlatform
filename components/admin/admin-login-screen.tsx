import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { BrandLockup } from "@/components/auth/brand-lockup";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * The gate to the Admin Console: a muted full-height canvas with a single Card
 * holding the brand lockup, English chrome heading, email/password fields and a
 * full-width primary Login action. The error state slots a destructive alert
 * between the heading and the form, mirroring the mobile login's banner placement.
 */
export function AdminLoginScreen({
  state = "default",
}: {
  readonly state?: "default" | "error";
}) {
  const t = useTranslations("admin");
  const hasError = state === "error";

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-muted px-6 py-12">
      <Card className="w-sm max-w-full gap-6 p-8 shadow-sm">
        <BrandLockup className="h-auto p-0" />
        <h1 className="text-center font-latin text-xl font-semibold text-foreground">
          {t("login.title")}
        </h1>

        {hasError ? (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>{t("login.errorTitle")}</AlertTitle>
            <AlertDescription>{t("login.errorBody")}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup className="gap-4">
          <Field className="gap-1">
            <FieldLabel className="font-latin" htmlFor="admin-login-email">
              {t("login.emailLabel")}
            </FieldLabel>
            <Input
              autoComplete="email"
              className="font-latin"
              id="admin-login-email"
              type="email"
            />
          </Field>
          <Field className="gap-1">
            <FieldLabel className="font-latin" htmlFor="admin-login-password">
              {t("login.passwordLabel")}
            </FieldLabel>
            <Input
              autoComplete="current-password"
              id="admin-login-password"
              type="password"
            />
          </Field>
        </FieldGroup>

        <Button className="w-full font-latin" render={<Link href="/admin/dashboard" />}
          nativeButton={false}>
          {t("login.signIn")}
        </Button>
      </Card>
    </div>
  );
}
