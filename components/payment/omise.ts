import { formSchema } from "@/components/payment/card-form";
import z from "zod";

export const omiseDtoSchema = z.object({
  cardNumber: z.creditCard().nonempty().nonoptional(),
  expiryMonth: z
    .string()
    .regex(/^(?:0[1-9]|1[0-2])$/m)
    .nonoptional(),
  expiryYear: z
    .string()
    .regex(/^(?:[0-9]{2})$/m)
    .nonoptional(),
  securityCode: z
    .string()
    .regex(/^\d{3,4}$/)
    .nonoptional(),
  cardHolderName: z.string().nonempty().nonoptional(),
});

export function transformCardFormToOmiseDto(
  cardForm: z.infer<typeof formSchema>,
): z.infer<typeof omiseDtoSchema> {
  return omiseDtoSchema.parse({
    cardNumber: cardForm.cardNumber.replaceAll(/ |-/g, ''),
    securityCode: cardForm.securityCode,
    cardHolderName: cardForm.cardHolderName,
    expiryMonth: cardForm.expiryDate.slice(0, 2),
    expiryYear: cardForm.expiryDate.slice(-2),
  });
}
