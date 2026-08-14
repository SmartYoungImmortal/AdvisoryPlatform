"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const formSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export function AdminLoginForm() {
  const t = useTranslations("admin.auth");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    // toast("You submitted the following values:", {
    //   description: (
    //     <pre className="mt-2 w-[320px] overflow-x-auto rounded-md bg-code p-4 text-code-foreground">
    //       <code>{JSON.stringify(data, null, 2)}</code>
    //     </pre>
    //   ),
    //   position: "bottom-right",
    //   classNames: {
    //     content: "flex flex-col gap-2",
    //   },
    //   style: {
    //     "--border-radius": "calc(var(--radius)  + 4px)",
    //   } as React.CSSProperties,
    // });

    toast.add({
      title: "You submitted the following values:",
      description: (
          <code>{JSON.stringify(data, null, 2)}</code>
      ),
    })

    console.log(data);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} id="form-adminlogin">
      <FieldGroup className="gap-4">
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="form-adminlogin-email">
                {t("formLabelEmail")}
              </FieldLabel>
              <Input
                {...field}
                id="form-adminlogin-email"
                aria-invalid={fieldState.invalid}
                placeholder="admin@example.com"
                type="email"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="form-adminlogin-email">
                {t("formLabelPassword")}
              </FieldLabel>
              <Input
                {...field}
                id="form-adminlogin-email"
                aria-invalid={fieldState.invalid}
                placeholder="********"
                type="password"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Button type="submit" className="mt-6 w-full" form="form-adminlogin">
        {t("formSubmit")}
      </Button>
    </form>
  );
}
