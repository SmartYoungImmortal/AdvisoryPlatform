"use client";

import { ScreenSpacer } from "@/components/mobile/screen";
import { transformCardFormToOmiseDto } from "@/components/payment/omise";
import { FootNote } from "@/components/screening/parts";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCreateCardToken } from "@/lib/payment";
import { useForm } from "@tanstack/react-form-nextjs";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import z from "zod";

export const formSchema = z.object({
  cardNumber: z.creditCard().nonempty().nonoptional(),
  expiryDate: z
    .string()
    .regex(/^(?:0[1-9]|1[0-2])(?: \/ )?(?:[0-9]{2})$/m)
    .nonoptional(),
  securityCode: z
    .string()
    .regex(/^\d{3,4}$/)
    .nonoptional(),
  cardHolderName: z.string().nonempty().nonoptional(),
});

export function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function formatExpiryDate(value: string) {
  // Remove non-numeric characters
  const numericValue = value.replace(/\D/g, "");

  // Limit to four numeric characters
  const formattedValue = numericValue.slice(0, 4);

  // Add the '/' separator after the first two characters
  if (formattedValue.length > 2) {
    return formattedValue.slice(0, 2) + " / " + formattedValue.slice(2);
  } else {
    return formattedValue;
  }
}

export function CardForm() {
  // const today = new Date();
  const { mutateAsync: createToken } = useCreateCardToken();

  const t = useTranslations("payment");
  const tc = useTranslations("payment.methodForm.card");

  const form = useForm({
    defaultValues: {
      cardNumber: "4242 4242 4242 4242",
      expiryDate: "12 / 34",
      securityCode: "123",
      cardHolderName: "pee pee",
    },
    validators: {
      onBlur: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      console.log(value);
      const omiseCard = transformCardFormToOmiseDto(value)
      console.log(omiseCard);
      const res = await createToken(omiseCard, {
        onSuccess: (result) => {
          console.log(result);
        },
        onError: (err) => {
          console.error(err);
        },
      });
    },
  });

  return (
    <div className="h-full w-full">
      <form
        className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-4 h-full"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit()
        }}
      >
        <FieldSet className="w-full">
          <FieldGroup>
            <form.Field name="cardNumber">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      {tc(`${field.name}.label`)}
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={formatCardNumber(field.state.value ?? "")}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        console.log(
                          formatCardNumber(e.target.value),
                          e.target.value,
                        );
                        e.target.value = formatCardNumber(e.target.value);
                        field.handleChange(e.target.value);
                      }}
                      aria-invalid={isInvalid}
                      placeholder={tc(`${field.name}.placeholder`)}
                      autoComplete="off"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="expiryDate">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        {tc(`${field.name}.label`)}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={formatExpiryDate(field.state.value ?? "")}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          e.target.value = formatExpiryDate(e.target.value);
                          field.handleChange(e.target.value);
                        }}
                        aria-invalid={isInvalid}
                        placeholder={tc(`${field.name}.placeholder`)}
                        autoComplete="off"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="securityCode">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        {tc(`${field.name}.label`)}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder={tc(`${field.name}.placeholder`)}
                        autoComplete="off"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </div>
            <form.Field name="cardHolderName">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      {tc(`${field.name}.label`)}
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value ?? ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder={tc(`${field.name}.placeholder`)}
                      autoComplete="off"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
          <FootNote icon={Lock} className="px-0 pt-0">
            {t("methodForm.card.secureNote")}
          </FootNote>
        </FieldSet>

        <ScreenSpacer />

        <form.Subscribe
          selector={(formState) => [
            formState.canSubmit,
            formState.isSubmitting,
          ]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} className="w-full">
              {isSubmitting ? tc("payButtonProcessing") : tc("payButtonReady")}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
