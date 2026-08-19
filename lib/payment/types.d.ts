export interface Card {
  name: string;
  number: string;
  expiration_month: number;
  expiration_year: number;
  security_code?: string;
  city?: string;
  postal_code?: string;
  street1?: string;
  street2?: string;
  state?: string;
  country?: string;
  phone_number?: string;
  email?: string;
}
