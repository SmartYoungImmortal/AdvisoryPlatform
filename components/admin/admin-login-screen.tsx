"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { BrandLockup } from "@/components/auth/brand-lockup";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * The gate to the Admin Console: a muted full-height canvas with a single Card
 * holding the brand lockup, English chrome heading, email/password fields and a
 * full-width primary Login action. The error state slots a destructive alert
 * between the heading and the form, mirroring the mobile login's banner placement.
 *
 * `state="error"` is the server-rendered rejection at `/admin/login/error` — the
 * credentials came back wrong. The per-field messages below are the client-side
 * check that runs before a request is worth making at all; the two stack rather
 * than replace each other.
 */
export function AdminLoginScreen({
  state = "default",
}: {
  readonly state?: "default" | "error";
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const hasError = state === "error";

  // The messages come out of the catalogue, so the schema is built inside the
  // component where `t` exists rather than at module scope.
  const schema = useMemo(
    () =>
      z.object({
        email: z.email({ error: t("login.emailInvalid") }),
        password: z.string().min(1, { error: t("login.passwordRequired") }),
      }),
    [t],
  );

  const { control, handleSubmit } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(() => {
    // No session to establish in this static prototype, so a form that passes
    // validation goes straight to the console the Login link used to point at.
    router.push("/admin/dashboard");
  });

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

        {/* `noValidate` hands the whole check to the schema — otherwise the
            browser's own bubble fires first and the field messages never show. */}
        <form className="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
          <FieldGroup className="gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel className="font-latin" htmlFor="admin-login-email">
                    {t("login.emailLabel")}
                  </FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoComplete="email"
                    className="font-latin"
                    id="admin-login-email"
                    type="email"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel
                    className="font-latin"
                    htmlFor="admin-login-password"
                  >
                    {t("login.passwordLabel")}
                  </FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoComplete="current-password"
                    id="admin-login-password"
                    type="password"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>

          <Button className="w-full font-latin" type="submit">
            {t("login.signIn")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
