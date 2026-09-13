import { formSchema } from "@/components/payment/card-form";
import { Card } from "@/lib/payment/types";
import z from "zod";

export function transformCardFormToOmiseDto(
  cardForm: z.infer<typeof formSchema>,
): Card {
  return {
    number: cardForm.cardNumber.replaceAll(/ |-/g, ''),
    security_code: cardForm.securityCode,
    name: cardForm.cardHolderName,
    expiration_month: Number(cardForm.expiryDate.slice(0, 2)),
    expiration_year: 2000 + Number(cardForm.expiryDate.slice(-2)),
  };
}
